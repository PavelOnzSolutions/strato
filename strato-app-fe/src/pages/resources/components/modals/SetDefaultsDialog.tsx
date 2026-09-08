import {Badge, Button, Dialog, Flex, ScrollArea, Switch, Table, Text} from '@radix-ui/themes';
import {ArrowBigLeft, Save, ShieldCheck} from 'lucide-react';

interface SetDefaultsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    t: any;
    defaultEntries: any[];
    renderInput: (entry: any) => React.ReactNode;
    setDefaults: (val: any) => void;
}

export const SetDefaultsDialog = ({
    open,
    onOpenChange,
    t,
    defaultEntries,
    renderInput,
    setDefaults
}: SetDefaultsDialogProps) => {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{ maxWidth: 1000, maxHeight: '80vh' }}>
                <Dialog.Title>{t('lbl_set_defaults', 'Set Default Values')}</Dialog.Title>
                <Dialog.Description size="2" mb="4">
                    {t('lbl_set_defaults_desc', 'Define default values for each key in the template.')}
                </Dialog.Description>

                <ScrollArea style={{ height: 500, maxHeight: '80vh' }}>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell style={{ width: '40%' }}>{t('thead_key', 'Key')}</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>{t('thead_value', 'Value')}</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell><ShieldCheck color='lime'></ShieldCheck></Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {defaultEntries.map((entry) => (
                                <Table.Row key={entry.id}>
                                    <Table.Cell>
                                        <Flex direction="column">
                                            <Text size="2" weight="medium" style={{ fontFamily: 'monospace' }}>{entry.displayKey}</Text>
                                            {!entry.readOnly && entry.type !== 'string' && (
                                                <Badge size="1" color="gray" variant="soft" style={{ width: 'fit-content' }}>
                                                    {entry.type}{entry.subType ? `:${entry.subType}` : ''}
                                                </Badge>
                                            )}
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {renderInput(entry)}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Switch
                                            size="1"
                                            checked={!entry.readOnly}
                                            onCheckedChange={() => { /* visual only */ }}
                                            disabled
                                        />
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                            {defaultEntries.length === 0 && (
                                <Table.Row>
                                    <Table.Cell colSpan={3} className="text-center text-[var(--gray-11)]">
                                        {t('lbl_no_keys_found', 'No keys found in template. Add properties to the JSON template first.')}
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table.Root>
                </ScrollArea>

                <Flex gap="3" mt="4" justify="end">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">
                            <ArrowBigLeft className="w-5 h-5" />
                            {t('btn_back', 'Back')}
                        </Button>
                    </Dialog.Close>
                    <Dialog.Close>
                        <Button variant="solid" onClick={() => {
                            // Keep only parameter-based defaults present in entries
                            const allowed = new Set(defaultEntries.filter(e => !!e.paramKey).map(e => e.paramKey as string));
                            setDefaults((prev: any) => {
                                const out: Record<string, string> = {};
                                for (const k of allowed) {
                                    out[k] = prev[k] ?? '';
                                }
                                return out;
                            });
                            onOpenChange(false);
                        }}>
                            <Save className="w-5 h-5" />
                            {t('btn_apply', 'Apply')}
                        </Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};
