import {useState} from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Heading,
  IconButton,
  ScrollArea,
  Table,
  Text,
  TextField
} from '@radix-ui/themes';
import {Calendar, ChevronLeft, History as HistoryIcon, Plus, Server, Tag, Trash2} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {fetchWithAuth} from '../../utils/api';
import {IDeploymentVersionMatrix} from '../../models/version-matrix.model';
import {useToast} from '../../context/ToastContext';
import {usePageTitle} from '../../context/PageTitleContext';

const VersionMatrix = () => {
    const { envId } = useParams<{ envId: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newEntry, setNewEntry] = useState({ componentName: '', version: '' });

    usePageTitle('Version Matrix');

    const { data: versions, isLoading } = useQuery<IDeploymentVersionMatrix[]>({
        queryKey: ['version-matrix', envId],
        queryFn: async () => {
            const response = await fetchWithAuth(`/version-matrix/${envId}`);
            if (!response.ok) throw new Error('Failed to fetch versions');
            return response.json();
        }
    });

    const addMutation = useMutation({
        mutationFn: async (entry: Partial<IDeploymentVersionMatrix>) => {
            const response = await fetchWithAuth('/version-matrix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...entry, environmentId: envId })
            });
            if (!response.ok) throw new Error('Failed to add version');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['version-matrix', envId] });
            setIsAddDialogOpen(false);
            setNewEntry({ componentName: '', version: '' });
            showToast('Version entry added successfully', 'success');
        },
        onError: () => {
            showToast('Failed to add version entry', 'error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetchWithAuth(`/version-matrix/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete entry');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['version-matrix', envId] });
            showToast('Version entry deleted', 'success');
        }
    });

    const handleBack = () => navigate(-1);

    return (
        <Flex direction="column" gap="4">
            <Flex justify="between" align="center">
                <Flex align="center" gap="3">
                    <IconButton variant="ghost" color="gray" onClick={handleBack}>
                        <ChevronLeft size={20} />
                    </IconButton>
                    <Heading size="6" className="flex items-center gap-2">
                        <HistoryIcon size={24} /> Version Matrix
                    </Heading>
                </Flex>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus size={16} /> Add Component
                </Button>
            </Flex>

            <Card size="3" className="shadow-md">
                <ScrollArea scrollbars="vertical" style={{ maxHeight: 'calc(100vh - 16rem)' }}>
                    {isLoading ? (
                        <Text>Loading version information...</Text>
                    ) : (versions?.length || 0) === 0 ? (
                        <Flex direction="column" align="center" justify="center" py="8" gap="2">
                            <Server size={48} color="var(--gray-7)" />
                            <Text color="gray">No components tracked in this environment.</Text>
                            <Text size="1" color="gray">Entries are typically added via CD pipelines or manually above.</Text>
                        </Flex>
                    ) : (
                        <Table.Root variant="surface">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeaderCell>Component</Table.ColumnHeaderCell>
                                    <Table.ColumnHeaderCell>Version</Table.ColumnHeaderCell>
                                    <Table.ColumnHeaderCell>Deployed At</Table.ColumnHeaderCell>
                                    <Table.ColumnHeaderCell align="right">Actions</Table.ColumnHeaderCell>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {versions?.map((v) => (
                                    <Table.Row key={v.id}>
                                        <Table.RowHeaderCell>
                                            <Flex align="center" gap="2">
                                                <Server size={14} className="text-blue-500" />
                                                <Text weight="bold">{v.componentName}</Text>
                                            </Flex>
                                        </Table.RowHeaderCell>
                                        <Table.Cell>
                                            <Badge color="blue" variant="soft" size="2">
                                                <Tag size={12} className="mr-1" />
                                                {v.version}
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Flex align="center" gap="2" style={{ color: 'var(--gray-11)' }}>
                                                <Calendar size={14} />
                                                <Text size="2">
                                                    {new Date(v.deployedAt).toLocaleString()}
                                                </Text>
                                            </Flex>
                                        </Table.Cell>
                                        <Table.Cell align="right">
                                            <IconButton
                                                variant="ghost"
                                                color="red"
                                                onClick={() => v.id && deleteMutation.mutate(v.id)}
                                            >
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                    )}
                </ScrollArea>
            </Card>

            <Dialog.Root open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <Dialog.Content style={{ maxWidth: 400 }}>
                    <Dialog.Title>Add Component Version</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        Manually record a component version deployment.
                    </Dialog.Description>

                    <Flex direction="column" gap="3">
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">Component Name</Text>
                            <TextField.Root
                                value={newEntry.componentName}
                                onChange={(e) => setNewEntry({ ...newEntry, componentName: e.target.value })}
                                placeholder="e.g. auth-service"
                            />
                        </Box>
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">Version</Text>
                            <TextField.Root
                                value={newEntry.version}
                                onChange={(e) => setNewEntry({ ...newEntry, version: e.target.value })}
                                placeholder="e.g. 1.2.3-final"
                            />
                        </Box>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">Cancel</Button>
                        </Dialog.Close>
                        <Button
                            onClick={() => addMutation.mutate(newEntry)}
                            disabled={!newEntry.componentName || !newEntry.version}
                        >
                            Save Version
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Flex>
    );
};

export default VersionMatrix;
