import {
    Badge,
    Box,
    Button,
    Card,
    Checkbox,
    Dialog,
    Flex,
    Popover,
    Progress,
    Select,
    Table,
    Text,
    TextField
} from '@radix-ui/themes';
import {
    Activity,
    AlertTriangle,
    ArrowBigLeft,
    CheckCircle,
    CircleHelp,
    CloudUpload,
    DatabaseBackup,
    DatabaseZap,
    DoorOpen,
    Download,
    FileText,
    Filter,
    Info,
    Pen, PencilLine, Play, Plus,
    RefreshCw,
    Server, Trash,
    Trash2, Unlock, LockIcon,
    User,
    UserRoundCog,
    XCircle, PackageMinus, PackagePlus
} from 'lucide-react';
import {useToolbar} from '../../context/ToolbarContext';
import {useCanWrite} from '../../components/permissions/WriteGuard';
import {useQuery} from '@tanstack/react-query';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useToast} from '../../context/ToastContext';
import {usePageTitle} from '../../context/PageTitleContext';
import {
    AuditLogCompact,
    EAuditLogEntityOperation,
    EAuditLogSeverity,
    EAuditLogType,
    IAuditLog
} from '../../models/audit-log.model';
import {DiffEditor} from '@monaco-editor/react';
import {useTheme} from '../../context/ThemeContext';

import {fetchWithAuth} from '../../utils/api';
import {useTranslation} from 'react-i18next';
import {auditLogTypeToLabel} from '../../utils/utils.ts';
import AuditLogHelp from '../documentation/AuditLogHelp';
import {getAuditOperationColor, getAuditSeverityColor, getAuditTypeColor} from "../../utils/color-utils.ts";

interface Page<T> {
    content: T[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}

const fetchAuditLogs = async (page: number, size: number, filters: any): Promise<Page<AuditLogCompact>> => {
    const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
        sort: 'timestamp,desc'
    });
    if (filters.user) params.append('user', filters.user);
    if (filters.type && filters.type !== 'ALL') params.append('type', filters.type);
    if (filters.severity && filters.severity !== 'ALL') params.append('severity', filters.severity);
    if (filters.operation && filters.operation !== 'ALL') params.append('operation', filters.operation);
    if (filters.collection) params.append('collection', filters.collection);

    const response = await fetchWithAuth(`/audit-logs?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Network response was not ok: Status ' + response.statusText.toString() + ', ' + response.status.toString() + ', ' + response.url.toString());
    }
    return response.json();
};

const fetchAuditLog = async (id: string): Promise<IAuditLog> => {
    const response = await fetchWithAuth(`/audit-logs/${id}`);
    if (!response.ok) {
        throw new Error('Network response was not ok: Status ' + response.statusText.toString() + ', ' + response.status.toString() + ', ' + response.url.toString());
    }
    return response.json();
};

const deleteAuditLogs = async (ids: string[]) => {
    const response = await fetchWithAuth(`/audit-logs?id=${ids.join('&id=')}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Network response was not ok: Status ' + response.statusText.toString() + ', ' + response.status.toString() + ', ' + response.url.toString());
    }
};

const AuditLog = () => {
    const canDelete = useCanWrite('PERM_AUDIT_DELETE');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);
    const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
    const [filterUser, setFilterUser] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
    const [filterOperation, setFilterOperation] = useState<string>('ALL');
    const [filterCollection, setFilterCollection] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [debouncedFilterUser, setDebouncedFilterUser] = useState('');
    const [debouncedFilterCollection, setDebouncedFilterCollection] = useState('');
    const {showToast} = useToast();
    const {appearance, codeFont} = useTheme();
    const {t} = useTranslation();

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedFilterUser(filterUser);
        }, 500);
        return () => clearTimeout(handler);
    }, [filterUser]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedFilterCollection(filterCollection);
        }, 500);
        return () => clearTimeout(handler);
    }, [filterCollection]);

    const {data: pageData, isLoading, refetch} = useQuery({
        queryKey: ['audit-logs', page, pageSize, debouncedFilterUser, filterType, filterSeverity, filterOperation, debouncedFilterCollection],
        queryFn: () => fetchAuditLogs(page, pageSize, {
            user: debouncedFilterUser,
            type: filterType,
            severity: filterSeverity,
            operation: filterOperation,
            collection: debouncedFilterCollection
        }),
    });

    const logs = pageData?.content || [];
    const totalElements = pageData?.page?.totalElements || 0;
    const totalPages = pageData?.page?.totalPages || 0;

    // Reset to page 0 when filters change
    useEffect(() => {
        setPage(0);
    }, [debouncedFilterUser, filterType, filterSeverity, filterOperation, debouncedFilterCollection]);

    const {data: selectedLog, isLoading: isLoadingDetail} = useQuery({
        queryKey: ['audit-log', selectedLogId],
        queryFn: () => fetchAuditLog(selectedLogId!),
        enabled: !!selectedLogId,
    });

    usePageTitle(t('ptitle_audit_log', 'Audit Log'));

    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked && logs) {
            setSelectedIds(logs.map(l => l.id));
        } else {
            setSelectedIds([]);
        }
    }, [logs]);

    const handleSelectOne = useCallback((id: string, checked: boolean) => {
        setSelectedIds(prev =>
            checked ? [...prev, id] : prev.filter(selectedId => selectedId !== id)
        );
    }, []);

    const handleDeleteSelected = useCallback(() => {
        if (selectedIds.length === 0) {
            showToast('Please select at least one log to delete', 'error');
            return;
        }
        setDeleteDialogOpen(true);
    }, [selectedIds.length, showToast]);

    const confirmDelete = useCallback(async () => {
        try {
            await deleteAuditLogs(selectedIds);
            showToast('Logs deleted successfully', 'success');
            setSelectedIds([]);
            setDeleteDialogOpen(false);
            refetch();
        } catch (error) {
            console.error(error);
            showToast('Failed to delete logs', 'error');
        }
    }, [selectedIds, showToast, refetch]);

    const handleExportSelected = () => {
        if (selectedIds.length === 0) {
            showToast('Please select at least one log to export', 'error');
            return;
        }
        const selectedLogs = logs?.filter(l => selectedIds.includes(l.id));
        const blob = new Blob([JSON.stringify(selectedLogs, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const dateString = date.toISOString().split('T')[0];
        const timeString = date.toTimeString().split(' ')[0].replace(/:/g, '-');
        a.download = `audit-logs-${dateString}-${timeString}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Use refs for toolbar actions
    const handleDeleteSelectedRef = useRef(handleDeleteSelected);
    const handleExportSelectedRef = useRef(handleExportSelected);

    useEffect(() => {
        handleDeleteSelectedRef.current = handleDeleteSelected;
        handleExportSelectedRef.current = handleExportSelected;
    }, [handleDeleteSelected, handleExportSelected]);

    useToolbar([
        {
            id: 'refresh',
            label: t('btn_refresh', 'Refresh'),
            icon: RefreshCw,
            onClick: () => refetch(),
            isLoading: isLoading
        },
        {
            id: 'filter', label: t('btn_filter', 'Filter'), icon: Filter, onClick: () => {
            },
            customComponent: (
                <Popover.Root>
                    <Popover.Trigger>
                        <Button variant="soft">
                            <Filter className="w-4 h-4"/>
                            {t('btn_filter', 'Filter')}
                            {(filterUser || filterType !== 'ALL' || filterSeverity !== 'ALL' || filterOperation !== 'ALL' || filterCollection) &&
                                <Badge color="blue" variant="solid" radius="full"
                                       style={{width: 6, height: 6, padding: 0}}/>}
                        </Button>
                    </Popover.Trigger>
                    <Popover.Content style={{width: 350}}>
                        <Flex direction="column" gap="3">
                            <Box>
                                <Text size="2" mb="1" weight="bold">{t('lbl_user', 'User')}</Text>
                                <TextField.Root value={filterUser} onChange={(e) => setFilterUser(e.target.value)}
                                                placeholder={t('ph_filter_user', 'Filter by user...')}/>
                            </Box>
                            <Box>
                                <Text size="2" mb="1" weight="bold">{t('lbl_type', 'Type')}</Text>
                                <Select.Root value={filterType} onValueChange={setFilterType}>
                                    <Select.Trigger style={{width: '100%'}} placeholder={t('lbl_all', 'All')}/>
                                    <Select.Content>
                                        <Select.Item value="ALL">{t('lbl_all', 'All')}</Select.Item>
                                        {Object.keys(EAuditLogType).map(type => (
                                            <Select.Item key={type}
                                                         value={type}>{auditLogTypeToLabel(type as EAuditLogType)}</Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            </Box>
                            <Box>
                                <Text size="2" mb="1" weight="bold">{t('lbl_severity', 'Severity')}</Text>
                                <Select.Root value={filterSeverity} onValueChange={setFilterSeverity}>
                                    <Select.Trigger style={{width: '100%'}} placeholder={t('lbl_all', 'All')}/>
                                    <Select.Content>
                                        <Select.Item value="ALL">{t('lbl_all', 'All')}</Select.Item>
                                        {Object.keys(EAuditLogSeverity).map(severity => (
                                            <Select.Item key={severity} value={severity}>{severity}</Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            </Box>
                            <Box>
                                <Text size="2" mb="1" weight="bold">{t('lbl_operation', 'Operation')}</Text>
                                <Select.Root value={filterOperation} onValueChange={setFilterOperation}>
                                    <Select.Trigger style={{width: '100%'}} placeholder={t('lbl_all', 'All')}/>
                                    <Select.Content>
                                        <Select.Item value="ALL">{t('lbl_all', 'All')}</Select.Item>
                                        {Object.keys(EAuditLogEntityOperation).map(op => (
                                            <Select.Item key={op} value={op}>{op}</Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            </Box>
                            <Box>
                                <Text size="2" mb="1" weight="bold">{t('lbl_collection', 'Collection')}</Text>
                                <TextField.Root value={filterCollection}
                                                onChange={(e) => setFilterCollection(e.target.value)}
                                                placeholder={t('ph_filter_collection', 'Filter by collection...')}/>
                            </Box>
                            <Flex justify="end" gap="2" mt="2">
                                <Button variant="ghost" onClick={() => {
                                    setFilterUser('');
                                    setFilterType('ALL');
                                    setFilterSeverity('ALL');
                                    setFilterOperation('ALL');
                                    setFilterCollection('');
                                }}>
                                    {t('btn_clear_filters', 'Clear Filters')}
                                </Button>
                            </Flex>
                        </Flex>
                    </Popover.Content>
                </Popover.Root>
            )
        },
        {
            id: 'export',
            label: t('btn_export_selected', 'Export Selected'),
            color: 'amber',
            icon: Download,
            onClick: () => handleExportSelectedRef.current()
        },
        {
            id: 'delete',
            label: t('btn_delete_selected', 'Delete Selected'),
            icon: Trash2,
            variant: 'solid',
            onClick: () => handleDeleteSelectedRef.current(),
            color: 'ruby',
            disabled: !canDelete,
        },
        {
            id: 'help',
            label: t('btn_help', 'Help'),
            icon: CircleHelp,
            color: "sky",
            onClick: () => setHelpDialogOpen(true)
        },
    ]);

    const allSelected = logs && logs.length > 0 && selectedIds.length === logs.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < (logs?.length || 0);

    const getTypeIcon = (type: EAuditLogType) => {
        switch (type) {
            case EAuditLogType.ENTITY_CHANGE:
                return <Pen size={12}/>;
            case EAuditLogType.ENTITY_VERSION:
                return <FileText size={12}/>;
            case EAuditLogType.AUTHORIZATION:
                return <UserRoundCog size={12}/>;
            case EAuditLogType.USER_ACTION:
                return <User size={12}/>;
            case EAuditLogType.SYSTEM_EVENT:
                return <Server size={12}/>;
            case EAuditLogType.DEPLOYMENT:
                return <CloudUpload size={12}/>;
            case EAuditLogType.BACKUP:
                return <DatabaseBackup size={12}/>;
            case EAuditLogType.RESTORE:
                return <DatabaseZap size={12}/>;
            default:
                return <Info size={12}/>;
        }
    }

    const getSeverityIcon = (severity: EAuditLogSeverity) => {
        switch (severity) {
            case EAuditLogSeverity.SUCCESS:
                return <CheckCircle size={12}/>;
            case EAuditLogSeverity.INFO:
                return <Info size={12}/>;
            case EAuditLogSeverity.WARNING:
                return <AlertTriangle size={12}/>;
            case EAuditLogSeverity.ERROR:
                return <XCircle size={12}/>;
        }
    }

    const getOperationIcon = (operation: EAuditLogEntityOperation) => {
        switch (operation) {
            case EAuditLogEntityOperation.CREATE:
                return <Plus size={12}/>;
            case EAuditLogEntityOperation.UPDATE:
                return <PencilLine size={12}/>;
            case EAuditLogEntityOperation.BACKUP:
                return <DatabaseBackup size={12}/>;
            case EAuditLogEntityOperation.RESTORE:
                return <DatabaseZap size={12}/>;
            case EAuditLogEntityOperation.DELETE:
                return <Trash size={12}/>;
            case EAuditLogEntityOperation.EXECUTE:
                return <Play size={12}/>;
            case EAuditLogEntityOperation.LOCK:
                return <LockIcon size={12}/>;
            case EAuditLogEntityOperation.UNLOCK:
                return <Unlock size={12}/>;
            case EAuditLogEntityOperation.ITEM_ADD:
                return <PackagePlus size={12}/>;
            case EAuditLogEntityOperation.ITEM_DELETE:
                return <PackageMinus size={12}/>;
            case EAuditLogEntityOperation.UNDEFINED:
                return <Info size={12}/>;
            default:
                return <Info size={12}/>;
        }
    }

    return (
        <Card size="4" className="w-full shadow-lg">

            <Flex direction="column" mb="2">
                <Flex direction="row" gap="2">
                    <Activity size={32} color="var(--accent-11)"/>
                    <Text size="5" weight="bold">
                  <span
                      className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                  {t('lbl_audit_log', 'Audit Log')}
                  </span>
                    </Text>
                </Flex>
                <Text size="2"
                      color="gray">{t('lbl_audit_log_desc', 'Browse and analyze Audit log trail')}</Text>
            </Flex>

            {isLoading && (
                <div className="mb-4">
                    <Progress/>
                </div>
            )}

            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={handleSelectAll}
                                {...(someSelected && {'data-state': 'indeterminate'})}
                            />
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Timestamp</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Severity</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Collection / Status</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Operation</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {logs && logs.length > 0 ? (
                        logs.map((log) => (
                            <Table.Row key={log.id} className="hover:bg-[var(--accent-2)] cursor-pointer"
                                       onClick={(e) => {
                                           // Prevent opening detail when clicking checkbox
                                           if ((e.target as HTMLElement).closest('button[role="checkbox"]')) return;
                                           setSelectedLogId(log.id);
                                           setDetailDialogOpen(true);
                                       }}>
                                <Table.Cell>
                                    <Checkbox
                                        checked={selectedIds.includes(log.id)}
                                        onCheckedChange={(checked) => handleSelectOne(log.id, checked === true)}
                                    />
                                </Table.Cell>
                                <Table.Cell>{new Date(log.timestamp).toLocaleString()}</Table.Cell>
                                <Table.Cell>
                                    <Badge color={getAuditTypeColor(log.type)}>
                                        {getTypeIcon(log.type)}
                                        {auditLogTypeToLabel(log.type)}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge color={getAuditSeverityColor(log.severity)}>
                                        {getSeverityIcon(log.severity)}
                                        {log.severity}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>{log.userLogin || '-'}</Table.Cell>
                                <Table.Cell>{log.collectionName || '-'}</Table.Cell>
                                <Table.Cell>
                                    <Badge
                                        color={getAuditOperationColor(log.operation || EAuditLogEntityOperation.UNDEFINED)}>
                                        {getOperationIcon(log.operation || EAuditLogEntityOperation.UNDEFINED)}
                                        {log.operation}
                                    </Badge>
                                </Table.Cell>
                            </Table.Row>
                        ))
                    ) : (
                        !isLoading && (
                            <Table.Row>
                                <Table.Cell colSpan={7} className="text-center text-[var(--gray-11)]">
                                    No audit logs found
                                </Table.Cell>
                            </Table.Row>
                        )
                    )}
                </Table.Body>
            </Table.Root>

            <Flex justify="between" align="center" mt="4">
                <Flex gap="3" align="center">
                    <Text size="1" color="gray">
                        {t('lbl_total', 'Total')}: {totalElements}
                    </Text>
                    <Select.Root value={pageSize.toString()} onValueChange={(v) => {
                        setPageSize(parseInt(v));
                        setPage(0);
                    }}>
                        <Select.Trigger variant="ghost"/>
                        <Select.Content>
                            <Select.Item value="10">10</Select.Item>
                            <Select.Item value="20">20</Select.Item>
                            <Select.Item value="50">50</Select.Item>
                            <Select.Item value="100">100</Select.Item>
                        </Select.Content>
                    </Select.Root>
                </Flex>
                <Flex gap="2" align="center">
                    <Button
                        variant="soft"
                        size="1"
                        disabled={page === 0 || isLoading}
                        onClick={() => setPage(page - 1)}
                    >
                        {t('btn_prev', 'Prev')}
                    </Button>
                    <Text size="1" weight="bold">
                        {page + 1} / {totalPages || 1}
                    </Text>
                    <Button
                        variant="soft"
                        size="1"
                        disabled={page >= totalPages - 1 || isLoading}
                        onClick={() => setPage(page + 1)}
                    >
                        {t('btn_next', 'Next')}
                    </Button>
                </Flex>
            </Flex>

            <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <Dialog.Content style={{maxWidth: 450}}>
                    <Dialog.Title>Delete Selected Logs</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        Are you sure you want to delete {selectedIds.length} selected
                        log{selectedIds.length !== 1 ? 's' : ''}?
                        This action cannot be undone.
                    </Dialog.Description>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                <ArrowBigLeft className="w-5 h-5"/>
                                Back
                            </Button>
                        </Dialog.Close>
                        <Button variant="solid" color="red" onClick={confirmDelete}>
                            <Trash2 className="w-5 h-5"/>
                            Delete
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            <Dialog.Root open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                <Dialog.Content style={{maxWidth: '90vw', height: '90vh', display: 'flex', flexDirection: 'column'}}>
                    <Dialog.Title>Audit Log Detail</Dialog.Title>

                    {isLoadingDetail && (
                        <div className="mb-4">
                            <Progress/>
                        </div>
                    )}

                    {selectedLog && !isLoadingDetail && (
                        <Flex direction="column" gap="4" style={{flex: 1, overflow: 'hidden'}}>
                            <Flex gap="4" wrap="wrap">
                                <Text size="2" color="gray">Timestamp: <Text weight="bold"
                                                                             color="gray">{new Date(selectedLog.timestamp).toLocaleString()}</Text></Text>
                                <Text size="2" color="gray">User: <Text weight="bold"
                                                                        color="gray">{selectedLog.userLogin || '-'}</Text></Text>
                                <Text size="2" color="gray">Type: <Badge
                                    color="gray">{auditLogTypeToLabel(selectedLog.type)}</Badge></Text>
                                <Text size="2" color="gray">Severity: <Badge
                                    color={getAuditSeverityColor(selectedLog.severity)}>{selectedLog.severity}</Badge></Text>
                                <Text size="2" color="gray">Operation: <Badge
                                    color={getAuditOperationColor(selectedLog.operation || EAuditLogEntityOperation.UNDEFINED)}>{selectedLog.operation}</Badge></Text>
                                <Text size="2" color="gray">Collection: <Text weight="bold"
                                                                              color="gray">{selectedLog.collectionName || '-'}</Text></Text>
                            </Flex>

                            <Flex style={{
                                flex: 1,
                                border: '1px solid var(--gray-6)',
                                borderRadius: 'var(--radius-2)',
                                overflow: 'hidden'
                            }}>
                                <DiffEditor
                                    original={JSON.stringify(selectedLog.originalData, null, 2)}
                                    modified={JSON.stringify(selectedLog.data, null, 2)}
                                    language="json"
                                    theme={appearance === 'dark' ? 'vs-dark' : 'light'}
                                    options={{
                                        readOnly: true,
                                        minimap: {enabled: false},
                                        renderSideBySide: true,
                                        fontFamily: codeFont,
                                        fontLigatures: true,
                                    }}
                                />
                            </Flex>
                        </Flex>
                    )}

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                <DoorOpen className="w-5 h-5"/>
                                Exit
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Help Dialog */}
            <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
                <Dialog.Content style={{maxWidth: 800}}>
                    <AuditLogHelp hideTitle/>
                    <Flex gap="3" mt="4" justify="end">
                        <Button variant="soft" color="gray" onClick={() => setHelpDialogOpen(false)}>
                            {t('btn_close', 'Close')}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Card>
    );
};

export default AuditLog;
