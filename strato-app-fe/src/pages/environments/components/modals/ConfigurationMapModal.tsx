import React from 'react';
import {Box, Button, Code, Dialog, Flex, IconButton, ScrollArea, Switch, Table, Text, Tooltip} from '@radix-ui/themes';
import {ChevronDown, ChevronRight, X} from 'lucide-react';
import {Node} from '@xyflow/react';

interface ConfigurationMapModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodes: Node[];
}

const ConfigurationMapModal: React.FC<ConfigurationMapModalProps> = ({open, onOpenChange, nodes}) => {
    const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({});
    const [showSystemProperties, setShowSystemProperties] = React.useState(false);

    const toggleNode = (nodeId: string) => {
        setExpandedNodes(prev => ({
            ...prev,
            [nodeId]: !prev[nodeId]
        }));
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Content style={{maxWidth: 1200, maxHeight: '80vh'}}>
                <Flex justify="between" align="center" mb="4">
                    <Flex align="center" gap="4">
                        <Dialog.Title mb="0">Configuration Map</Dialog.Title>
                        <Flex align="center" gap="2">
                            <Switch
                                size="1"
                                checked={showSystemProperties}
                                onCheckedChange={setShowSystemProperties}
                            />
                            <Text size="1">Show system properties</Text>
                        </Flex>
                    </Flex>
                    <Dialog.Close>
                        <IconButton variant="ghost" color="gray">
                            <X size={18}/>
                        </IconButton>
                    </Dialog.Close>
                </Flex>

                <ScrollArea scrollbars="vertical" style={{height: '60vh'}}>
                    <Table.Root variant="surface">
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell width="40px"></Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Resource / Key</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Value</Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {nodes.map(node => {
                                const entries = Object.entries((node.data.values as Record<string, any>) || {});
                                const filteredEntries = showSystemProperties
                                    ? entries
                                    : entries.filter(([key]) => !key.startsWith('_'));

                                return (
                                    <React.Fragment key={node.id}>
                                        <Table.Row
                                            onClick={() => toggleNode(node.id)}
                                            style={{cursor: 'pointer', backgroundColor: 'var(--gray-2)'}}
                                        >
                                            <Table.Cell>
                                                {expandedNodes[node.id] ? <ChevronDown size={16}/> :
                                                    <ChevronRight size={16}/>}
                                            </Table.Cell>
                                            <Table.Cell style={{fontWeight: 'bold'}}>
                                                <Flex align="center" gap="2">
                                                    {(node.data as any).icon && (
                                                        <Box className="shrink-0">
                                                            <img
                                                                src={`/assets/${(node.data as any).icon}`}
                                                                alt=""
                                                                style={{width: 20, height: 20}}
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                }}
                                                            />
                                                        </Box>
                                                    )}
                                                    <Text size="3">{node.data.label as string}</Text>
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Text size="1" color="gray">
                                                    {filteredEntries.length} keys
                                                </Text>
                                            </Table.Cell>
                                        </Table.Row>
                                        {expandedNodes[node.id] && (
                                            <>
                                                {filteredEntries.map(([key, value]) => (
                                                    <Table.Row key={`${node.id}-${key}`}>
                                                        <Table.Cell></Table.Cell>
                                                        <Table.Cell style={{paddingLeft: '24px'}}>
                                                            <Code variant="outline" size="3">{key}</Code>
                                                        </Table.Cell>
                                                        <Table.Cell>
                                                            <Box style={{
                                                                maxWidth: '400px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                <Tooltip
                                                                    content={typeof value === 'object' ? JSON.stringify(value) : String(value)}>
                                                                    <Code variant="ghost" size="2">
                                                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                                    </Code>
                                                                </Tooltip>
                                                            </Box>
                                                        </Table.Cell>
                                                    </Table.Row>
                                                ))}
                                                {filteredEntries.length === 0 && (
                                                    <Table.Row>
                                                        <Table.Cell></Table.Cell>
                                                        <Table.Cell colSpan={2} style={{paddingLeft: '24px'}}>
                                                            <Text size="2" color="gray">No configuration keys</Text>
                                                        </Table.Cell>
                                                    </Table.Row>
                                                )}
                                            </>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </Table.Body>
                    </Table.Root>
                </ScrollArea>

                <Flex justify="end" mt="4">
                    <Dialog.Close>
                        <Button variant="soft" color="gray">Close</Button>
                    </Dialog.Close>
                </Flex>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default ConfigurationMapModal;
