import React, {useEffect, useState} from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Dialog,
  Flex,
  Heading,
  Separator,
  Spinner,
  Table,
  Text
} from '@radix-ui/themes';
import {
  AlertTriangle,
  Check,
  CircleHelp,
  CloudDownload,
  DatabaseBackup,
  History,
  RefreshCw,
  Upload
} from 'lucide-react';
import {useQuery} from '@tanstack/react-query';
import {usePageTitle} from '../../../context/PageTitleContext';
import {useToast} from '../../../context/ToastContext';
import {fetchWithAuth} from '../../../utils/api';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../../context/AuthContext';
import {useToolbar} from '../../../context/ToolbarContext';
import {WriteGuard} from '../../../components/permissions/WriteGuard';
import {AuditLogCompact, EAuditLogSeverity} from '../../../models/audit-log.model';
import {IBackupRequestDto} from '../../../models/backup.model';
import RestoreDialog from './RestoreDialog';
import BackupRestoreHelp from '../../documentation/BackupRestoreHelp';

const fetchCollections = async (): Promise<string[]> => {
    const response = await fetchWithAuth('/backup/collections');
    if (!response.ok) {
        throw new Error('Failed to fetch collections');
    }
    return response.json();
};

const fetchBackupHistory = async (): Promise<AuditLogCompact[]> => {
    const response = await fetchWithAuth('/backup/history');
    if (!response.ok) {
        throw new Error('Failed to fetch backup history');
    }
    return response.json();
};

const BackupView: React.FC = () => {
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    const {showToast} = useToast();
    usePageTitle(t('ptitle_backup_restore', 'Backup & Restore'));

    const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);

    const {data: collections, isLoading: isLoadingCollections, refetch: refetchCollections} = useQuery({
        queryKey: ['backup-collections'],
        queryFn: fetchCollections,
    });

    const {data: history, isLoading: isLoadingHistory, refetch: refetchHistory} = useQuery({
        queryKey: ['backup-history'],
        queryFn: fetchBackupHistory,
    });

    useToolbar([
        { id: 'refresh', label: t('btn_refresh', 'Refresh'), icon: RefreshCw, onClick: () => { refetchCollections(); refetchHistory(); } },
        { id: 'help', label: t('btn_help', 'Help'), icon: CircleHelp, onClick: () => setHelpDialogOpen(true), color: 'sky' },
    ]);

    useEffect(() => {
        if (collections) {
            setSelectedCollections([]);
        }
    }, [collections]);

    const handleToggleAll = (checked: boolean) => {
        if (checked && collections) {
            setSelectedCollections([...collections]);
        } else {
            setSelectedCollections([]);
        }
    };

    const handleToggleCollection = (collection: string, checked: boolean) => {
        if (checked) {
            setSelectedCollections([...selectedCollections, collection]);
        } else {
            setSelectedCollections(selectedCollections.filter(c => c !== collection));
        }
    };

    const handleGenerateBackup = async () => {
        if (selectedCollections.length === 0) {
            showToast(t('msg_select_collections', 'Please select at least one collection to backup'), 'error');
            return;
        }

        setIsGenerating(true);
        try {
            const body: IBackupRequestDto = {tables: selectedCollections};
            const response = await fetchWithAuth('/backup', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error('Backup generation failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `strato-backup-${new Date().toISOString().split('T')[0]}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            showToast(t('msg_backup_success', 'Backup generated successfully'), 'success');
            refetchHistory();
        } catch (error) {
            console.error('Backup error:', error);
            showToast(t('msg_backup_failed', 'Failed to generate backup'), 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Container size="4">
            <Flex direction="column" gap="6">
                <Box>
                    <Flex justify="between" align="center" mb="4">
                        <Heading size="6">
                            <Flex align="center" gap="2" >
                                <DatabaseBackup  color="var(--accent-11)"/>
                                <span className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">{t('lbl_backup_data', 'Backup Data')}</span>
                            </Flex>
                        </Heading>
                        <WriteGuard permission="PERM_BACKUP_WRITE">
                            <Button onClick={() => setIsRestoreDialogOpen(true)} color="blue" variant="soft">
                                <Upload size={16}/>
                                {t('btn_restore_data', 'Restore Data')}
                            </Button>
                        </WriteGuard>
                    </Flex>

                    <Card size="3" style={{ opacity: hasPermission('PERM_BACKUP_WRITE') ? 1 : 0.6, pointerEvents: hasPermission('PERM_BACKUP_WRITE') ? 'auto' : 'none' }}>
                        {!hasPermission('PERM_BACKUP_WRITE') && (
                            <Box mb="4">
                                <Text color="amber" size="2">
                                    {t('msg_no_backup_write_perm', 'You do not have permission to create backups.')}
                                </Text>
                            </Box>
                        )}
                        <Flex direction="column" gap="4">
                            <Flex justify="between" align="center">
                                <Text size="2" color="gray">
                                    {t('lbl_select_collections_to_backup', 'Select collections you wish to include in the backup file. If you select collection with references, the referenced data will be backed up too.')}
                                </Text>
                                <Button variant="ghost" onClick={() => refetchCollections()}
                                        disabled={isLoadingCollections}>
                                    <RefreshCw size={14} className={isLoadingCollections ? 'animate-spin' : ''}/>
                                    {t('btn_refresh', 'Refresh')}
                                </Button>
                            </Flex>

                            {isLoadingCollections ? (
                                <Flex justify="center" p="4">
                                    <Spinner size="3"/>
                                </Flex>
                            ) : (
                                <Box>
                                    <Table.Root variant="surface">
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.ColumnHeaderCell width="40px">
                                                    <Checkbox
                                                        checked={(collections ? collections?.length : 0) > 0 && selectedCollections.length === collections?.length}
                                                        onCheckedChange={handleToggleAll}
                                                    />
                                                </Table.ColumnHeaderCell>
                                                <Table.ColumnHeaderCell>{t('lbl_collection_name', 'Collection Name')}</Table.ColumnHeaderCell>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {collections?.map((collection) => (
                                                <Table.Row key={collection}>
                                                    <Table.Cell>
                                                        <Checkbox
                                                            checked={selectedCollections.includes(collection)}
                                                            onCheckedChange={(checked) => handleToggleCollection(collection, !!checked)}
                                                        />
                                                    </Table.Cell>
                                                    <Table.Cell>{collection}</Table.Cell>
                                                </Table.Row>
                                            ))}
                                            {collections?.length === 0 && (
                                                <Table.Row>
                                                    <Table.Cell colSpan={2} align="center">
                                                        <Text
                                                            color="gray">{t('lbl_no_collections_found', 'No collections found')}</Text>
                                                    </Table.Cell>
                                                </Table.Row>
                                            )}
                                        </Table.Body>
                                    </Table.Root>
                                </Box>
                            )}

                            <Flex justify="end" mt="2">
                                <Button
                                    size="3"
                                    onClick={handleGenerateBackup}
                                    disabled={isGenerating || selectedCollections.length === 0}
                                    loading={isGenerating}
                                >
                                    <CloudDownload size={18}/>
                                    {t('btn_generate_backup', 'Generate Backup')}
                                </Button>
                            </Flex>
                        </Flex>
                    </Card>
                </Box>

                <Separator size="4"/>

                <Box>
                    <Flex justify="between" align="center" mb="4">
                        <Heading size="6">
                            <Flex align="center" gap="2">
                                <History  color="var(--accent-11)"/>
                                <span className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                                    {t('lbl_backup_history', 'Backup & Restore History')}
                                </span>
                            </Flex>
                        </Heading>

                    </Flex>

                    <Card size="3">
                        {isLoadingHistory ? (
                            <Flex justify="center" p="4">
                                <Spinner size="3"/>
                            </Flex>
                        ) : (
                            <Table.Root variant="surface">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeaderCell>{t('lbl_type', 'Type')}</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>{t('lbl_status', 'Status')}</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>{t('lbl_user', 'User')}</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>{t('lbl_date', 'Date')}</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>{t('lbl_details', 'Details')}</Table.ColumnHeaderCell>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {history?.map((log) => (
                                        <Table.Row key={log.id}>
                                            <Table.Cell>
                                                <Badge color={log.operation === 'BACKUP' ? 'blue' : 'orange'}>
                                                    {log.operation === 'BACKUP' ? t('lbl_backup', 'Backup') : t('lbl_restore', 'Restore')}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                {(log.severity === EAuditLogSeverity.INFO) || (log.severity === EAuditLogSeverity.SUCCESS) ? (
                                                    <Badge color="green">
                                                        <Flex align="center" gap="1">
                                                            <Check size={12}/>
                                                            {t('lbl_success', 'Success')}
                                                        </Flex>
                                                    </Badge>
                                                ) : (
                                                    <Badge color="red">
                                                        <Flex align="center" gap="1">
                                                            <AlertTriangle size={12}/>
                                                            {t('lbl_failed', 'Failed')}
                                                        </Flex>
                                                    </Badge>
                                                )}
                                            </Table.Cell>
                                            <Table.Cell>{log.userLogin}</Table.Cell>
                                            <Table.Cell>{new Date(log.timestamp).toLocaleString()}</Table.Cell>
                                            <Table.Cell>
                                                <Text size="1">{log.collectionName || '-'}</Text>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                    {history?.length === 0 && (
                                        <Table.Row>
                                            <Table.Cell colSpan={5} align="center">
                                                <Text
                                                    color="gray">{t('lbl_no_history_found', 'No history found')}</Text>
                                            </Table.Cell>
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table.Root>
                        )}
                    </Card>
                </Box>
            </Flex>

            <RestoreDialog
                open={isRestoreDialogOpen}
                onOpenChange={(open) => {
                    setIsRestoreDialogOpen(open);
                    if (!open) refetchHistory();
                }}
            />

            <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
                <Dialog.Content style={{ maxWidth: 800 }}>
                    <BackupRestoreHelp hideTitle />
                    <Flex gap="3" mt="4" justify="end">
                        <Button variant="soft" color="gray" onClick={() => setHelpDialogOpen(false)}>
                            {t('btn_close', 'Close')}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Container>
    );
};

export default BackupView;
