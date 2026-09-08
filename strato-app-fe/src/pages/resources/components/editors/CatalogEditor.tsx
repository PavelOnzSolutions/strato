import {Box, Button, Flex, ScrollArea, Select, Table, Text, TextField} from '@radix-ui/themes';
import {Pencil, Trash2} from 'lucide-react';
import {ECatalogItemType, IResource} from '../../../../models/resource.model.ts';

interface CatalogEditorProps {
    catalogItemType: ECatalogItemType;
    setCatalogItemType: (val: ECatalogItemType) => void;
    catalogEntries: { name: string; value: any; resourceClassId?: string }[];
    setCatalogEntries: (entries: any[]) => void;
    allResources?: IResource[];
    setEditorTargetId: (val: string) => void;
    setEditorTitle: (val: string) => void;
    setEditorValue: (val: any) => void;
    setEditorItemType: (val: 'string' | 'number' | 'object') => void;
    setJsonEditorOpen: (val: boolean) => void;
    setArrayEditorOpen: (val: boolean) => void;
}

export const CatalogEditor = ({
    catalogItemType,
    setCatalogItemType,
    catalogEntries,
    setCatalogEntries,
    allResources,
    setEditorTargetId,
    setEditorTitle,
    setEditorValue,
    setEditorItemType,
    setJsonEditorOpen,
    setArrayEditorOpen
}: CatalogEditorProps) => {
    return (
        <Flex direction="column" gap="4" className="flex-1 overflow-hidden">
            <Flex gap="4" wrap="wrap">
                <Box style={{ flex: '1 1 200px' }}>
                    <Text as="div" size="2" mb="1" weight="bold">Item Type</Text>
                    <Select.Root value={catalogItemType} onValueChange={(val) => setCatalogItemType(val as ECatalogItemType)}>
                        <Select.Trigger style={{ width: '100%' }} />
                        <Select.Content>
                            {Object.values(ECatalogItemType).map(t => <Select.Item key={t} value={t}>{t}</Select.Item>)}
                        </Select.Content>
                    </Select.Root>
                </Box>
            </Flex>

            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Flex justify="between" align="center" mb="2">
                    <Text as="div" size="2" weight="bold">Catalog Entries</Text>
                    <Button size="1" onClick={() => setCatalogEntries([...catalogEntries, { name: '', value: '' }])}>
                        Add Entry
                    </Button>
                </Flex>
                <ScrollArea scrollbars="vertical" style={{ flex: 1, border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                                {catalogItemType === ECatalogItemType.RESOURCE_CLASS && <Table.ColumnHeaderCell>Resource Class</Table.ColumnHeaderCell>}
                                <Table.ColumnHeaderCell>Value</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell style={{ width: '50px' }}></Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {catalogEntries.map((entry, idx) => (
                                <Table.Row key={idx}>
                                    <Table.Cell>
                                        <TextField.Root
                                            value={entry.name}
                                            onChange={(e) => {
                                                const newEntries = [...catalogEntries];
                                                newEntries[idx].name = e.target.value;
                                                setCatalogEntries(newEntries);
                                            }}
                                            placeholder="Entry name"
                                        />
                                    </Table.Cell>
                                    {catalogItemType === ECatalogItemType.RESOURCE_CLASS && (
                                        <Table.Cell>
                                            <Select.Root
                                                value={entry.resourceClassId || ''}
                                                onValueChange={(val) => {
                                                    const newEntries = [...catalogEntries];
                                                    newEntries[idx].resourceClassId = val;
                                                    setCatalogEntries(newEntries);
                                                }}
                                            >
                                                <Select.Trigger placeholder="Select Class" />
                                                <Select.Content>
                                                    {allResources?.map((r) => (
                                                        <Select.Item key={r.id} value={r.id}>
                                                            {r.name}
                                                        </Select.Item>
                                                    ))}
                                                </Select.Content>
                                            </Select.Root>
                                        </Table.Cell>
                                    )}
                                    <Table.Cell>
                                        {(catalogItemType === ECatalogItemType.STRING || catalogItemType === ECatalogItemType.NUMBER) ? (
                                            <TextField.Root
                                                value={entry.value}
                                                onChange={(e) => {
                                                    const newEntries = [...catalogEntries];
                                                    newEntries[idx].value = catalogItemType === ECatalogItemType.NUMBER ? Number(e.target.value) : e.target.value;
                                                    setCatalogEntries(newEntries);
                                                }}
                                                placeholder="Value"
                                            />
                                        ) : (
                                            <Button
                                                variant="soft"
                                                size="1"
                                                onClick={() => {
                                                    setEditorTargetId(`catalog-${idx}`);
                                                    setEditorTitle(`Edit ${entry.name || 'Value'}`);
                                                    setEditorValue(entry.value);
                                                    if (catalogItemType === ECatalogItemType.OBJECT || catalogItemType === ECatalogItemType.ARRAY_OBJECT) {
                                                        setEditorItemType('object');
                                                        setJsonEditorOpen(true);
                                                    } else if (catalogItemType === ECatalogItemType.ARRAY_STRING) {
                                                        setEditorItemType('string');
                                                        setArrayEditorOpen(true);
                                                    }
                                                }}
                                            >
                                                <Pencil size={12} className="mr-1" />
                                                {entry.value ? (typeof entry.value === 'object' ? 'Edit Object/Array' : entry.value) : 'Configure'}
                                            </Button>
                                        )}
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Button
                                            variant="ghost"
                                            color="red"
                                            size="1"
                                            onClick={() => {
                                                const newEntries = catalogEntries.filter((_, i) => i !== idx);
                                                setCatalogEntries(newEntries);
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                            {catalogEntries.length === 0 && (
                                <Table.Row>
                                    <Table.Cell colSpan={catalogItemType === ECatalogItemType.RESOURCE_CLASS ? 4 : 3}>
                                        <Text align="center" color="gray" size="2">No entries added.</Text>
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table.Root>
                </ScrollArea>
            </Box>
        </Flex>
    );
};
