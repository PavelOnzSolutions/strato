import React, { useState, useEffect } from 'react';
import { Dialog, Button, Flex, Box, Table, TextField, IconButton } from '@radix-ui/themes';
import { useTranslation } from 'react-i18next';
import { Plus, Trash, Pencil } from 'lucide-react';
import JsonEditorModal from './JsonEditorModal.tsx';
import ReferenceAutocomplete from '../system/ReferenceAutocomplete.tsx';

interface ArrayEditorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    value: any[];
    itemType: 'string' | 'number' | 'object';
    onSave: (newValue: any[]) => void;
    availableOutputs?: { value: string; label: string }[];
    allNodes?: { id: string; label: string }[];
}

const ArrayEditorModal: React.FC<ArrayEditorModalProps> = ({
    open,
    onOpenChange,
    title,
    value,
    itemType,
    onSave,
    availableOutputs = [],
    allNodes = []
}) => {
    const { t } = useTranslation();
    const [items, setItems] = useState<any[]>(value || []);
    const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [jsonValue, setJsonValue] = useState('{}');

    useEffect(() => {
        if (open) {
            setItems(value || []);
        }
    }, [open, value]);

    const handleAddItem = () => {
        if (itemType === 'object') {
            setJsonValue('{}');
            setEditingIndex(items.length); // New item index
            setJsonEditorOpen(true);
        } else {
            setItems([...items, itemType === 'number' ? 0 : '']);
        }
    };

    const handleDeleteItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleItemChange = (index: number, val: string) => {
        const newItems = [...items];
        if (itemType === 'number') {
            newItems[index] = Number(val);
        } else {
            newItems[index] = val;
        }
        setItems(newItems);
    };

    const handleEditObject = (index: number) => {
        setJsonValue(JSON.stringify(items[index], null, 2));
        setEditingIndex(index);
        setJsonEditorOpen(true);
    };

    const handleJsonSave = (val: string) => {
        if (editingIndex !== null) {
            const parsed = JSON.parse(val);
            const newItems = [...items];
            if (editingIndex === items.length) {
                newItems.push(parsed); // Add new
            } else {
                newItems[editingIndex] = parsed; // Update existing
            }
            setItems(newItems);
        }
        setJsonEditorOpen(false);
        setEditingIndex(null);
    };

    const handleSave = () => {
        onSave(items);
        onOpenChange(false);
    };

    return (
        <>
            <Dialog.Root open={open} onOpenChange={onOpenChange}>
                <Dialog.Content style={{ maxWidth: 600, maxHeight: '80vh' }}>
                    <Dialog.Title>{title}</Dialog.Title>

                    <Box my="4" style={{ maxHeight: 400, overflowY: 'auto' }}>
                        <Table.Root variant="surface">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeaderCell>Value</Table.ColumnHeaderCell>
                                    <Table.ColumnHeaderCell style={{ width: 100 }}>Actions</Table.ColumnHeaderCell>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {items.map((item, index) => (
                                    <Table.Row key={index}>
                                        <Table.Cell>
                                            {itemType === 'object' ? (
                                                <pre style={{ margin: 0, fontSize: 11, maxHeight: 60, overflow: 'hidden' }}>
                                                    {JSON.stringify(item)}
                                                </pre>
                                            ) : itemType === 'string' ? (
                                                <ReferenceAutocomplete
                                                    value={item}
                                                    onChange={(val) => handleItemChange(index, val)}
                                                    availableOutputs={availableOutputs}
                                                    allNodes={allNodes}
                                                />
                                            ) : (
                                                <TextField.Root
                                                    type="number"
                                                    value={item}
                                                    onChange={(e) => handleItemChange(index, e.target.value)}
                                                />
                                            )}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Flex gap="2">
                                                {itemType === 'object' && (
                                                    <IconButton variant="ghost" color="blue" onClick={() => handleEditObject(index)}>
                                                        <Pencil size={16} />
                                                    </IconButton>
                                                )}
                                                <IconButton variant="ghost" color="red" onClick={() => handleDeleteItem(index)}>
                                                    <Trash size={16} />
                                                </IconButton>
                                            </Flex>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                                {items.length === 0 && (
                                    <Table.Row>
                                        <Table.Cell colSpan={2} style={{ textAlign: 'center', color: 'var(--gray-9)' }}>
                                            No items
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table.Root>
                    </Box>

                    <Flex gap="3" justify="between">
                        <Button variant="outline" onClick={handleAddItem}>
                            <Plus size={16} />
                            Add Item
                        </Button>
                        <Flex gap="3">
                            <Dialog.Close>
                                <Button variant="soft" color="gray">
                                    {t('btn_cancel', 'Cancel')}
                                </Button>
                            </Dialog.Close>
                            <Button onClick={handleSave}>
                                {t('btn_save', 'Save')}
                            </Button>
                        </Flex>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            <JsonEditorModal
                open={jsonEditorOpen}
                onOpenChange={setJsonEditorOpen}
                title="Edit Object Item"
                value={jsonValue}
                onSave={handleJsonSave}
                availableOutputs={availableOutputs}
            />
        </>
    );
};

export default ArrayEditorModal;
