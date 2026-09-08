import {
  AlertDialog,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Code,
  ContextMenu,
  Dialog,
  Flex,
  Progress,
  Select,
  Table,
  Text
} from '@radix-ui/themes';
import {useToolbar} from '../../context/ToolbarContext';
import {
  ArrowBigLeft,
  Clock,
  Copy,
  DoorOpen,
  Edit,
  Grid3X3,
  HelpCircle,
  Import,
  Plus,
  RefreshCw,
  Rocket,
  Trash2
} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {fetchWithAuth} from '../../utils/api';
import {useToast} from '../../context/ToastContext';
import {IEnvironment} from '../../models/environment.model';
import {EResourceType, IResource} from '../../models/resource.model';
import {useTranslation} from 'react-i18next';
import {DiffEditor} from '@monaco-editor/react';
import {useTheme} from '../../context/ThemeContext';
import EnvironmentConfigModal from './components/modals/EnvironmentConfigModal.tsx';
import {DraggableDialogContent} from '../../components/system/DraggableDialogContent.tsx';
import EnvironmentsHelp from '../documentation/Environments.tsx';
import {formatVersionOption, stringifyContent} from "../../utils/utils.ts";
import {deleteEnvironment, fetchEnvironments} from "./api.ts";
import {useCanWrite, WriteGuard} from '../../components/permissions/WriteGuard';

const fetchResources = async (): Promise<IResource[]> => {
    const response = await fetchWithAuth('/resources');
    if (!response.ok) {
        throw new Error('Failed to fetch resources');
    }
    return response.json();
};

const EnvironmentDefinitions = () => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [historyEnvName, setHistoryEnvName] = useState<string | undefined>(undefined);
    const [historyDocId, setHistoryDocId] = useState<string | undefined>(undefined);
    const [versions, setVersions] = useState<any[]>([]);
    const [selectedLeftVersionIndex, setSelectedLeftVersionIndex] = useState<number | null>(null);
    const [newEnvDialogOpen, setNewEnvDialogOpen] = useState(false);
    const [cloneEnvDialogOpen, setCloneEnvDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [cloneSourceEnv, setCloneSourceEnv] = useState<IEnvironment | null>(null);
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { appearance, codeFont } = useTheme();
    const canWrite = useCanWrite('PERM_ENVIRONMENT_WRITE');

    const { data: environments, isLoading, refetch } = useQuery({
        queryKey: ['environments'],
        queryFn: fetchEnvironments,
    });

    const { data: resources } = useQuery({
        queryKey: ['resources'],
        queryFn: fetchResources,
    });

    const regionNameById = new Map(
        (resources || [])
            .filter(r => r.type === EResourceType.AZURE_REGION)
            .map(r => [r.id, r.name] as const)
    );

    const deleteMutation = useMutation({
        mutationFn: deleteEnvironment,
        onSuccess: () => {
            showToast('Environment deleted successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['environments'] });
        },
        onError: () => {
            showToast('Failed to delete environment', 'error');
        },
    });

    const cloneMutation = useMutation({
        mutationFn: async ({ id, name, config }: { id: string, name: string, config: any }) => {
            const response = await fetchWithAuth(`/environments/clone/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, config }),
            });
            if (!response.ok) {
                throw new Error('Failed to clone environment');
            }
            return response.json();
        },
        onSuccess: (newEnv) => {
            showToast('Environment cloned successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['environments'] });
            navigate(`/environments/definitions/${newEnv.id}`);
        },
        onError: (error: any) => {
            console.error('Error cloning environment:', error);
            showToast(error.message || 'Failed to clone environment', 'error');
        },
    });

    const handleSelectAll = (checked: boolean) => {
        if (checked && environments) {
            const ids = environments.map(e => e.id);
            const docIds = environments.map(e => e.documentId || '');
            setSelectedIds(ids);
            setSelectedDocumentIds(docIds);
        } else {
            setSelectedIds([]);
            setSelectedDocumentIds([]);
        }
    };

    // Returns the documentId for a given environment entity id
    const idToVersion = (id: string): string => {
        const env = environments?.find(e => e.id === id);
        return env?.documentId || '';
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
            setSelectedDocumentIds([...selectedDocumentIds, idToVersion(id)]);
        } else {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
            const docId = idToVersion(id);
            setSelectedDocumentIds(selectedDocumentIds.filter(d => d !== docId));
        }
    };

    const handleDeleteSelected = () => {
        if (selectedIds.length === 0) {
            showToast('Please select at least one environment to delete', 'error');
            return;
        }
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        // Ensure we have documentIds to delete. If not, derive them from the selected entity ids.
        const idsToDelete = (selectedDocumentIds && selectedDocumentIds.length > 0)
            ? selectedDocumentIds
            : selectedIds.map(idToVersion);

        for (const id of idsToDelete) {
            if (id) {
                await deleteMutation.mutateAsync(id);
            }
        }
        setSelectedIds([]);
        setSelectedDocumentIds([]);
        setDeleteDialogOpen(false);
    };



    const allSelected = environments && environments.length > 0 && selectedIds.length === environments.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < (environments?.length || 0);

    // Refs for toolbar actions
    const handleDeleteSelectedRef = useRef(handleDeleteSelected);
    useEffect(() => {
        handleDeleteSelectedRef.current = handleDeleteSelected;
    }, [handleDeleteSelected]);

    usePageTitle(t('ptitle_environments', 'Environments'));

    useToolbar([
        { id: 'new', label: t('btn_new', 'New'), icon: Plus, onClick: () => setNewEnvDialogOpen(true), variant: 'solid', disabled: !canWrite },
        { id: 'import', label: t('btn_import', 'Import'), color: 'teal', icon: Import, variant: 'solid', onClick: () => navigate('/environments/import'), disabled: !canWrite },
        { id: 'refresh', label: t('btn_refresh', 'Refresh'), icon: RefreshCw, onClick: () => refetch(), isLoading: isLoading },
        { id: 'help', label: t('btn_help', 'Help'), icon: HelpCircle, onClick: () => setHelpDialogOpen(true), color: 'sky' },
    ]);

    // ------- Version History -------
    const loadVersions = async (docId?: string, envName?: string) => {
        if (!docId) {
            showToast('No documentId available for this environment', 'error');
            return;
        }
        try {
            setHistoryLoading(true);
            setHistoryError(null);
            setHistoryDocId(docId);
            setHistoryEnvName(envName);
            // API: /api/environments/versions/<documentId> -> fetchWithAuth will prefix base URL
            const response = await fetchWithAuth(`/environments/versions/${docId}`);
            if (!response.ok) {
                throw new Error(`Failed to load versions: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            // Expect array of versions; sort by version ascending if version field exists
            let list: any[] = Array.isArray(data) ? data : [];
            if (list.length === 0) {
                setVersions([]);
                setSelectedLeftVersionIndex(null);
                setHistoryDialogOpen(true);
                return;
            }
            // Normalize date field name
            const sorted = [...list].sort((a, b) => {
                const av = typeof a.version === 'number' ? a.version : 0;
                const bv = typeof b.version === 'number' ? b.version : 0;
                return av - bv;
            });
            setVersions(sorted);
            // Select previous version (second latest) by default if exists
            const defaultIndex = sorted.length >= 2 ? sorted.length - 2 : 0;
            setSelectedLeftVersionIndex(defaultIndex);
            setHistoryDialogOpen(true);
        } catch (err: any) {
            console.error(err);
            const message = err?.message || 'Failed to load version history';
            setHistoryError(message);
            showToast(message, 'error');
            setHistoryDialogOpen(true);
        } finally {
            setHistoryLoading(false);
        }
    };
    const handleConfirmRestore = async () => {
        if (selectedLeftVersionIndex === null || !versions[selectedLeftVersionIndex]) return;
        const versionId = versions[selectedLeftVersionIndex].id;

        try {
            const response = await fetchWithAuth(`/environments/${versionId}/restore`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Failed to restore environment');

            const newEnv = await response.json();
            showToast('Environment restored successfully as new version', 'success');
            queryClient.invalidateQueries({ queryKey: ['environments'] });

            setRestoreDialogOpen(false);
            setHistoryDialogOpen(false);

            if (newEnv && newEnv.id) {
                navigate(`/environments/definitions/${newEnv.id}`);
            }
        } catch (error) {
            console.error('Error restoring environment:', error);
            showToast('Failed to restore environment', 'error');
            setRestoreDialogOpen(false);
        }
    };

    return (
        <Card size="4" className="w-full shadow-lg">
            {isLoading && (
                <div className="mb-4">
                    <Progress />
                </div>
            )}

            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={handleSelectAll}
                                {...(someSelected && { 'data-state': 'indeterminate' })}
                            />
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_name', 'Name')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_version', 'Version')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_region', 'Region')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_resource_group', 'Resource Group')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_nodes', 'Nodes')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_subscription', 'Subscription')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_id', 'ID')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_doc_id', 'Document ID')}</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {environments && environments.length > 0 ? (
                        environments.map((env) => (
                            <ContextMenu.Root key={env.id}>
                                <ContextMenu.Trigger>
                                    <Table.Row className="hover:bg-(--accent-2)" onClick={() => navigate(`/environments/definitions/${env.id}`)}>
                                        <Table.Cell>
                                            <Checkbox
                                                checked={selectedIds.includes(env.id)}
                                                onCheckedChange={(checked) => handleSelectOne(env.id, checked === true)}
                                            />
                                        </Table.Cell>
                                        <Table.RowHeaderCell onClick={() => setSelectedIds([env.id])}>
                                            <Text weight="medium">{env.name}</Text>
                                        </Table.RowHeaderCell>
                                        <Table.Cell>
                                            <Badge variant="soft"  size="1" radius="full">{env.version || '-'}</Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Badge color="blue">{(env.config?.region && regionNameById.get(env.config.region)) || '-'}</Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            {env.config?.resourceGroup || '-'}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Badge color="gray" variant="soft" radius="full">
                                                {env.nodes?.length || 0}
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Code >{env.config?.subscriptionId || '-'}</Code>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Code color='gray'>{env.id || '-'}</Code>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Code color='gold'>{env.documentId || '-'}</Code>
                                        </Table.Cell>
                                    </Table.Row>
                                </ContextMenu.Trigger>
                                <ContextMenu.Content>
                                    <ContextMenu.Item disabled={!canWrite} onClick={() => navigate(`/environments/definitions/${env.id}`)}>
                                        <Edit size={16} />
                                        <b>{t('mit_edit', 'Edit')}</b>
                                    </ContextMenu.Item>
                                    <ContextMenu.Item disabled={!canWrite} onClick={() => {
                                        setCloneSourceEnv(env);
                                        setCloneEnvDialogOpen(true);
                                    }}>
                                        <Copy size={16} />
                                        <b>{t('mit_clone', 'Clone')}</b>
                                    </ContextMenu.Item>
                                    <ContextMenu.Separator />
                                    <ContextMenu.Item onClick={() => navigate(`/environments/version-matrix/${env.id}`)}>
                                        <Grid3X3 size={16} />
                                        <b>Version Matrix</b>
                                    </ContextMenu.Item>
                                    <ContextMenu.Item onClick={() => navigate(`/environments/deploy/${env.id}`)}>
                                        <Rocket size={16} />
                                        <b>Deploy Infrastructure</b>
                                    </ContextMenu.Item>
                                    <ContextMenu.Separator />
                                    <ContextMenu.Item onClick={() => loadVersions(env.documentId, env.name)}>
                                        <Clock size={16} />
                                        <b>{t('mit_history', 'Document Version History')}</b>
                                    </ContextMenu.Item>
                                    <ContextMenu.Separator />
                                    <ContextMenu.Item color="ruby" disabled={!canWrite} onClick={() => {
                                        setSelectedIds([env.id]);
                                        setSelectedDocumentIds([env.documentId || '']);
                                        setDeleteDialogOpen(true);
                                    }}>
                                        <Trash2 size={16} />
                                        <b>{t('mit_delete_document', 'Delete Document')}</b>
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Root>
                        ))
                    ) : (
                        !isLoading && (
                            <Table.Row>
                                <Table.Cell colSpan={6} className="text-center text-(--gray-11)">
                                    {t('lbl_no_environments_found', 'No environments found')}
                                </Table.Cell>
                            </Table.Row>
                        )
                    )}
                </Table.Body>
            </Table.Root>

            {/* Delete Dialog */}
            <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DraggableDialogContent maxWidth="450px" title={t('lbl_delete_environments', 'Delete Environments')}>
                    <Dialog.Description size="2" mb="4">
                        {t('lbl_confirm_delete_environments', `Are you sure you want to delete ${selectedIds.length} selected environment(s)?`)}
                        {' '}{t('lbl_delete_confirmation', 'This action cannot be undone.')}
                    </Dialog.Description>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                <ArrowBigLeft className="w-5 h-5" />
                                {t('btn_back', 'Back')}
                            </Button>
                        </Dialog.Close>
                        <Dialog.Close>
                            <WriteGuard permission="PERM_ENVIRONMENT_WRITE">
                                <Button variant="solid" color="red" onClick={confirmDelete} disabled={deleteMutation.isPending}>
                                    <Trash2 className="w-5 h-5" />
                                    {t('btn_delete', 'Delete')}
                                </Button>
                            </WriteGuard>
                        </Dialog.Close>
                    </Flex>
                </DraggableDialogContent>
            </Dialog.Root>

            {/* Version History Dialog */}
            <Dialog.Root open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
                <Dialog.Content style={{ maxWidth: '90vw', height: '90vh', display: 'flex', flexDirection: 'column' }}>
                    <Dialog.Title>
                        {t('dlg_version_history_title', 'Version History')}{historyEnvName ? ` - ${historyEnvName}` : ''}
                    </Dialog.Title>

                    {historyLoading && (
                        <div className="mb-4">
                            <Progress />
                        </div>
                    )}

                    {historyError && (
                        <Text color="ruby" size="2">{historyError}</Text>
                    )}

                    {!historyLoading && versions && (
                        <Flex direction="column" gap="3" style={{ flex: 1, overflow: 'hidden' }}>
                            <Box>
                                <Text size="2" mb="1" weight="bold" as="div">{t('lbl_select_version_to_compare', 'Select version to compare')} </Text>
                                <Select.Root
                                    value={selectedLeftVersionIndex !== null ? String(selectedLeftVersionIndex) : ''}
                                    onValueChange={(val) => setSelectedLeftVersionIndex(val === '' ? null : parseInt(val))}
                                >
                                    <Select.Trigger placeholder={t('ph_select_version', 'Select a version...')} style={{ width: 500 }} />
                                    <Select.Content>
                                        {versions.map((v, idx) => (
                                            <Select.Item key={idx} value={String(idx)}>{formatVersionOption(v)}</Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            </Box>

                            {versions.length === 0 && (
                                <Flex align="center" justify="center" style={{ flex: 1 }}>
                                    <Text color="gray">{t('lbl_no_versions_found', 'No versions found')}</Text>
                                </Flex>
                            )}

                            {versions.length > 0 && (
                                <Flex direction="column" gap="2" style={{ flex: 1, border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)', overflow: 'hidden' }}>
                                    <Flex gap="3" p="2" wrap="wrap" align="center">
                                        <Badge color="gray" variant="soft">{t('lbl_left', 'Left')}: {selectedLeftVersionIndex !== null ? formatVersionOption(versions[selectedLeftVersionIndex]) : '-'}</Badge>
                                        <Badge color="blue" variant="soft">{t('lbl_right_latest', 'Right (Latest)')}: {formatVersionOption(versions[versions.length - 1])}</Badge>
                                        {historyDocId && <Badge color="gray" variant="soft">Doc ID: {historyDocId}</Badge>}
                                    </Flex>
                                    <div style={{ flex: 1 }}>
                                        <DiffEditor
                                            original={selectedLeftVersionIndex !== null ? stringifyContent(versions[selectedLeftVersionIndex]) : ''}
                                            modified={stringifyContent(versions[versions.length - 1])}
                                            language="json"
                                            theme={appearance === 'dark' ? 'vs-dark' : 'light'}
                                            options={{
                                                readOnly: true,
                                                minimap: { enabled: false },
                                                renderSideBySide: true,
                                                fontFamily: codeFont,
                                                fontLigatures: true
                                            }}
                                        />
                                    </div>
                                </Flex>
                            )}

                            <Flex gap="3" mt="4" justify="end">
                                <Dialog.Close>
                                    <Button variant="soft" color="gray">
                                        <DoorOpen className="w-5 h-5" />
                                        {t('btn_close', 'Close')}
                                    </Button>
                                </Dialog.Close>
                            </Flex>
                        </Flex>
                    )}
                </Dialog.Content>
            </Dialog.Root>

            {/* Restore Confirmation Dialog */}
            <AlertDialog.Root open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
                <AlertDialog.Content maxWidth="450px">
                    <AlertDialog.Title>Confirm Restore</AlertDialog.Title>
                    <AlertDialog.Description size="2">
                        {t('dlg_restore_desc', 'Warning: Restoring an older version creates a new version based on this snapshot. This may result in broken references if dependent environments expect resources that are missing in this version. Are you sure you want to proceed?')}
                    </AlertDialog.Description>

                    <Flex gap="3" mt="4" justify="end">
                        <AlertDialog.Cancel>
                            <Button variant="soft" color="gray">
                                Cancel
                            </Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action>
                            <WriteGuard permission="PERM_ENVIRONMENT_WRITE">
                                <Button variant="solid" color="orange" onClick={handleConfirmRestore}>
                                    Restore
                                </Button>
                            </WriteGuard>
                        </AlertDialog.Action>
                    </Flex>
                </AlertDialog.Content>
            </AlertDialog.Root>

            {/* New/Edit environment dialog */}
            <EnvironmentConfigModal
                open={newEnvDialogOpen}
                onOpenChange={setNewEnvDialogOpen}
                title={t('dlg_new_environment_title', 'New Environment')}
                confirmLabel={t('btn_create', 'Create')}
                resources={resources}
                isNew={true}
                onConfirm={async (name, config) => {
                    setIsSaving(true);
                    try {
                        const payload = {
                            name,
                            config,
                            nodes: [],
                            references: []
                        };
                        const response = await fetchWithAuth('/environments', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                        });
                        if (!response.ok) throw new Error('Failed to create environment');
                        const newEnv = await response.json();
                        setNewEnvDialogOpen(false);
                        navigate(`/environments/definitions/${newEnv.id}`);
                    } catch (error) {
                        console.error('Error creating environment:', error);
                        showToast('Failed to create environment', 'error');
                    } finally {
                        setIsSaving(false);
                    }
                }}
                loading={isSaving}
            />

            {/* Clone Dialog */}
            <EnvironmentConfigModal
                open={cloneEnvDialogOpen}
                onOpenChange={setCloneEnvDialogOpen}
                title={t('dlg_clone_environment_title', 'Clone Environment')}
                confirmLabel={t('btn_clone', 'Clone')}
                initialConfig={cloneSourceEnv?.config}
                resources={resources}
                onConfirm={(name, config) => {
                    if (cloneSourceEnv) {
                        cloneMutation.mutate({ id: cloneSourceEnv.id, name, config });
                    }
                }}
                loading={cloneMutation.isPending}
            />

            {/* Help Dialog */}
            <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
                <DraggableDialogContent title={t('dlg_help_title', 'Environments Documentation')} maxWidth="90vw" maxHeight="90vh">
                    <Box px="4" pb="4">
                        <EnvironmentsHelp />
                    </Box>
                </DraggableDialogContent>
            </Dialog.Root>
        </Card>
    );
};

export default EnvironmentDefinitions;
