import {Box, Button, Flex, Text} from '@radix-ui/themes';
import {NotebookPen, Outdent, Settings2} from 'lucide-react';
import Editor from '@monaco-editor/react';
import {EResourceType} from '../../../../models/resource.model.ts';
import {useTheme} from '../../../../context/ThemeContext';

interface TemplateEditorProps {
    type: string | null;
    templateJson: string;
    setTemplateJson: (val: string) => void;
    appearance: string;
    t: any;
    setOutputsDialogOpen: (val: boolean) => void;
    setNamingStrategyDialogOpen: (val: boolean) => void;
    handleSetDefaults: () => void;
    beforeMountTemplate: (monaco: any) => void;
    handleEditorDidMount: (editor: any, monaco: any) => void;
}

export const TemplateEditor = ({
    type,
    templateJson,
    setTemplateJson,
    appearance,
    t,
    setOutputsDialogOpen,
    setNamingStrategyDialogOpen,
    handleSetDefaults,
    beforeMountTemplate,
    handleEditorDidMount
}: TemplateEditorProps) => {
    const { codeFont } = useTheme();
    return (
        <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, visibility: type === (EResourceType.AZURE_CREDENTIAL || EResourceType.GITHUB_CREDENTIAL) ? 'hidden' : 'visible', height: type === (EResourceType.AZURE_CREDENTIAL || EResourceType.GITHUB_CREDENTIAL) ? 0 : 'auto' }}>
            <Flex justify="between" align="center" mb="2">
                <Text as="div" size="2" weight="bold">
                    {type === EResourceType.MSGRAPH ? 'Payload (JSON)' :
                        type === EResourceType.KUBERNETES_RESOURCE ? 'Template (YAML)' :
                            t('lbl_template', 'Template (JSON)')}
                </Text>

                <Flex direction="row" gap="2">
                    <Button variant="soft" size="1" onClick={() => setOutputsDialogOpen(true)}>
                        <Outdent className="w-4 h-4"></Outdent>
                        {t('btn_outputs', 'Outputs')}
                    </Button>
                    <Button variant="soft" size="1" onClick={() => setNamingStrategyDialogOpen(true)}>
                        <NotebookPen className="w-4 h-4"></NotebookPen>
                        {t('btn_naming_rule', 'Naming Rule')}
                    </Button>
                    <Button variant="soft" size="1" onClick={handleSetDefaults}>
                        <Settings2 className="w-4 h-4" />
                        {t('btn_set_defaults', 'Set Defaults')}
                    </Button>
                </Flex>
            </Flex>
            <div className="flex-1 border border-[var(--gray-6)] rounded overflow-hidden">
                <Editor
                    height="100%"
                    defaultLanguage={type === EResourceType.KUBERNETES_RESOURCE ? 'template-k8s' : 'template-json'}
                    language={type === EResourceType.KUBERNETES_RESOURCE ? 'template-k8s' : 'template-json'}
                    value={templateJson}
                    beforeMount={beforeMountTemplate}
                    onMount={handleEditorDidMount}
                    onChange={(value) => setTemplateJson(value || (type === EResourceType.KUBERNETES_RESOURCE ? '' : '{}'))}
                    theme={appearance === 'dark' ? 'templateThemeDark' : 'templateThemeLight'}
                    options={{
                        minimap: { enabled: true },
                        formatOnPaste: type !== EResourceType.KUBERNETES_RESOURCE,
                        formatOnType: type !== EResourceType.KUBERNETES_RESOURCE,
                        fontFamily: codeFont,
                        fontLigatures: true,
                    }}
                />
            </div>
        </Box>
    );
};
