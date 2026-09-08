import {Badge, Box, Button, Card, Flex, Heading, Progress, Select, Switch, Text, TextField,} from '@radix-ui/themes';
import {ArrowLeft, CircleQuestionMark, Pencil, Save, X,} from 'lucide-react';
import {useToolbar} from '../../context/ToolbarContext';
import {useToast} from '../../context/ToastContext';
import {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {usePageTitle} from '../../context/PageTitleContext';
import {useTheme} from '../../context/ThemeContext';
import {fetchWithAuth} from '../../utils/api';
import {
    ECatalogItemType,
    EResourceType,
    IAzureCredentialValidationResult,
    ICredentialResourceValidationResult,
    IResource
} from '../../models/resource.model';
import {useTranslation} from 'react-i18next';
import {isValidGuid, resourceTypeToIcon, typeToLabel} from '../../utils/utils.ts';
import yaml from 'js-yaml';
import JsonEditorModal from '../../components/modals/JsonEditorModal.tsx';
import ArrayEditorModal from '../../components/modals/ArrayEditorModal.tsx';
import {MSGraphEditor} from './components/editors/MSGraphEditor.tsx';
import {CatalogEditor} from './components/editors/CatalogEditor.tsx';
import {AzureCredentialEditor} from './components/editors/AzureCredentialEditor.tsx';
import {GitHubCredentialEditor} from './components/editors/GitHubCredentialEditor.tsx';
import {BitbucketCredentialEditor} from './components/editors/BitbucketCredentialEditor.tsx';
import {TemplateEditor} from './components/editors/TemplateEditor.tsx';
import {ProcessEditor} from './components/editors/ProcessEditor.tsx';
import {IconSelectorDialog} from './components/modals/IconSelectorDialog.tsx';
import {NamingRuleDialog} from './components/modals/NamingRuleDialog.tsx';
import {SetDefaultsDialog} from './components/modals/SetDefaultsDialog.tsx';
import {OutputsDialog} from './components/modals/OutputsDialog.tsx';
import {HelpDialog} from './components/modals/HelpDialog.tsx';
import {fetchCategories, fetchResource} from "./api.ts";
import {useCanWrite} from '../../components/permissions/WriteGuard';

const resourceTypes = Object.keys(EResourceType)

// Helper to flatten nested object keys for the default values table
const flattenKeys = (obj: Record<string, any>, prefix = ''): string[] => {
    const keys: string[] = [];
    for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            keys.push(...flattenKeys(obj[key], fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
};


// TODO: Switch layout, when type is changed: Azure resource type uses all inputs, MS Graph API type disables Abbreviation

interface ClassEditProps {
    id?: string;
    initialData?: Partial<{
        name: string;
        type: string;
        template: any;
        resourceCategory?: { id: string };
    }>;
    onSave?: () => void;
    onCancel?: () => void;
}

const ClassEditor = ({ id: propId, initialData, onSave, onCancel }: ClassEditProps) => {
    const { id: routeId } = useParams<{ id: string }>();
    const id = propId || routeId;
    const isNew = !id || id === 'new';
    const isModal = !!onCancel;
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { appearance } = useTheme();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const canWrite = useCanWrite('PERM_RESOURCE_WRITE');

    const [name, setName] = useState('');
    const [abbreviation, setAbbreviation] = useState('');
    const [icon, setIcon] = useState('');
    const [type, setResourceType] = useState<string | null>(null);
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [isSystem, setIsSystem] = useState(false);
    const [templateJson, setTemplateJson] = useState('{}');
    // MS Graph specific state
    const [graphMethod, setGraphMethod] = useState('GET');
    const [graphApiVersion, setGraphApiVersion] = useState('v1.0');
    const [graphEndpoint, setGraphEndpoint] = useState('/users');
    const [graphContentType, setGraphContentType] = useState('application/json');
    const [graphQueryParameters, setGraphQueryParameters] = useState('');

    // Azure Credential specific state
    const [credType, setCredType] = useState('USER');
    const [identifier, setIdentifier] = useState('');
    const [secret, setSecret] = useState('');
    const [tenantId, setTenantId] = useState('');
    const [azureTestResult, setAzureTestResult] = useState<IAzureCredentialValidationResult | null>(null);

    // GitHub Credential specific state
    const [ghCredType, setGhCredType] = useState('PAT');
    const [ghUsername, setGhUsername] = useState('');
    const [ghToken, setGhToken] = useState('');

    // Bitbucket Credential specific state
    const [bbCredType, setBbCredType] = useState('APP_PASSWORD');
    const [bbUsername, setBbUsername] = useState('');
    const [bbToken, setBbToken] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    // Catalog specific state
    const [catalogItemType, setCatalogItemType] = useState<ECatalogItemType>(ECatalogItemType.STRING);
    const [catalogEntries, setCatalogEntries] = useState<{ name: string; value: any; resourceClassId?: string }[]>([]);

    // Process specific state
    const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
    const [workflowDefinitionId, setWorkflowDefinitionId] = useState<string | null>(null);
    const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
    const [processInputMappings, setProcessInputMappings] = useState<Record<string, string>>({});
    const [processOutputMappings, setProcessOutputMappings] = useState<Record<string, string>>({});

    const [defaults, setDefaults] = useState<Record<string, any>>({});
    // For Set Defaults dialog we need to show both literal values (read-only) and parameter placeholders (editable)
    type DefaultEntry = {
        id: string;
        displayKey: string;
        paramKey: string | null;
        value: any;
        type: string;
        subType?: string; // for arrays
        readOnly: boolean
    };
    const [defaultEntries, setDefaultEntries] = useState<DefaultEntry[]>([]);
    const [defaultsDialogOpen, setDefaultsDialogOpen] = useState(false);

    // Editor modal states
    const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
    const [arrayEditorOpen, setArrayEditorOpen] = useState(false);
    const [editorTargetId, setEditorTargetId] = useState<string | null>(null);
    const [editorTitle, setEditorTitle] = useState('');
    const [editorValue, setEditorValue] = useState<any>(null);
    const [editorItemType, setEditorItemType] = useState<'string' | 'number' | 'object'>('string');

    const [iconSelectorOpen, setIconSelectorOpen] = useState(false);
    const [iconSearch, setIconSearch] = useState('');
    const [iconCategory, setIconCategory] = useState('azure');
    const [outputs, setOutputs] = useState<Record<string, string>>({});
    const [outputsDialogOpen, setOutputsDialogOpen] = useState(false);
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);
    const editorRef = useRef<any>(null);
    // Naming Rule state
    const [namingStrategyDialogOpen, setNamingStrategyDialogOpen] = useState(false);
    const [namingRuleFormat, setNamingRuleFormat] = useState<string>('');
    const [namingRuleError, setNamingRuleError] = useState<string | null>(null);
    const [minLength, setMinLength] = useState<number>(0);
    const [maxLength, setMaxLength] = useState<number>(255);
    const [forbiddenCharsText, setForbiddenCharsText] = useState<string>('');
    // Monaco refs for Naming Rule editor
    const namingMonacoRef = useRef<any>(null);
    const namingModelRef = useRef<any>(null);
    const namingDebounceRef = useRef<any>(null);

    const allowedVariables = ['abbrv', 'env', 'name', 'region', 'region-abbrv', 'rnd'];

    const validateNamingRule = (rule: string): string | null => {
        if (!rule) return null; // empty means no rule
        // find all {var}
        const regex = /\{([^}]+)\}/g;
        const found: string[] = [];
        let match: RegExpExecArray | null;
        while ((match = regex.exec(rule)) !== null) {
            found.push(match[1]);
        }
        // Check for any stray braces
        const stripped = rule.replace(regex, '');
        if (stripped.includes('{') || stripped.includes('}')) {
            return 'Unbalanced or unmatched curly braces in naming rule.';
        }
        // Validate variables
        for (const v of found) {
            if (!allowedVariables.includes(v)) {
                return `Unknown variable: {${v}}`;
            }
        }
        return null;
    };

    // Monaco language registration and markers for Naming Rule
    const beforeMountNamingRule = (monaco: any) => {
        const langId = 'naming-rule';
        if (!monaco.languages.getLanguages().some((l: any) => l.id === langId)) {
            monaco.languages.register({ id: langId });
            monaco.languages.setMonarchTokensProvider(langId, {
                tokenizer: {
                    root: [
                        [/(\{)(abbrv|env|name|region|region-abbrv|rnd)(\})/, [
                            'delimiter.bracket', 'variable.predefined', 'delimiter.bracket'
                        ]],
                        [/\{[^}]*}/, 'invalid'],
                        [/\{/, 'invalid'],
                        [/}/, 'invalid'],
                        [/[^{}]+/, 'string']
                    ]
                }
            });

            monaco.editor.defineTheme('namingRuleLight', {
                base: 'vs', inherit: true,
                rules: [
                    { token: 'variable.predefined', foreground: '0B7285', fontStyle: 'bold' },
                    { token: 'invalid', foreground: 'D00000' },
                    { token: 'delimiter.bracket', foreground: '555555' },
                    { token: 'string', foreground: '1F2937' }
                ],
                colors: {}
            });
            monaco.editor.defineTheme('namingRuleDark', {
                base: 'vs-dark', inherit: true,
                rules: [
                    { token: 'variable.predefined', foreground: '4DD0E1', fontStyle: 'bold' },
                    { token: 'invalid', foreground: 'FF6B6B' },
                    { token: 'delimiter.bracket', foreground: 'AAAAAA' },
                    { token: 'string', foreground: 'E5E7EB' }
                ],
                colors: {}
            });
        }
        namingMonacoRef.current = monaco;
    };

    const setNamingMarkers = (error: string | null) => {
        const monaco = namingMonacoRef.current;
        const model = namingModelRef.current;
        if (!monaco || !model) return;
        if (!error) {
            monaco.editor.setModelMarkers(model, 'namingRule', []);
            return;
        }
        const text = model.getValue() as string;
        const lines = text.split('\n');
        const lastLineLen = lines[lines.length - 1].length;
        monaco.editor.setModelMarkers(model, 'namingRule', [{
            severity: monaco.MarkerSeverity.Error,
            message: error,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: lines.length,
            endColumn: lastLineLen + 1
        }]);
    };

    const beforeMountTemplate = (monaco: any) => {
        const langId = 'template-json';
        if (!monaco.languages.getLanguages().some((l: any) => l.id === langId)) {
            monaco.languages.register({ id: langId });

            // Base JSON configuration
            monaco.languages.setLanguageConfiguration(langId, {
                wordPattern: /(-?\d*\.\d\w*)|([^\[\{\]\}\(\)\:\,\s\"\'\n\t]+)/g,
                comments: {
                    lineComment: '//',
                    blockComment: ['/*', '*/'],
                },
                brackets: [
                    ['{', '}'],
                    ['[', ']'],
                    ['(', ')'],
                ],
                autoClosingPairs: [
                    { open: '{', close: '}' },
                    { open: '[', close: ']' },
                    { open: '(', close: ')' },
                    { open: '"', close: '"' },
                    { open: "'", close: "'" },
                ],
                surroundingPairs: [
                    { open: '{', close: '}' },
                    { open: '[', close: ']' },
                    { open: '(', close: ')' },
                    { open: '"', close: '"' },
                    { open: "'", close: "'" },
                ],
            });

            monaco.languages.setMonarchTokensProvider(langId, {
                defaultToken: '',
                tokenizer: {
                    root: [
                        // Standard JSON Structure
                        [/[{}[\]]/, 'delimiter.bracket'],
                        [/[ \t\r\n]+/, 'white'],
                        [/[a-zA-Z_$][\w$]*/, {
                            cases: {
                                '@keywords': 'keyword',
                                '@default': 'identifier'
                            }
                        }],
                        // Strings start
                        [/\"/, 'string', '@string'],
                        // Numbers
                        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
                        [/\d+/, 'number'],
                        // Comments
                        [/\/\/.*$/, 'comment'],
                        [/\/[*].*[*]\//, 'comment'],
                    ],
                    string_backtrack: [
                        [/\"/, {
                            token: 'string.key',
                            next: '@string_after'
                        }],
                        [/\\./, 'string.escape'],
                        // Variables nested in strings: {{ name:type:subtype }} or {{ name:catalog:catalogName }}
                        [/(\{\{)(\s*)([\w.-]+)([:]?)([\w.-]*)([!]?)([:]?)([\w.-]*)([:]?)([\w.-]*)(\s*)(\}\})/, [
                            'delimiter.bracket', '', 'variable.name', 'keyword.operator', 'type.identifier', 'keyword.operator', 'keyword.operator', 'type.identifier', 'keyword.operator', 'type.identifier', '', 'delimiter.bracket'
                        ]],
                        [/./, 'string.key'],
                    ],
                    string_after: [
                        [/[ \t\r\n]*:/, 'keyword.operator', '@pop'],
                        ['', '', '@pop']
                    ],
                    string: [
                        // Variables nested in strings: {{ name:type:subtype }} or {{ name:catalog:catalogName }}
                        // Updated regex to support one more optional segment for Catalog type
                        [/(\{\{)(\s*)([\w.-]+)([:]?)([\w.-]*)([!]?)([:]?)([\w.-]*)([:]?)([\w.-]*)(\s*)(\}\})/, [
                            'delimiter.bracket', '', 'variable.name', 'keyword.operator', 'type.identifier', 'keyword.operator', 'keyword.operator', 'type.identifier', 'keyword.operator', 'type.identifier', '', 'delimiter.bracket'
                        ]],
                        [/\"/, 'string', '@pop'],
                        [/\\./, 'string.escape'],
                        [/./, 'string'],
                    ]
                },
                keywords: ['true', 'false', 'null']
            });

            const templateThemeRules = [
                { token: 'variable.name', foreground: '005cc5', fontStyle: 'bold' }, // Blue
                { token: 'type.identifier', foreground: '6f42c1' }, // Purple
                { token: 'delimiter.bracket', foreground: 'd73a49' }, // Red/Orange
                { token: 'keyword.operator', foreground: 'd73a49' },
                { token: 'string', foreground: '22863a' }, // Green
                { token: 'string.key', foreground: '005cc5' }, // Blue (property name)
                { token: 'number', foreground: '005cc5' },
                { token: 'keyword', foreground: 'd73a49' },
                { token: 'comment', foreground: '6a737d' }
            ];

            const templateThemeRulesDark = [
                { token: 'variable.name', foreground: '79c0ff', fontStyle: 'bold' },
                { token: 'type.identifier', foreground: 'd2a8ff' },
                { token: 'delimiter.bracket', foreground: 'ff7b72' },
                { token: 'keyword.operator', foreground: 'ff7b72' },
                { token: 'string', foreground: '7ee787' },
                { token: 'string.key', foreground: '79c0ff' },
                { token: 'number', foreground: '79c0ff' },
                { token: 'keyword', foreground: 'ff7b72' },
                { token: 'comment', foreground: '8b949e' }
            ];

            monaco.editor.defineTheme('templateThemeLight', {
                base: 'vs',
                inherit: true,
                rules: templateThemeRules,
                colors: {}
            });
            monaco.editor.defineTheme('templateThemeDark', {
                base: 'vs-dark',
                inherit: true,
                rules: templateThemeRulesDark,
                colors: {}
            });

            // Kubernetes/YAML support
            const k8sLangId = 'template-k8s';
            if (!monaco.languages.getLanguages().some((l: any) => l.id === k8sLangId)) {
                monaco.languages.register({ id: k8sLangId });
                monaco.languages.setLanguageConfiguration(k8sLangId, {
                    comments: {
                        lineComment: '#',
                    },
                    brackets: [
                        ['{', '}'],
                        ['[', ']'],
                        ['(', ')'],
                    ],
                    autoClosingPairs: [
                        { open: '{', close: '}' },
                        { open: '[', close: ']' },
                        { open: '(', close: ')' },
                        { open: '"', close: '"' },
                        { open: "'", close: "'" },
                    ],
                    surroundingPairs: [
                        { open: '{', close: '}' },
                        { open: '[', close: ']' },
                        { open: '(', close: ')' },
                        { open: '"', close: '"' },
                        { open: "'", close: "'" },
                    ],
                });

                monaco.languages.setMonarchTokensProvider(k8sLangId, {
                    defaultToken: '',
                    tokenPostfix: '.yaml',
                    tokenizer: {
                        root: [
                            // Variables nested in YAML: {{ name:type:subtype }}
                            [/(\{\{)(\s*)([\w.-]+)([:]?)([\w.-]*)([!]?)([:]?)([\w.-]*)([:]?)([\w.-]*)(\s*)(\}\})/, [
                                'delimiter.bracket', '', 'variable.name', 'keyword.operator', 'type.identifier', 'keyword.operator', 'keyword.operator', 'type.identifier', 'keyword.operator', 'type.identifier', '', 'delimiter.bracket'
                            ]],
                            // Keys
                            [/[a-zA-Z_$][\w$]*[ \t]*:/, 'string.key'],
                            // Strings
                            [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
                            [/"/, 'string', '@string."'],
                            [/'/, 'string', "@string.'"],
                            // Comments
                            [/#.*$/, 'comment'],
                            // Numbers
                            [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
                            [/\d+/, 'number'],
                            // Delimiters
                            [/[{}()\[\]]/, '@brackets'],
                            [/[;,.]/, 'delimiter'],
                        ],
                        string: [
                            [/(\{\{)(\s*)([\w.-]+)([:]?)([\w.-]*)([!]?)([:]?)([\w.-]*)([:]?)([\w.-]*)(\s*)(\}\})/, [
                                'delimiter.bracket', '', 'variable.name', 'keyword.operator', 'type.identifier', 'keyword.operator', 'keyword.operator', 'type.identifier', 'keyword.operator', 'type.identifier', '', 'delimiter.bracket'
                            ]],
                            [/[^\\\{\"\']+/, 'string'],
                            [/\\./, 'string.escape'],
                            [/["']/, {
                                cases: {
                                    '$#==$S2': { token: 'string', next: '@pop' },
                                    '@default': 'string'
                                }
                            }],
                            [/./, 'string']
                        ],
                    }
                });

                // Completion provider for Kubernetes YAML
                monaco.languages.registerCompletionItemProvider(k8sLangId, {
                    provideCompletionItems: (model: any, position: any) => {
                        const word = model.getWordUntilPosition(position);
                        const range = {
                            startLineNumber: position.lineNumber,
                            endLineNumber: position.lineNumber,
                            startColumn: word.startColumn,
                            endColumn: word.endColumn,
                        };

                        const suggestions = [
                            {
                                label: '{{ variable }}',
                                kind: monaco.languages.CompletionItemKind.Snippet,
                                insertText: '{{ ${1:name}:${2:string} }}',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range,
                                detail: 'Strato variable'
                            },
                            {
                                label: '{{ variable:catalog }}',
                                kind: monaco.languages.CompletionItemKind.Snippet,
                                insertText: '{{ ${1:name}:catalog:${2:catalogName} }}',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range,
                                detail: 'Strato catalog variable'
                            },
                            {
                                label: 'apiVersion',
                                kind: monaco.languages.CompletionItemKind.Keyword,
                                insertText: 'apiVersion: ${1:v1}',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range,
                                detail: 'The API version of the Kubernetes resource'
                            },
                            {
                                label: 'kind',
                                kind: monaco.languages.CompletionItemKind.Keyword,
                                insertText: 'kind: ${1:Pod}',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range,
                                detail: 'The kind of the Kubernetes resource'
                            },
                            {
                                label: 'metadata',
                                kind: monaco.languages.CompletionItemKind.Keyword,
                                insertText: 'metadata:\n  name: ${1:{{ name:string }}}\n  namespace: ${2:default}',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range,
                                detail: 'Resource metadata'
                            },
                            {
                                label: 'spec',
                                kind: monaco.languages.CompletionItemKind.Keyword,
                                insertText: 'spec:\n  ${1}',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range,
                                detail: 'Resource specification'
                            },
                            {
                                label: 'containers',
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: 'containers:\n- name: ${1:main}\n  image: ${2:nginx}',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range
                            },
                            {
                                label: 'image',
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: 'image: ${1}',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range
                            },
                            {
                                label: 'ports',
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: 'ports:\n- containerPort: ${1:80}',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range
                            },
                            {
                                label: 'env',
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: 'env:\n- name: ${1:VAR_NAME}\n  value: ${2:value}',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range
                            },
                            {
                                label: 'labels',
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: 'labels:\n  ${1:key}: ${2:value}',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range
                            },
                            {
                                label: 'selector',
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: 'selector:\n  matchLabels:\n    ${1:app}: ${2:myapp}',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range
                            },
                            {
                                label: 'replicas',
                                kind: monaco.languages.CompletionItemKind.Field,
                                insertText: 'replicas: ${1:1}',
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: range
                            }
                        ];

                        return { suggestions: suggestions };
                    }
                });
            }
        }
    };

    const { data: resource, isLoading: resourceLoading } = useQuery({
        queryKey: ['resource', id],
        queryFn: () => fetchResource(id!),
        enabled: !isNew,
        refetchOnWindowFocus: false,
    });

    const { data: categories } = useQuery({
        queryKey: ['resource-categories'],
        queryFn: fetchCategories,
    });

    const { data: allResources } = useQuery({
        queryKey: ['resources'],
        queryFn: async () => {
            const resp = await fetchWithAuth('/resources');
            return resp.json() as Promise<IResource[]>;
        },
    });

    useEffect(() => {
        if (initialData && isNew) {
            if (initialData.name) setName(initialData.name);
            if (initialData.type) setResourceType(initialData.type);
            if (initialData.template) setTemplateJson(JSON.stringify(initialData.template, null, 2));
            if (initialData.resourceCategory?.id) setCategoryId(initialData.resourceCategory.id);
        }
    }, [initialData, isNew]);

    useEffect(() => {
        if (resource) {
            setAzureTestResult(null);
            setName(resource.name || '');
            const initialIcon = resource.icon || '';
            setIcon(initialIcon);
            if (initialIcon.includes('/')) {
                setIconCategory(initialIcon.split('/')[0]);
            } else if (initialIcon) {
                setIconCategory('azure');
            }
            setAbbreviation(resource.abbreviation || '');
            // Ensure the Resource Type dropdown reflects the stored value when editing
            setResourceType(resource.type || null);
            setCategoryId(resource.resourceCategory?.id || null);
            setIsSystem(resource.isSystem || false);

            if (resource.type === EResourceType.MSGRAPH) {
                const templ = resource.template || {};
                setGraphMethod(templ.method || 'GET');
                setGraphContentType(templ.contentType || 'application/json');

                // Parse URL
                const url = templ.url || '';
                const match = url.match(/^https:\/\/graph\.microsoft\.com\/([^/]+)(\/.*)?$/);
                if (match) {
                    setGraphApiVersion(match[1]);
                    const rest = match[2] || '';
                    const qIdx = rest.indexOf('?');
                    if (qIdx !== -1) {
                        setGraphEndpoint(rest.substring(0, qIdx));
                        setGraphQueryParameters(rest.substring(qIdx + 1));
                    } else {
                        setGraphEndpoint(rest);
                        setGraphQueryParameters('');
                    }
                }

                setTemplateJson(JSON.stringify(templ.payload || {}, null, 2));
            } else if (resource.type === EResourceType.KUBERNETES_RESOURCE) {
                setTemplateJson(yaml.dump(resource.template || 'kind:'));
            } else if (resource.type === EResourceType.AZURE_CREDENTIAL) {
                const templ = resource.template || {};
                setCredType(templ.type || 'USER');
                setIdentifier(templ.identifier || '');
                setSecret(templ.secret || '');
                setTenantId(templ.tenantId || '');
                setTemplateJson(JSON.stringify(templ, null, 2));

            } else if (resource.type === EResourceType.GITHUB_CREDENTIAL) {
                const templ = resource.template || {};
                setGhCredType(templ.type || 'PAT');
                setGhUsername(templ.username || '');
                setGhToken(templ.token || '');
                setTemplateJson(JSON.stringify(templ, null, 2));

            } else if (resource.type === EResourceType.BITBUCKET_CREDENTIAL) {
                const templ = resource.template || {};
                setBbCredType(templ.type || 'APP_PASSWORD');
                setBbUsername(templ.username || '');
                setBbToken(templ.token || '');
                setTemplateJson(JSON.stringify(templ, null, 2));

            } else if (resource.type === EResourceType.CATALOG) {
                setCatalogItemType(resource.catalogDefinition?.itemType || ECatalogItemType.STRING);
                const templ = resource.template || {};
                const entries = Object.entries(templ).map(([name, value]) => {
                    const rcId = resource.catalogDefinition?.resourceClassIds?.find(item => item.name === name)?.resourceClassId;
                    return { name, value, resourceClassId: rcId };
                });
                setCatalogEntries(entries);
                setTemplateJson(JSON.stringify(templ, null, 2));
            } else if (resource.type === EResourceType.PROCESS) {
                setProcessInputMappings(resource.processDefinition?.inputMappings || {});
                setProcessOutputMappings(resource.processDefinition?.outputMappings || {});
                const templ = resource.template || {};
                const wdId = templ.workflowDefinition || null;
                setWorkflowDefinitionId(wdId);
                setTemplateJson(JSON.stringify(templ, null, 2));

                if (wdId) {
                    setIsLoadingWorkflow(true);
                    fetchWithAuth(`/workflow-definitions/${wdId}`)
                        .then(res => {
                            if (res.ok) return res.json();
                            throw new Error('Failed to fetch workflow definition');
                        })
                        .then(data => {
                            setWorkflowSteps(data.steps || []);
                        })
                        .catch(err => {
                            console.error(err);
                            showToast(t('msg_failed_to_load_workflow', 'Failed to load workflow definition'), 'error');
                        })
                        .finally(() => {
                            setIsLoadingWorkflow(false);
                        });
                } else {
                    setWorkflowSteps(resource.processDefinition?.workflowSteps || []);
                }
            } else {
                setTemplateJson(JSON.stringify(resource.template || {}, null, 2));
            }

            setDefaults(resource.defaults || {});
            setNamingRuleFormat(resource.namingRule?.format || '');
            setNamingRuleError(null);
            setMinLength(resource.namingRule?.minLength ?? 0);
            setMaxLength(resource.namingRule?.maxLength ?? 255);
            setForbiddenCharsText((resource.namingRule?.forbiddenChars || []).join(','));
            setOutputs(resource.outputs || {});
        }
    }, [resource]);

    useEffect(() => {
        if (type === EResourceType.MSGRAPH) {
            setAbbreviation('msgraph');
        } else if (type === EResourceType.AZURE_CREDENTIAL) {
            setAbbreviation('azcrd');
            setIcon('azure/Users.svg');
            setIconCategory('azure');
        } else if (type === EResourceType.GITHUB_CREDENTIAL) {
            setAbbreviation('ghcrd');
            setIcon('generics/github-color.svg');
            setIconCategory('generics');
            const identityCat = categories?.find(c => c.name === 'Identity');
            if (identityCat) {
                setCategoryId(identityCat.id);
            }
        } else if (type === EResourceType.BITBUCKET_CREDENTIAL) {
            setAbbreviation('bbcrd');
            setIcon('generics/Bitbucket.svg');
            setIconCategory('generics');
            const identityCat = categories?.find(c => c.name === 'Identity');
            if (identityCat) {
                setCategoryId(identityCat.id);
            }
        } else if (type === EResourceType.CATALOG) {
            if (isNew) {
                setAbbreviation(`cat-${name.replace(' ', '-').toLowerCase()}`);
                setIcon('generics/Catalog.svg');
                setIconCategory('generics');
            }
        }
    }, [type, name, isNew]);


    usePageTitle(isNew ? t('ptitle_new_resource', 'New Resource') : `${t('ptitle_edit_resource', 'Edit Resource')}: ${resource?.name || 'Loading...'}`);

    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;

        if (type === EResourceType.AZURE_RESOURCE) {
            monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                validate: true,
                schemas: [{
                    uri: "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
                    fileMatch: ['*'], // Match all files in this editor instance
                }]
            });
        } else {
            monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                validate: true,
                schemas: []
            });
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            showToast(t('msg_name_required', 'Name is required'), 'error');
            return;
        }
        if (!abbreviation.trim()) {
            showToast(t('msg_abbreviation_required', 'Abbreviation is required'), 'error');
            return;
        }
        if (!categoryId) {
            showToast(t('msg_category_required', 'Category is required'), 'error');
            return;
        }

        try {
            setIsSaving(true);
            let parsedTemplate: object | unknown = {};
            if (type !== EResourceType.CATALOG && type !== EResourceType.AZURE_CREDENTIAL && type !== EResourceType.GITHUB_CREDENTIAL) {
                const currentTemplate = editorRef.current ? editorRef.current.getValue() : templateJson;
                if (type === EResourceType.KUBERNETES_RESOURCE) {
                    parsedTemplate = yaml.load(currentTemplate || '');
                } else {
                    parsedTemplate = JSON.parse(currentTemplate || '{}');
                }
            }

            let finalTemplate = parsedTemplate;
            if (type === EResourceType.MSGRAPH) {
                finalTemplate = {
                    method: graphMethod,
                    contentType: graphContentType,
                    url: `https://graph.microsoft.com/${graphApiVersion}${graphEndpoint}${graphQueryParameters ? '?' + graphQueryParameters : ''}`,
                    payload: parsedTemplate
                };
            } else if (type === EResourceType.PROCESS) {
                // Save workflow definition first
                const wdPayload = {
                    name: name,
                    steps: workflowSteps,
                };
                const wdUrl = workflowDefinitionId 
                    ? `/workflow-definitions/${workflowDefinitionId}` 
                    : '/workflow-definitions';
                const wdMethod = workflowDefinitionId ? 'PUT' : 'POST';

                const wdResponse = await fetchWithAuth(wdUrl, {
                    method: wdMethod,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(wdPayload),
                });

                if (!wdResponse.ok) {
                    showToast(`Failed to save workflow definition: ${await wdResponse.text()}`, 'error');
                }

                const wdData = await wdResponse.json();
                const newWdId = wdData.id;
                setWorkflowDefinitionId(newWdId);

                finalTemplate = {
                    ...(typeof parsedTemplate === 'object' ? parsedTemplate : {}),
                    workflowDefinition: newWdId
                };
            } else if (type === EResourceType.AZURE_CREDENTIAL) {
                if (!tenantId || !identifier || !secret) {
                    showToast(t('msg_all_fields_required', 'All fields are required'), 'error');
                    return;
                }
                if (!tenantId.startsWith('***') && !isValidGuid(tenantId)) {
                    showToast(t('msg_invalid_tenant_id', 'Invalid Tenant ID format'), 'error');
                    return;
                }
                finalTemplate = {
                    type: credType,
                    identifier,
                    secret,
                    tenantId
                };
            } else if (type === EResourceType.GITHUB_CREDENTIAL) {
                if (!ghUsername || !ghToken) {
                    showToast(t('msg_all_fields_required', 'All fields are required'), 'error');
                    return;
                }
                finalTemplate = {
                    type: ghCredType,
                    username: ghUsername,
                    token: ghToken
                };
            } else if (type === EResourceType.BITBUCKET_CREDENTIAL) {
                if ((bbCredType === 'APP_PASSWORD' && !bbUsername) || !bbToken) {
                    showToast(t('msg_all_fields_required', 'All fields are required'), 'error');
                    return;
                }
                finalTemplate = {
                    type: bbCredType,
                    username: bbUsername,
                    token: bbToken
                };
            } else if (type === EResourceType.CATALOG) {
                const catalogTempl: Record<string, any> = {};
                catalogEntries.forEach(entry => {
                    catalogTempl[entry.name] = entry.value;
                });
                finalTemplate = catalogTempl;
            }



            // Validate naming rule before save
            const nrError = validateNamingRule(namingRuleFormat);
            if (nrError) {
                setNamingRuleError(nrError);
                showToast(t('msg_invalid_naming_rule', 'Invalid naming rule'), 'error');
                return;
            }

            // Validate min/max lengths
            const minOk = Number.isInteger(minLength) && minLength >= 0;
            const maxOk = Number.isInteger(maxLength) && maxLength > 0;
            if (!minOk || !maxOk || minLength > maxLength) {
                showToast(t('msg_invalid_length_constraints', 'Invalid length constraints'), 'error');
                return;
            }

            // Parse forbidden chars
            const forbiddenChars = forbiddenCharsText
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            const payload = {
                name,
                abbreviation,
                icon,
                type,
                isSystem,
                resourceCategory: categoryId ? { id: categoryId } : null,
                template: finalTemplate,
                defaults,
                namingRule: namingRuleFormat
                    ? {
                        minLength,
                        maxLength,
                        forbiddenChars,
                        format: namingRuleFormat,
                    }
                    : null,
                outputs,
                catalogDefinition: type === EResourceType.CATALOG ? {
                    itemType: catalogItemType,
                    resourceClassIds: catalogItemType === ECatalogItemType.RESOURCE_CLASS
                        ? catalogEntries
                            .filter(e => e.name && e.resourceClassId)
                            .map(e => ({ name: e.name, resourceClassId: e.resourceClassId! }))
                        : undefined
                } : null,
                processDefinition: type === EResourceType.PROCESS ? {
                    workflowSteps: workflowSteps,
                    inputMappings: processInputMappings,
                    outputMappings: processOutputMappings,
                } : null,
            };

            const url = isNew ? '/resources' : `/resources/${id}`;
            const method = isNew ? 'POST' : 'PUT';

            const response = await fetchWithAuth(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to save resource');
            }

            showToast(isNew ? 'Resource created successfully' : 'Resource updated successfully', 'success');
            await queryClient.invalidateQueries({ queryKey: ['resources'] });
            if (onSave) {
                onSave();
            } else {
                navigate('/resources/definitions');
            }
        } catch (error) {
            console.error('Error saving resource:', error);
            if (error instanceof SyntaxError) {
                showToast(t('msg_invalid_json', 'Invalid JSON format in template'), 'error');
            } else if (error && (error as any).name === 'YAMLException') {
                showToast(t('msg_invalid_yaml', 'Invalid YAML format in template'), 'error');
            } else {
                showToast(t('msg_save_failed', 'Failed to save resource'), 'error');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestAzureCredential = async () => {
        if (!id) {
            showToast(t('toast_test_save_first', 'Please save the resource before testing.'), 'error');
            return;
        }

        setIsTesting(true);
        try {
            const response = await fetchWithAuth(`/external-identity/test-credential/azure/${id}`, {
                method: 'POST'
            });

            if (response.ok) {
                const result: IAzureCredentialValidationResult = await response.json();
                setAzureTestResult(result);
                if (result.valid) {
                    const displayName = result.identity?.displayName;
                    showToast(
                        displayName
                            ? t('toast_credential_valid_with_name', `Credential is valid - ${displayName}`)
                            : t('toast_credential_valid', 'Credential is valid!'),
                        'success'
                    );
                } else {
                    const code = result.error?.code ?? 'Failed';
                    showToast(
                        t('toast_credential_invalid_with_code', `Test failed: ${code}`),
                        'error'
                    );
                }
            } else {
                setAzureTestResult(null);
                showToast(t('toast_credential_test_failed', 'Failed to test credential.'), 'error');
            }
        } catch (err) {
            console.error('Error testing credential:', err);
            setAzureTestResult(null);
            showToast(t('toast_credential_test_error', 'An error occurred during credential testing.'), 'error');
        } finally {
            setIsTesting(false);
        }
    };

    const handleTestGitHubCredential = async () => {
        if (!id) {
            showToast(t('toast_test_save_first', 'Please save the resource before testing.'), 'error');
            return;
        }

        setIsTesting(true);
        try {
            const response = await fetchWithAuth(`/external-identity/test-credential/github/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const result: ICredentialResourceValidationResult = await response.json();
                if (result.valid) {
                    showToast(t('toast_credential_valid', `Credential is valid and returns these scopes:  [${result.scopes.join(', ')}]`), 'success');
                } else {
                    showToast(t('toast_credential_invalid', 'Credential validation failed.'), 'error');
                }
            } else {
                showToast(t('toast_credential_test_failed', 'Failed to test credential.'), 'error');
            }
        } catch (err) {
            console.error('Error testing credential:', err);
            showToast(t('toast_credential_test_error', 'An error occurred during credential testing.'), 'error');
        } finally {
            setIsTesting(false);
        }
    };

    const handleTestBitbucketCredential = async () => {
        if (!id) {
            showToast(t('toast_test_save_first', 'Please save the resource before testing.'), 'error');
            return;
        }

        setIsTesting(true);
        try {
            const response = await fetchWithAuth(`/external-identity/test-credential/bitbucket/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const result: ICredentialResourceValidationResult = await response.json();
                if (result.valid) {
                    showToast(t('toast_credential_valid', `Credential is valid and returns these scopes:  [${result.scopes.join(', ')}]`), 'success');
                } else {
                    showToast(t('toast_credential_invalid', 'Credential validation failed.'), 'error');
                }
            } else {
                showToast(t('toast_credential_test_failed', 'Failed to test credential.'), 'error');
            }
        } catch (err) {
            console.error('Error testing credential:', err);
            showToast(t('toast_credential_test_error', 'An error occurred during credential testing.'), 'error');
        } finally {
            setIsTesting(false);
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            navigate(-1);
        }
    };

    const handleSetDefaults = () => {
        try {
            const currentTemplate = editorRef.current ? editorRef.current.getValue() : templateJson;
            const parsedTemplate = JSON.parse(currentTemplate);

            // Traverse template to build entries
            const entries: DefaultEntry[] = [];
            // Updated Regex to capture {{ name:type:subtype }} or {{ name:catalog:catalogName }}
            // Group 1: Name, Group 2: Type (optional), Group 3: Subtype/CatalogName (optional), Group 4: CatalogName (optional)
            const placeholderRegex = /^\{\{\s*([\w.-]+)(?::([\w.-]+)(?::([\w.-]+))?(?::([\w.-]+))?)?\s*\}\}$/;

            const walk = (obj: any, prefix = '') => {
                if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
                for (const k of Object.keys(obj)) {
                    const fullKey = prefix ? `${prefix}.${k}` : k;
                    const val = obj[k];
                    if (val && typeof val === 'object' && !Array.isArray(val)) {
                        walk(val, fullKey);
                    } else {
                        if (typeof val === 'string') {
                            const m = val.match(placeholderRegex);
                            if (m) {
                                const param = m[1];
                                let type = m[2] || 'string';
                                let subType: string | undefined = m[3];
                                let catalogName = m[4];

                                if (type === 'catalog' && subType) {
                                    catalogName = subType;
                                    subType = undefined;
                                }

                                let existingValue = defaults[param];
                                // Ensure value aligns with type if empty
                                if (existingValue === undefined) {
                                    if (type === 'array') existingValue = [];
                                    else if (type === 'object') existingValue = {};
                                    else if (type === 'number') existingValue = 0;
                                    else if (type === 'boolean') existingValue = false;
                                    else existingValue = '';
                                }

                                entries.push({
                                    id: fullKey,
                                    displayKey: `{{${param}}}`,
                                    paramKey: param,
                                    value: existingValue,
                                    type,
                                    subType: subType || catalogName,
                                    readOnly: false,
                                });
                                continue;
                            }
                        }
                        // Literal value
                        entries.push({
                            id: fullKey,
                            displayKey: fullKey,
                            paramKey: null,
                            value: val === null ? 'null' : (typeof val === 'object' ? JSON.stringify(val) : String(val)),
                            type: typeof val,
                            readOnly: true,
                        });
                    }
                }
            };

            walk(parsedTemplate);

            setDefaultEntries(entries);
            setDefaultsDialogOpen(true);
        } catch (error) {
            showToast('Invalid JSON format. Please fix before setting defaults.', 'error');
        }
    };

    const handleDefaultValueChange = (paramKey: string, value: any) => {
        setDefaults(prev => ({ ...prev, [paramKey]: value }));
        setDefaultEntries(prev => prev.map(e => e.paramKey === paramKey ? { ...e, value } : e));
    };

    const openEditor = (entry: DefaultEntry) => {
        setEditorTargetId(entry.paramKey);
        setEditorTitle(`Edit ${entry.paramKey}`);
        setEditorValue(entry.value);

        if (entry.type === 'object') {
            const valStr = typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value, null, 2);
            setEditorValue(valStr);
            setJsonEditorOpen(true);
        } else if (entry.type === 'array') {
            setEditorValue(Array.isArray(entry.value) ? entry.value : []);
            setEditorItemType((entry.subType as any) || 'string');
            setArrayEditorOpen(true);
        }
    };

    const handleEditorSave = (newVal: any) => {
        if (editorTargetId) {
            if (editorTargetId.startsWith('catalog-')) {
                const idx = parseInt(editorTargetId.split('-')[1]);
                const newEntries = [...catalogEntries];
                newEntries[idx].value = newVal;
                setCatalogEntries(newEntries);
            } else {
                handleDefaultValueChange(editorTargetId, newVal);
            }
        }
    };

    const handleAddOutput = () => {
        setOutputs(prev => ({ ...prev, '': '' }));
    };

    const handleOutputChange = (oldKey: string, newKey: string, newValue: string) => {
        setOutputs(prev => {
            const newOutputs = { ...prev };
            if (oldKey !== newKey) {
                delete newOutputs[oldKey];
            }
            newOutputs[newKey] = newValue;
            return newOutputs;
        });
    };

    const handleDeleteOutput = (key: string) => {
        setOutputs(prev => {
            const newOutputs = { ...prev };
            delete newOutputs[key];
            return newOutputs;
        });
    };

    const renderInput = (entry: DefaultEntry) => {
        if (entry.readOnly) {
            return (
                <TextField.Root
                    value={String(entry.value ?? '')}
                    disabled
                    readOnly
                />
            );
        }

        const type = entry.type || 'string';

        if (type === 'boolean') {
            return (
                <Switch
                    checked={!!entry.value}
                    onCheckedChange={(checked) => handleDefaultValueChange(entry.paramKey!, checked)}
                />
            );
        }

        if (type === 'number') {
            return (
                <TextField.Root
                    type="number"
                    value={entry.value}
                    onChange={(e) => handleDefaultValueChange(entry.paramKey!, Number(e.target.value))}
                />
            );
        }

        if (type === 'object' || type === 'array') {
            const isArray = type === 'array';
            const count = isArray ? (Array.isArray(entry.value) ? entry.value.length : 0) : Object.keys(entry.value || {}).length;
            return (
                <Button variant="soft" onClick={() => openEditor(entry)}>
                    {isArray ? `Array [${count}]` : 'Object {}'}
                    <Pencil size={14} />
                </Button>
            );
        }

        // Default string
        return (
            <TextField.Root
                value={entry.value}
                onChange={(e) => handleDefaultValueChange(entry.paramKey!, e.target.value)}
                placeholder="Default value..."
            />
        );
    };


    // Refs for toolbar actions
    const handleSaveRef = useRef(handleSave);
    const handleCancelRef = useRef(handleCancel);
    useEffect(() => {
        handleSaveRef.current = handleSave;
        handleCancelRef.current = handleCancel;
    }, [handleSave, handleCancel]);

    useToolbar(isModal ? [] : [
        { id: 'cancel', label: t('btn_back', 'Back'), icon: ArrowLeft, onClick: () => handleCancelRef.current(), variant: 'outline' },
        { id: 'save', label: t('btn_save', 'Save'), icon: Save, onClick: () => handleSaveRef.current(), variant: 'solid', isLoading: isSaving, color: 'green', disabled: !canWrite },
        { id: 'help', label: t('btn_help', 'Help'), icon: CircleQuestionMark, onClick: () => setHelpDialogOpen(true), color: 'sky' },
    ]);

    const lengthError = (() => {
        const minOk = Number.isInteger(minLength) && minLength >= 0;
        const maxOk = Number.isInteger(maxLength) && maxLength > 0;
        if (!minOk || !maxOk) return t('msg_invalid_length_constraints', 'Invalid length constraints');
        if (minLength > maxLength) return t('msg_min_exceeds_max', 'Minimum length cannot exceed maximum length');
        return null;
    })();

    const handleResourceTypeChange = (newType: string | null) => {
        const oldType = type;
        setResourceType(newType);

        if (oldType === EResourceType.AZURE_CREDENTIAL && newType !== EResourceType.AZURE_CREDENTIAL) {
            setAzureTestResult(null);
        }

        if (isNew && newType !== oldType) {
            if (newType === EResourceType.KUBERNETES_RESOURCE) {
                if (templateJson === '{}' || !templateJson) {
                    setTemplateJson('apiVersion: v1\nkind: Pod\nmetadata:\n  name: {{ name:string }}\nspec:\n  containers:\n  - name: main\n    image: nginx');
                }
            } else if (oldType === EResourceType.KUBERNETES_RESOURCE) {
                if (!templateJson || templateJson.includes('apiVersion:')) {
                    setTemplateJson('{}');
                }
            }
        }
    };

    return (
        <Card size="4" className="w-full shadow-lg" style={{ height: isModal ? '80vh' : 'calc(100vh - 8rem)', display: 'flex', flexDirection: 'column' }}>
            {resourceLoading && (
                <div className="mb-4">
                    <Progress />
                </div>
            )}

            <Heading size="4" mb="4">
                <Flex direction="row" gap="2">
                    {isNew ? t('lbl_new_resource', 'New Resource') : `${t('lbl_edit_resource', 'Edit Resource')}: ${resource?.name}`}
                    {resource?.isSystem && <Badge variant='outline'>{t('lbl_system_class', 'System Class')}</Badge>}
                </Flex>
            </Heading>


            <Flex direction="column" gap="4" className="flex-1 overflow-hidden">
                {/* Basic Info Row */}
                <Flex gap="4" wrap="wrap">
                    <Box style={{ flex: '1 1 200px' }}>
                        <Text as="div" size="2" mb="1" weight="bold">
                            {t('lbl_name', 'Name')} <Text color="red">*</Text>
                        </Text>
                        <TextField.Root
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Virtual Machine"
                        />
                    </Box>

                    <Box style={{ flex: '1 1 50px' }}>
                        <Text as="div" size="2" mb="1" weight="bold">
                            {t('lbl_abbrev', 'Abbreviation')} <Text color="red">*</Text>
                        </Text>
                        <TextField.Root
                            value={abbreviation}
                            onChange={(e) => setAbbreviation(e.target.value)}
                            placeholder="e.g. vm"
                            readOnly={type === EResourceType.MSGRAPH || type === EResourceType.AZURE_CREDENTIAL || type === EResourceType.GITHUB_CREDENTIAL || type === EResourceType.BITBUCKET_CREDENTIAL}
                        />
                    </Box>

                    <Box>
                        <Text as="div" size="2" mb="1" weight="bold">{t('lbl_type', 'Type')}</Text>
                        <Select.Root value={type || ''} onValueChange={handleResourceTypeChange} disabled={!isNew}>
                            <Select.Trigger placeholder={t('lbl_select_type', 'Select Type')} style={{ width: '100%' }} />
                            <Select.Content>
                                {resourceTypes.map((type) => (
                                    <Select.Item key={type} value={type}>
                                        <Flex gap="2" align="center">
                                            <img src={resourceTypeToIcon(type)} alt={type} className="w-4 h-4" />
                                            {typeToLabel(type)}
                                        </Flex>
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </Box>

                    <Box style={{ flex: '1 1 200px' }}>
                        <Text as="div" size="2" mb="1" weight="bold">{t('lbl_icon', 'Icon')}</Text>
                        <Flex gap="2" align="center">
                            <Button
                                variant="outline"
                                onClick={() => setIconSelectorOpen(true)}
                                style={{ flex: 1 }}
                                disabled={type === EResourceType.AZURE_CREDENTIAL || type === EResourceType.GITHUB_CREDENTIAL || type === EResourceType.BITBUCKET_CREDENTIAL}
                            >
                                {icon ? (
                                    <Flex gap="2" align="center">
                                        <img
                                            src={icon.includes('/') ? `/assets/${icon}` : `/assets/azure/${icon}`}
                                            alt={icon}
                                            className="w-5 h-5"
                                        />
                                        <span>{icon.split('/').pop()?.replace('.svg', '')}</span>
                                    </Flex>
                                ) : (
                                    t('btn_select_icon', 'Select Icon')
                                )}
                            </Button>
                        </Flex>

                    </Box>

                    <Box style={{ flex: '1 1 200px' }}>
                        <Text as="div" size="2" mb="1" weight="bold">
                            {t('lbl_category', 'Category')} <Text color="red">*</Text>
                        </Text>
                        <Select.Root value={categoryId || ''} onValueChange={(val) => setCategoryId(val || null)}>
                            <Select.Trigger placeholder={t('lbl_select_category', 'Select Category')} style={{ width: '100%' }} />
                            <Select.Content>
                                {categories?.map((cat) => (
                                    <Select.Item key={cat.id} value={cat.id}>
                                        <Badge color={(cat.color) as any || 'gray'}>
                                            {cat.name}
                                        </Badge>
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </Box>
                </Flex>

                {type === EResourceType.MSGRAPH && (
                    <MSGraphEditor
                        graphMethod={graphMethod}
                        setGraphMethod={setGraphMethod}
                        graphApiVersion={graphApiVersion}
                        setGraphApiVersion={setGraphApiVersion}
                        graphEndpoint={graphEndpoint}
                        setGraphEndpoint={setGraphEndpoint}
                        graphContentType={graphContentType}
                        setGraphContentType={setGraphContentType}
                        graphQueryParameters={graphQueryParameters}
                        setGraphQueryParameters={setGraphQueryParameters}
                    />
                )}

                {type === EResourceType.CATALOG && (
                    <CatalogEditor
                        catalogItemType={catalogItemType}
                        setCatalogItemType={setCatalogItemType}
                        catalogEntries={catalogEntries}
                        setCatalogEntries={setCatalogEntries}
                        allResources={allResources}
                        setEditorTargetId={setEditorTargetId}
                        setEditorTitle={setEditorTitle}
                        setEditorValue={setEditorValue}
                        setEditorItemType={setEditorItemType}
                        setJsonEditorOpen={setJsonEditorOpen}
                        setArrayEditorOpen={setArrayEditorOpen}
                    />
                )}

                {type === EResourceType.AZURE_CREDENTIAL && (
                    <AzureCredentialEditor
                        credType={credType}
                        setCredType={setCredType}
                        tenantId={tenantId}
                        setTenantId={setTenantId}
                        identifier={identifier}
                        setIdentifier={setIdentifier}
                        secret={secret}
                        setSecret={setSecret}
                        handleTestCredential={handleTestAzureCredential}
                        isTesting={isTesting}
                        testResult={azureTestResult}
                        onClearTestResult={() => setAzureTestResult(null)}
                    />
                )}

                {type === EResourceType.GITHUB_CREDENTIAL && (
                    <GitHubCredentialEditor
                        credType={ghCredType}
                        setCredType={setGhCredType}
                        token={ghToken}
                        setToken={setGhToken}
                        username={ghUsername}
                        setUsername={setGhUsername}
                        handleTestCredential={handleTestGitHubCredential}
                        isTesting={isTesting}
                    />
                )}

                {type === EResourceType.BITBUCKET_CREDENTIAL && (
                    <BitbucketCredentialEditor
                        credType={bbCredType}
                        setCredType={setBbCredType}
                        token={bbToken}
                        setToken={setBbToken}
                        username={bbUsername}
                        setUsername={setBbUsername}
                        handleTestCredential={handleTestBitbucketCredential}
                        isTesting={isTesting}
                    />
                )}

                {type === EResourceType.PROCESS && (
                    <Box style={{ position: 'relative' }}>
                        {isLoadingWorkflow && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
                                <Progress />
                            </div>
                        )}
                        <ProcessEditor
                            workflowDefinition={{
                                id: workflowDefinitionId || 'new',
                                name: name,
                                steps: workflowSteps,
                            }}
                            inputMappings={processInputMappings}
                            outputMappings={processOutputMappings}
                            onWorkflowChange={setWorkflowSteps}
                            onInputMappingsChange={setProcessInputMappings}
                            onOutputMappingsChange={setProcessOutputMappings}
                        />
                    </Box>
                )}

                {/* Template JSON Editor or Catalog Entries Table */}
                {type !== EResourceType.CATALOG && type !== EResourceType.AZURE_CREDENTIAL && type !== EResourceType.GITHUB_CREDENTIAL && type !== EResourceType.BITBUCKET_CREDENTIAL && type !== EResourceType.PROCESS && (
                    <TemplateEditor
                        type={type}
                        templateJson={templateJson}
                        setTemplateJson={setTemplateJson}
                        appearance={appearance}
                        t={t}
                        setOutputsDialogOpen={setOutputsDialogOpen}
                        setNamingStrategyDialogOpen={setNamingStrategyDialogOpen}
                        handleSetDefaults={handleSetDefaults}
                        beforeMountTemplate={beforeMountTemplate}
                        handleEditorDidMount={handleEditorDidMount}
                    />
                )}
            </Flex>

            <IconSelectorDialog
                open={iconSelectorOpen}
                onOpenChange={setIconSelectorOpen}
                t={t}
                iconCategory={iconCategory}
                setIconCategory={setIconCategory}
                iconSearch={iconSearch}
                setIconSearch={setIconSearch}
                icon={icon}
                setIcon={setIcon}
            />

            <NamingRuleDialog
                open={namingStrategyDialogOpen}
                onOpenChange={setNamingStrategyDialogOpen}
                t={t}
                namingRuleFormat={namingRuleFormat}
                setNamingRuleFormat={setNamingRuleFormat}
                namingRuleError={namingRuleError}
                setNamingRuleError={setNamingRuleError}
                minLength={minLength}
                setMinLength={setMinLength}
                maxLength={maxLength}
                setMaxLength={setMaxLength}
                forbiddenCharsText={forbiddenCharsText}
                setForbiddenCharsText={setForbiddenCharsText}
                lengthError={lengthError}
                appearance={appearance as any}
                beforeMountNamingRule={beforeMountNamingRule}
                namingMonacoRef={namingMonacoRef}
                namingModelRef={namingModelRef}
                namingDebounceRef={namingDebounceRef}
                setNamingMarkers={setNamingMarkers}
                validateNamingRule={validateNamingRule}
            />

            <SetDefaultsDialog
                open={defaultsDialogOpen}
                onOpenChange={setDefaultsDialogOpen}
                t={t}
                defaultEntries={defaultEntries}
                renderInput={renderInput}
                setDefaults={setDefaults}
            />

            <OutputsDialog
                open={outputsDialogOpen}
                onOpenChange={setOutputsDialogOpen}
                t={t}
                outputs={outputs}
                handleOutputChange={handleOutputChange}
                handleDeleteOutput={handleDeleteOutput}
                handleAddOutput={handleAddOutput}
            />

            {/* Editor Modals */}
            <JsonEditorModal
                open={jsonEditorOpen}
                onOpenChange={setJsonEditorOpen}
                title={editorTitle}
                value={typeof editorValue === 'string' ? editorValue : JSON.stringify(editorValue, null, 2)}
                onSave={(val) => handleEditorSave(JSON.parse(val))}
            />

            <ArrayEditorModal
                open={arrayEditorOpen}
                onOpenChange={setArrayEditorOpen}
                title={editorTitle}
                value={editorValue}
                itemType={editorItemType}
                onSave={handleEditorSave}
            />

            <HelpDialog
                open={helpDialogOpen}
                onOpenChange={setHelpDialogOpen}
                t={t}
            />

            {isModal && (
                <Flex gap="3" mt="4" justify="end">
                    <Button variant="outline" color="gray" onClick={handleCancel}>
                        <X size={16} />
                        {t('btn_cancel', 'Cancel')}
                    </Button>
                    <Button variant="solid" onClick={handleSave} loading={isSaving} color="green" disabled={!canWrite}>
                        <Save size={16} />
                        {t('btn_save', 'Save')}
                    </Button>
                </Flex>
            )}
        </Card>
    );
};

export default ClassEditor;
