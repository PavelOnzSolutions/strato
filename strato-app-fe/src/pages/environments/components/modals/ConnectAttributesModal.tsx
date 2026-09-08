import React from 'react';
import {Box, Button, Card, Dialog, Flex, IconButton, ScrollArea, Select, Separator, Text} from '@radix-ui/themes';
import {Plus, Trash} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {IMapping} from '../reactflow/EditableEdge.tsx';

interface ConnectAttributesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    onCancel: () => void;
    sourceAttributes: string[];
    targetAttributes: string[];
    selectedFromAttr: string;
    setSelectedFromAttr: (value: string) => void;
    selectedToAttr: string;
    setSelectedToAttr: (value: string) => void;
    currentMappings: IMapping[];
    addMapping: () => void;
    removeMapping: (index: number) => void;
}

const ConnectAttributesModal: React.FC<ConnectAttributesModalProps> = ({
    open,
    onOpenChange,
    onConfirm,
    onCancel,
    sourceAttributes,
    targetAttributes,
    selectedFromAttr,
    setSelectedFromAttr,
    selectedToAttr,
    setSelectedToAttr,
    currentMappings,
    addMapping,
    removeMapping
}) => {
    const { t } = useTranslation();

    return (
        <Dialog.Root open={open} onOpenChange={(isOpen) => isOpen ? onOpenChange(true) : onCancel()}>
            <Dialog.Content style={{ maxWidth: 600 }}>
                <Dialog.Title>{t('dlg_connect_title', 'Configure Connection')}</Dialog.Title>
                <Text as="div" size="2" color="gray" mb="3">
                    {t('dlg_connect_desc', 'Select which output from the source resource maps to which input of the target resource.')}
                </Text>
                <Flex direction="column" gap="3">
                    <Box>
                        <Flex justify="between" align="end" gap="2">
                            <Box className="flex-1">
                                <Text size="2" weight="bold" as="div" mb="1">{t('lbl_source_output', 'Source Output')}</Text>
                                <Select.Root value={selectedFromAttr} onValueChange={setSelectedFromAttr}>
                                    <Select.Trigger placeholder={t('ph_select_output', 'Select output')} style={{ width: '100%' }} />
                                    <Select.Content>
                                        {sourceAttributes.map(attr => (
                                            <Select.Item key={attr} value={attr}>{attr}</Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            </Box>
                            <Box className="flex-1">
                                <Text size="2" weight="bold" as="div" mb="1">{t('lbl_target_input', 'Target Input')}</Text>
                                <Select.Root value={selectedToAttr} onValueChange={setSelectedToAttr}>
                                    <Select.Trigger placeholder={t('ph_select_input', 'Select input')} style={{ width: '100%' }} />
                                    <Select.Content>
                                        {targetAttributes.map(attr => (
                                            <Select.Item key={attr} value={attr}>{attr}</Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            </Box>
                            <Button onClick={addMapping} variant="soft">
                                <Plus size={16} />
                            </Button>
                        </Flex>
                    </Box>

                    <Separator size="4" />

                    <Box>
                        <Text size="2" weight="bold" mb="2">Defined Mappings</Text>
                        <ScrollArea style={{ maxHeight: 150 }}>
                            <Flex direction="column" gap="2">
                                {currentMappings.length === 0 ? (
                                    <Text size="1" color="gray" style={{ fontStyle: 'italic' }}>No mappings added yet. Click plus to add the selection above.</Text>
                                ) : (
                                    currentMappings.map((mapping, idx) => (
                                        <Card key={idx} size="1" variant="ghost" style={{ background: 'var(--gray-3)' }}>
                                            <Flex justify="between" align="center">
                                                <Text size="1">{mapping.from} <Text color="gray">{'->'}</Text> {mapping.to}</Text>
                                                <IconButton size="1" color="red" variant="ghost" onClick={() => removeMapping(idx)}>
                                                    <Trash size={12} />
                                                </IconButton>
                                            </Flex>
                                        </Card>
                                    ))
                                )}
                            </Flex>
                        </ScrollArea>
                    </Box>
                </Flex>
                <Flex justify="end" mt="4" gap="3">
                    <Dialog.Close>
                        <Button variant="soft" color="gray" onClick={onCancel}>{t('btn_cancel', 'Cancel')}</Button>
                    </Dialog.Close>
                    <Button onClick={onConfirm}>{t('btn_confirm', 'Confirm')}</Button>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default ConnectAttributesModal;
