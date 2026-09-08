import {Box, Button, Code, Dialog, Flex, Table, Text, TextField} from '@radix-ui/themes';
import Editor from '@monaco-editor/react';
import {DraggableDialogContent} from '../../../../components/system/DraggableDialogContent.tsx';
import {useTheme} from '../../../../context/ThemeContext';

interface NamingRuleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    t: any;
    namingRuleFormat: string;
    setNamingRuleFormat: (val: string) => void;
    namingRuleError: string | null;
    setNamingRuleError: (val: string | null) => void;
    minLength: number;
    setMinLength: (val: number) => void;
    maxLength: number;
    setMaxLength: (val: number) => void;
    forbiddenCharsText: string;
    setForbiddenCharsText: (val: string) => void;
    lengthError: string | null;
    appearance: 'light' | 'dark';
    beforeMountNamingRule: (monaco: any) => void;
    namingMonacoRef: any;
    namingModelRef: any;
    namingDebounceRef: any;
    setNamingMarkers: (err: string | null) => void;
    validateNamingRule: (rule: string) => string | null;
}

export const NamingRuleDialog = ({
    open,
    onOpenChange,
    t,
    namingRuleFormat,
    setNamingRuleFormat,
    namingRuleError,
    setNamingRuleError,
    minLength,
    setMinLength,
    maxLength,
    setMaxLength,
    forbiddenCharsText,
    setForbiddenCharsText,
    lengthError,
    appearance,
    beforeMountNamingRule,
    namingMonacoRef,
    namingModelRef,
    namingDebounceRef,
    setNamingMarkers,
    validateNamingRule
}: NamingRuleDialogProps) => {
    const { codeFont } = useTheme();
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <DraggableDialogContent maxWidth="700px" title={t('lbl_naming_strategy', 'Naming Strategy')}>
                <Dialog.Description size="2" mb="3">
                    {t('msg_naming_rule_desc', 'Define how resource instances will be named. Use variables in curly braces and text.')}
                </Dialog.Description>

                <Box mb="3">
                    <Text size="2" weight="bold">{t('lbl_rule', 'Rule')}</Text>
                    {open && (
                        <Editor
                            height="140px"
                            defaultLanguage="naming-rule"
                            language="naming-rule"
                            value={namingRuleFormat}
                            beforeMount={beforeMountNamingRule}
                            onMount={(editor: any, monaco: any) => {
                                namingMonacoRef.current = monaco;
                                namingModelRef.current = editor.getModel();
                                setNamingMarkers(namingRuleError);
                            }}
                            onChange={(val: string | undefined) => {
                                const v = val ?? '';
                                if (namingDebounceRef.current) clearTimeout(namingDebounceRef.current);
                                namingDebounceRef.current = setTimeout(() => {
                                    setNamingRuleFormat(v);
                                    const err = validateNamingRule(v);
                                    setNamingRuleError(err);
                                    setNamingMarkers(err);
                                }, 150);
                            }}
                            theme={appearance === 'dark' ? 'namingRuleDark' : 'namingRuleLight'}
                            options={{
                                wordWrap: 'on',
                                minimap: { enabled: false },
                                lineNumbers: 'off',
                                folding: false,
                                renderLineHighlight: 'none',
                                fontSize: 13,
                                scrollbar: { vertical: 'auto', horizontal: 'hidden' },
                                contextmenu: false,
                                fontFamily: codeFont,
                                fontLigatures: true
                            }}
                        />
                    )}
                    {namingRuleError && (
                        <Text color="red" size="2">{namingRuleError}</Text>
                    )}
                </Box>

                <Flex gap="3" mb="3" wrap="wrap">
                    <Box style={{ flex: '1 1 150px' }}>
                        <Text size="2" weight="bold">{t('lbl_min_length', 'Minimum length')}</Text>
                        <TextField.Root
                            type="number"
                            value={String(minLength)}
                            onChange={(e) => {
                                const v = parseInt((e.target as HTMLInputElement).value || '0', 10);
                                setMinLength(Number.isNaN(v) ? 0 : v);
                            }}
                            min={0}
                        />
                    </Box>
                    <Box style={{ flex: '1 1 150px' }}>
                        <Text size="2" weight="bold">{t('lbl_max_length', 'Maximum length')}</Text>
                        <TextField.Root
                            type="number"
                            value={String(maxLength)}
                            onChange={(e) => {
                                const v = parseInt((e.target as HTMLInputElement).value || '0', 10);
                                setMaxLength(Number.isNaN(v) ? 0 : v);
                            }}
                            min={1}
                        />
                    </Box>
                </Flex>
                {lengthError && (
                    <Box mb="3">
                        <Text color="red" size="2">{lengthError}</Text>
                    </Box>
                )}

                <Box mb="3">
                    <Text size="2" weight="bold">{t('lbl_forbidden_chars', 'Forbidden characters')}</Text>
                    <TextField.Root
                        value={forbiddenCharsText}
                        onChange={(e) => setForbiddenCharsText(e.target.value)}
                        placeholder={t('ph_forbidden_chars', 'e.g. /,\\,?,#,%,:')}
                    />
                    <Text as="div" size="1" color="gray">{t('msg_forbidden_chars_hint', 'Comma-separated list of characters that are not allowed in the final name.')}</Text>
                </Box>

                <Box mb="3">
                    <Text weight="bold" mb="1">{t('lbl_available_variables', 'Available variables')}</Text>
                    <Table.Root size="1">
                        <Table.Body>
                            <Table.Row>
                                <Table.Cell><Code variant="soft">{'{abbrv}'}</Code></Table.Cell>
                                <Table.Cell>{t('var_abbrv', 'Resource Abbreviation')}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell><Code variant="soft">{'{env}'}</Code></Table.Cell>
                                <Table.Cell>{t('var_env', 'Environment name')}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell><Code variant="soft">{'{name}'}</Code></Table.Cell>
                                <Table.Cell>{t('var_name', 'Resource instance name')}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell><Code variant="soft">{'{region}'}</Code></Table.Cell>
                                <Table.Cell>{t('var_region', 'Region name')}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell><Code variant="soft">{'{region-abbrv}'}</Code></Table.Cell>
                                <Table.Cell>{t('var_region_abbrv', 'Short region name')}</Table.Cell>
                            </Table.Row>
                            <Table.Row>
                                <Table.Cell><Code variant="soft">{'{rnd}'}</Code></Table.Cell>
                                <Table.Cell>{t('var_rnd', 'Random 5-character string')}</Table.Cell>
                            </Table.Row>
                        </Table.Body>
                    </Table.Root>
                </Box>

                <Flex justify="end" gap="3">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">{t('btn_close', 'Close')}</Button>
                    </Dialog.Close>
                    <Dialog.Close>
                        <Button disabled={!!namingRuleError || !!lengthError} onClick={() => onOpenChange(false)}>
                            {t('btn_apply', 'Apply')}
                        </Button>
                    </Dialog.Close>
                </Flex>
            </DraggableDialogContent>
        </Dialog.Root>
    );
};
