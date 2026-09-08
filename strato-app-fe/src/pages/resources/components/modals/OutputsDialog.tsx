import {Box, Button, Dialog, Flex, ScrollArea, Table, TextField} from '@radix-ui/themes';
import {Trash2} from 'lucide-react';
import {DraggableDialogContent} from '../../../../components/system/DraggableDialogContent.tsx';

interface OutputsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    t: any;
    outputs: Record<string, string>;
    handleOutputChange: (oldKey: string, newKey: string, newValue: string) => void;
    handleDeleteOutput: (key: string) => void;
    handleAddOutput: () => void;
}

export const OutputsDialog = ({
    open,
    onOpenChange,
    t,
    outputs,
    handleOutputChange,
    handleDeleteOutput,
    handleAddOutput
}: OutputsDialogProps) => {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <DraggableDialogContent maxWidth="800px" maxHeight="80vh" title={t('lbl_resource_outputs', 'Resource Outputs')}>

                <Dialog.Description size="2" mb="4">
                    {t('msg_outputs_desc', 'Map valid resource outputs (e.g. connectionString) to ARM deployment output variables (using JSONPath).')}
                </Dialog.Description>

                <ScrollArea style={{ height: 400 }}>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell style={{ width: '40%' }}>{t('thead_output_key', 'Resource Output Key')}</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>{t('thead_arm_output', 'ARM Output Name')}</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell style={{ width: '50px' }}></Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {Object.entries(outputs).map(([key, value], index) => (
                                <Table.Row key={index}>
                                    <Table.Cell>
                                        <TextField.Root
                                            value={key}
                                            placeholder="e.g. connectionString"
                                            onChange={(e) => handleOutputChange(key, e.target.value, value)}
                                        />
                                    </Table.Cell>
                                    <Table.Cell>
                                        <TextField.Root
                                            value={value}
                                            placeholder="e.g. storageAccountConnectionString"
                                            onChange={(e) => handleOutputChange(key, key, e.target.value)}
                                        />
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Button color="red" variant="outline" onClick={() => handleDeleteOutput(key)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                            {Object.keys(outputs).length === 0 && (
                                <Table.Row>
                                    <Table.Cell colSpan={3} style={{ textAlign: 'center', color: 'var(--gray-8)' }}>
                                        {t('msg_no_outputs', 'No outputs defined. Click "Add Output" to create one.')}
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table.Root>
                </ScrollArea>

                <Flex gap="3" mt="4" justify="between">
                    <Button variant="outline" onClick={handleAddOutput}>
                        {t('btn_add_output', 'Add Output')}
                    </Button>
                    <Box>
                        <Dialog.Close>
                            <Button variant="soft" color="gray" onClick={() => onOpenChange(false)}>
                                {t('btn_close', 'Close')}
                            </Button>
                        </Dialog.Close>
                    </Box>
                </Flex>
            </DraggableDialogContent>
        </Dialog.Root>
    );
};
