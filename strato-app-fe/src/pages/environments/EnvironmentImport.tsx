import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Badge, Box, Card, Dialog, Flex, Heading, Progress,} from '@radix-ui/themes';
import {ArrowLeft,} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useToolbar} from '../../context/ToolbarContext';
import {usePageTitle} from '../../context/PageTitleContext';
import {useQuery} from '@tanstack/react-query';
import {fetchWithAuth} from '../../utils/api';
import {EResourceType, IResource} from '../../models/resource.model';
import {useToast} from '../../context/ToastContext';
import {IEnvironmentNew, IEnvironmentReference} from '../../models/environment.model';
import {IImportedItem, IImportRequest, IImportResult, ImportSource, IDetectedReference} from '../../models/import.model';
import ClassEditor from '../resources/ClassEditor.tsx';

import ImportStepSourceSelect from './components/import-wizard/ImportStepSourceSelect.tsx';
import ImportStepParams from './components/import-wizard/ImportStepParams.tsx';
import ImportStepProgress from './components/import-wizard/ImportStepProgress.tsx';
import ImportStepReview from './components/import-wizard/ImportStepReview.tsx';

const fetchResources = async (): Promise<IResource[]> => {
    const response = await fetchWithAuth('/resources');
    if (!response.ok) {
        throw new Error('Failed to fetch resources');
    }
    return response.json();
};

const fetchCategories = async () => {
    const response = await fetchWithAuth('/resource-categories');
    if (!response.ok) {
        throw new Error('Failed to fetch categories');
    }
    return response.json();
};

const importFromResourceGroup = async (req: IImportRequest, signal?: AbortSignal): Promise<IImportResult> => {
    const response = await fetchWithAuth('/environments/import', {
        method: 'POST',
        body: JSON.stringify(req),
        signal
    });
    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Import failed (${response.status}): ${text}`);
    }
    return response.json();
};

const EnvironmentImport = () => {
    const [step, setStep] = useState(1);
    const [source, setSource] = useState<ImportSource | undefined>();
    const [form, setForm] = useState<IImportRequest>({
        subscriptionId: '',
        resourceGroup: '',
        region: 'westeurope',
        azureCredentialId: '',
        values: {}
    });
    const [envName, setEnvName] = useState('');
    const [result, setResult] = useState<IImportResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [credDialogOpen, setCredDialogOpen] = useState(false);
    const [newCred, setNewCred] = useState({
        name: '',
        type: 'SERVICE_PRINCIPAL',
        tenantId: '',
        identifier: '',
        secret: ''
    });
    const [savingCred, setSavingCred] = useState(false);

    const [importModalOpen, setImportModalOpen] = useState(false);
    const [selectedImportItem, setSelectedImportItem] = useState<IImportedItem | null>(null);

    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();

    usePageTitle(t('ptitle_environment_import', 'Import Environment'));

    const { data: resources, refetch: refetchResources } = useQuery({
        queryKey: ['resources'],
        queryFn: fetchResources,
    });

    const { data: categories } = useQuery({
        queryKey: ['resource-categories'],
        queryFn: fetchCategories,
    });

    const azureCredentials = resources?.filter(r => r.type === EResourceType.AZURE_CREDENTIAL) || [];

    useToolbar([
        {
            id: 'back',
            label: t('btn_back', 'Back'),
            icon: ArrowLeft,
            onClick: () => {
                if (step === 4) setStep(2);
                else if (step > 1) setStep(step - 1);
                else navigate('/environments/definitions');
            }
        },
    ]);

    const onRun = async () => {
        setError(null);
        setLoading(true);
        setStep(3);
        try {
            const res = await importFromResourceGroup({ ...form, source });
            setResult(res);
            if (form.resourceGroup && !envName) {
                setEnvName(`Imported ${form.resourceGroup}`);
            }
            setStep(4);
        } catch (e: any) {
            setError(e.message ?? 'Import failed');
            setStep(2); // Go back to form on error
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCredential = async () => {
        if (!newCred.name || !newCred.tenantId || !newCred.identifier || !newCred.secret) {
            showToast(t('msg_all_fields_required', 'All fields are required'), 'error');
            return;
        }

        setSavingCred(true);
        try {
            const payload = {
                name: newCred.name,
                abbreviation: `azcrd-${newCred.name.toLowerCase().replace(/\s+/g, '-')}`,
                icon: 'Users.svg',
                type: EResourceType.AZURE_CREDENTIAL,
                resourceCategory: null,
                template: {
                    type: newCred.type,
                    tenantId: newCred.tenantId,
                    identifier: newCred.identifier,
                    secret: newCred.secret
                },
                defaults: {},
                outputs: {}
            };

            const response = await fetchWithAuth('/resources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to create credential');
            }

            const created = await response.json();
            showToast(t('msg_cred_created', 'Credential created successfully'), 'success');
            await refetchResources();
            setForm(f => ({ ...f, azureCredentialId: created.id }));
            setCredDialogOpen(false);
            setNewCred({
                name: '',
                type: 'SERVICE_PRINCIPAL',
                tenantId: '',
                identifier: '',
                secret: ''
            });
        } catch (e: any) {
            showToast(e.message || 'Failed to create credential', 'error');
        } finally {
            setSavingCred(false);
        }
    };

    const handleNext = () => {
        if (step === 1 && source) setStep(2);
        else if (step === 2) onRun();
    };

    const handleFinish = async () => {
        if (!result) return;
        if (!envName) {
            showToast(t('msg_env_name_required', 'Environment name is required'), 'error');
            return;
        }

        setLoading(true);
        try {
            // Build nodes from matched resources
            const nodes = result.matches.map((m, idx) => ({
                key: `node-${idx}`,
                label: m.imported.name || m.matchedResourceName,
                resourceClassId: m.matchedResourceId,
                values: {},
                disableNamingRule: true,
                position: { x: 100, y: 100 + idx * 100 }
            }));

            // Build references from detected cross-resource links
            const references: IEnvironmentReference[] = [];
            if (result.detectedReferences && result.detectedReferences.length > 0) {
                // Map: Azure resource ID (lowercase) → node key
                const azureIdToNodeKey = new Map<string, string>();
                result.matches.forEach((m, idx) => {
                    if (m.imported.id) {
                        azureIdToNodeKey.set(m.imported.id.toLowerCase(), `node-${idx}`);
                    }
                });

                for (const ref of result.detectedReferences) {
                    const fromNodeKey = azureIdToNodeKey.get(ref.fromImportedId?.toLowerCase());
                    const toNodeKey = azureIdToNodeKey.get(ref.toImportedId?.toLowerCase());
                    if (fromNodeKey && toNodeKey) {
                        references.push({
                            fromNode: fromNodeKey,
                            fromAttribute: 'id',
                            toNode: toNodeKey,
                            toAttribute: ref.propertyPath,
                            fromHandle: 'right',
                            toHandle: 'left'
                        });
                    }
                }
            }

            const newEnv: IEnvironmentNew = {
                name: envName,
                config: {
                    subscriptionId: form.subscriptionId,
                    azureCredentialId: form.azureCredentialId,
                    resourceGroup: form.resourceGroup,
                    region: form.region,
                    values: Object.fromEntries(Object.entries(form.values || {}).map(([k, v]) => [k, String(v)]))
                },
                nodes,
                references
            };

            const response = await fetchWithAuth('/environments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEnv),
            });

            if (!response.ok) {
                throw new Error('Failed to create environment');
            }

            showToast(t('msg_import_success', 'Environment imported successfully'), 'success');
            navigate('/environments/definitions');
        } catch (e: any) {
            showToast(e.message || 'Failed to save environment', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExportYAML = () => {
        if (!result) return;

        let yaml = '# Strato Import Discovery Results\n';
        yaml += `# Source: ${source}\n`;
        yaml += `# Resource Group: ${form.resourceGroup}\n`;
        yaml += `# Subscription: ${form.subscriptionId}\n`;
        yaml += `# Date: ${new Date().toISOString()}\n\n`;

        yaml += 'matches:\n';
        if (result.matches.length > 0) {
            result.matches.forEach(m => {
                yaml += `  - name: "${m.imported.name}"\n`;
                yaml += `    type: "${m.imported.type}"\n`;
                yaml += `    apiVersion: "${m.imported.apiVersion ?? ''}"\n`;
                yaml += `    matchedResourceName: "${m.matchedResourceName}"\n`;
                yaml += `    confidence: ${m.confidence}\n`;
                yaml += `    id: "${m.imported.id}"\n`;
            });
        } else {
            yaml += '  []\n';
        }

        yaml += '\nunmatched:\n';
        if (result.unmatched.length > 0) {
            result.unmatched.forEach(u => {
                yaml += `  - name: "${u.name}"\n`;
                yaml += `    type: "${u.type}"\n`;
                yaml += `    apiVersion: "${u.apiVersion ?? ''}"\n`;
                yaml += `    id: "${u.id}"\n`;
            });
        } else {
            yaml += '  []\n';
        }

        const blob = new Blob([yaml], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = `import-${form.resourceGroup || 'azure'}-${new Date().getTime()}.yaml`;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Steps now extracted into separate components

    return (
        <>
            <Card size="4" className="w-full shadow-lg">
                <Box mb="6">
                    <Flex justify="between" align="center" mb="4">
                        <Heading size="7">Import Environment Wizard</Heading>
                        <Badge size="2" color="blue">Step {step > 3 ? 3 : step} of 3</Badge>
                    </Flex>
                    <Progress value={(Math.min(step, 4) / 4) * 100} size="1" />
                </Box>

                <Box minHeight="400px">
                    {step === 1 && (
                        <ImportStepSourceSelect
                            source={source}
                            onSelectSource={setSource}
                            onNext={handleNext}
                        />
                    )}
                    {step === 2 && (
                        <ImportStepParams
                            form={form}
                            setForm={setForm}
                            azureCredentials={azureCredentials}
                            loading={loading}
                            error={error}
                            onRun={onRun}
                            onBack={() => setStep(1)}
                            credDialogOpen={credDialogOpen}
                            setCredDialogOpen={setCredDialogOpen}
                            newCred={newCred}
                            setNewCred={setNewCred}
                            savingCred={savingCred}
                            onCreateCredential={handleCreateCredential}
                            onRefreshResources={() => refetchResources()}
                        />
                    )}
                    {step === 3 && (
                        <ImportStepProgress
                            source={source}
                            resourceGroup={form.resourceGroup}
                        />
                    )}
                    {step === 4 && result && (
                        <ImportStepReview
                            result={result}
                            envName={envName}
                            setEnvName={setEnvName}
                            resources={resources}
                            loading={loading}
                            onBackToParams={() => setStep(2)}
                            onExportYAML={handleExportYAML}
                            onFinish={handleFinish}
                            onImportAsClass={(item) => { setSelectedImportItem(item); setImportModalOpen(true); }}
                        />
                    )}
                </Box>
            </Card>

            <Dialog.Root open={importModalOpen} onOpenChange={setImportModalOpen}>
                <Dialog.Content style={{ maxWidth: 1200 }}>
                    <Dialog.Title>{t('title_import_as_class', 'Import as Resource Class')}</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        {t('desc_import_as_class', 'Create a new resource class from the imported resource template.')}
                    </Dialog.Description>

                    <ClassEditor
                        initialData={{
                            name: selectedImportItem?.name || '',
                            type: 'AZURE_RESOURCE',
                            template: selectedImportItem?.template || {
                                type: selectedImportItem?.type,
                                apiVersion: selectedImportItem?.apiVersion,
                                kind: selectedImportItem?.kind,
                                location: selectedImportItem?.region,
                                properties: {}
                            },
                            resourceCategory: (() => {
                                if (!selectedImportItem?.type) return undefined;
                                const type = selectedImportItem.type.toLowerCase();
                                if (type.includes('compute') || type.includes('virtualmachines')) return categories?.find((c: { name: string; }) => c.name.toLowerCase().includes('compute')) || categories?.find((c: { name: string; }) => c.name.toLowerCase().includes('server'));
                                if (type.includes('network')) return categories?.find((c: { name: string; }) => c.name.toLowerCase().includes('network'));
                                if (type.includes('storage')) return categories?.find((c: { name: string; }) => c.name.toLowerCase().includes('storage'));
                                if (type.includes('sql') || type.includes('db') || type.includes('database')) return categories?.find((c: { name: string; }) => c.name.toLowerCase().includes('database')) || categories?.find((c: { name: string; }) => c.name.toLowerCase().includes('data'));
                                return undefined;
                            })()
                        }}
                        onSave={() => {
                            setImportModalOpen(false);
                            refetchResources();
                            // If we are in step 4, we might want to re-run the import or just inform the user
                            showToast(t('msg_class_created_refresh', 'Resource class created. You may want to re-run the import to see the match.'), 'info');
                        }}
                        onCancel={() => setImportModalOpen(false)}
                    />
                </Dialog.Content>
            </Dialog.Root>
        </>
    );
};

export default EnvironmentImport;
