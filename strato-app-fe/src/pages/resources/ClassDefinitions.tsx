import {
    Badge,
    Box,
    Button,
    Card,
    Checkbox,
    Code,
    ContextMenu,
    Dialog,
    Flex,
    Popover,
    Progress,
    ScrollArea,
    Select,
    Table,
    Text
} from '@radix-ui/themes';
import {
    ArrowBigLeft,
    Braces,
    ChevronDown,
    ChevronUp,
    CircleQuestionMark,
    Download,
    Edit,
    Filter,
    Lock,
    Plus,
    RefreshCw,
    Trash2
} from 'lucide-react';
import {useTranslation} from "react-i18next";
import {useToolbar} from '../../context/ToolbarContext';
import {usePageTitle} from '../../context/PageTitleContext';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useToast} from '../../context/ToastContext';
import {EResourceType, ResourceCompact} from '../../models/resource.model';
import {resourceTypeToColor, resourceTypeToIcon, typeToLabel} from '../../utils/utils.ts';
import ResourcesHelp from '../documentation/ResourcesHelp';
import {deleteResource, fetchCategories, fetchResource, fetchResources} from "./api.ts";
import {useCanWrite} from '../../components/permissions/WriteGuard';


const ClassDefinitions = () => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [filterType, setFilterType] = useState<string>('ALL');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {showToast} = useToast();
    const queryClient = useQueryClient();
    const canWrite = useCanWrite('PERM_RESOURCE_WRITE');
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    const {data: pageData, isLoading, refetch} = useQuery({
        queryKey: ['resources', page, pageSize, filterType, filterCategory, sortConfig],
        queryFn: () => fetchResources(page, pageSize, {
            type: filterType,
            categoryId: filterCategory
        }, sortConfig),
    });

    const resources = pageData?.content || [];
    const totalElements = pageData?.page?.totalElements || 0;
    const totalPages = pageData?.page?.totalPages || 0;

    const {data: categories} = useQuery({
        queryKey: ['resource-categories'],
        queryFn: fetchCategories,
    });

    // Reset to page 0 when filters or sorting change
    useEffect(() => {
        setPage(0);
    }, [filterType, filterCategory, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({key, direction});
    };

    const renderSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>;
    };

    const deleteMutation = useMutation({
        mutationFn: deleteResource,
        onSuccess: () => {
            showToast('Resource deleted successfully', 'success');
            queryClient.invalidateQueries({queryKey: ['resources']});
        },
        onError: () => {
            showToast('Failed to delete resource', 'error');
        },
    });

    const handleSelectAll = (checked: boolean) => {
        if (checked && resources) {
            setSelectedIds(resources.map(r => r.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        }
    };

    const handleDeleteSelected = () => {
        if (selectedIds.length === 0) {
            showToast('Please select at least one resource to delete', 'error');
            return;
        }
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        for (const id of selectedIds) {
            await deleteMutation.mutateAsync(id);
        }
        setSelectedIds([]);
        setDeleteDialogOpen(false);
    };

    const handleExportAll = () => {
        if (!resources || resources.length === 0) {
            showToast('No resources to export', 'error');
            return;
        }
        const json = JSON.stringify(resources, null, 2);
        const blob = new Blob([json], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resources.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportOne = (resource: ResourceCompact) => {
        fetchResource(resource.id).then(res => {
            const json = JSON.stringify(res, null, 2);
            const blob = new Blob([json], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${res.name || res.id}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }).catch(err => {
            showToast('Failed to export resource: ' + err.message, 'error');
        }).finally(() => {
            showToast('Resource exported successfully', 'success');
        });
    };

    const allSelected = resources && resources.length > 0 && selectedIds.length === resources.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < (resources?.length || 0);

    // Refs for toolbar actions
    const handleDeleteSelectedRef = useRef(handleDeleteSelected);
    useEffect(() => {
        handleDeleteSelectedRef.current = handleDeleteSelected;
    }, [handleDeleteSelected]);

    const handleExportAllRef = useRef(handleExportAll);
    useEffect(() => {
        handleExportAllRef.current = handleExportAll;
    }, [resources]);

    usePageTitle(t('ptitle_resources', 'Resource Classes'));

    useToolbar([
        {
            id: 'new',
            label: t('btn_new', 'New'),
            icon: Plus,
            onClick: () => navigate('/resources/definitions/new'),
            variant: 'solid',
            disabled: !canWrite,
        },
        {
            id: 'refresh',
            label: t('btn_refresh', 'Refresh'),
            icon: RefreshCw,
            onClick: () => refetch(),
            isLoading: isLoading
        },
        {
            id: 'filter', label: t('btn_filter', 'Filter'), icon: Filter, onClick: () => {
            }, variant: 'outline',
            customComponent: (
                <Popover.Root>
                    <Popover.Trigger>
                        <Button variant="soft">
                            <Filter className="w-4 h-4"/>
                            {t('btn_filter', 'Filter')}
                            {(filterType !== 'ALL' || filterCategory !== 'ALL') &&
                                <Badge color="blue" variant="solid" radius="full"
                                       style={{width: 6, height: 6, padding: 0}}/>}
                        </Button>
                    </Popover.Trigger>
                    <Popover.Content style={{width: 300}}>
                        <Flex direction="column" gap="3">
                            <Box>
                                <Text size="2" mb="1" weight="bold">{t('lbl_type', 'Type')}</Text>
                                <Select.Root value={filterType} onValueChange={setFilterType}>
                                    <Select.Trigger style={{width: '100%'}} placeholder={t('lbl_all', 'All')}/>
                                    <Select.Content>
                                        <Select.Item value="ALL">{t('lbl_all', 'All')}</Select.Item>
                                        {Object.keys(EResourceType).map(type => (
                                            <Select.Item key={type} value={type}>
                                                <Flex gap="2" align="center">
                                                    <img src={resourceTypeToIcon(type)} alt={type} className="w-4 h-4"/>
                                                    {typeToLabel(type)}
                                                </Flex>
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            </Box>
                            <Box>
                                <Text size="2" mb="1" weight="bold">{t('lbl_category', 'Category')}</Text>
                                <Select.Root value={filterCategory} onValueChange={setFilterCategory}>
                                    <Select.Trigger style={{width: '100%'}} placeholder={t('lbl_all', 'All')}/>
                                    <Select.Content>
                                        <Select.Item value="ALL">{t('lbl_all', 'All')}</Select.Item>
                                        {categories?.map(cat => (
                                            <Select.Item key={cat.id} value={cat.id}>
                                                <Badge color={(cat.color) as any || 'gray'}>
                                                    {cat.name}
                                                </Badge>
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            </Box>
                            <Flex justify="end" gap="2" mt="2">
                                <Button variant="ghost" onClick={() => {
                                    setFilterType('ALL');
                                    setFilterCategory('ALL');
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
            label: t('btn_export_all', 'Export All'),
            icon: Download,
            onClick: () => handleExportAllRef.current(),
            disabled: true
        },
        {
            id: 'delete',
            label: t('btn_delete_selected', 'Delete Selected'),
            icon: Trash2,
            variant: 'solid',
            onClick: () => handleDeleteSelectedRef.current(),
            color: 'red',
            disabled: !canWrite,
        },
        {
            id: 'help',
            label: t('btn_help', 'Help'),
            icon: CircleQuestionMark,
            onClick: () => setHelpDialogOpen(true),
            color: 'sky'
        },
    ]);

    return (
        <Card size="4" className="w-full shadow-lg">
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
                        <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="cursor-pointer hover:bg-(--gray-3)"
                                                onClick={() => handleSort('name')}>
                            <Flex align="center" gap="1">
                                {t('thead_name', 'Name')}
                                {renderSortIcon('name')}
                            </Flex>
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="cursor-pointer hover:bg-(--gray-3)"
                                                onClick={() => handleSort('type')}>
                            <Flex align="center" gap="1">
                                {t('thead_type', 'Type')}
                                {renderSortIcon('type')}
                            </Flex>
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="cursor-pointer hover:bg-(--gray-3)"
                                                onClick={() => handleSort('resourceCategory')}>
                            <Flex align="center" gap="1">
                                {t('thead_category', 'Category')}
                                {renderSortIcon('resourceCategory')}
                            </Flex>
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="cursor-pointer hover:bg-(--gray-3)"
                                                onClick={() => handleSort('id')}>
                            <Flex align="center" gap="1">
                                {t('thead_id', 'ID')}
                                {renderSortIcon('id')}
                            </Flex>
                        </Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {resources && resources.length > 0 ? (
                        resources.map((resource) => (
                            <ContextMenu.Root key={resource.id}>
                                <ContextMenu.Trigger>
                                    <Table.Row className="hover:bg-(--accent-2)"
                                               onClick={() => navigate(`/resources/definitions/${resource.id}`)}>
                                        <Table.Cell>
                                            <Checkbox
                                                checked={selectedIds.includes(resource.id)}
                                                onCheckedChange={(checked) => handleSelectOne(resource.id, checked === true)}
                                            />
                                        </Table.Cell>
                                        <Table.Cell>
                                            {resource.icon && (
                                                <img
                                                    src={resource.icon.includes('/') ? `/assets/${resource.icon}` : `/assets/azure/${resource.icon}`}
                                                    alt={resource.name}
                                                    className="w-6 h-6"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            )}
                                        </Table.Cell>
                                        <Table.RowHeaderCell onClick={() => setSelectedIds([resource.id])}>
                                            <Flex direction="row" gap="2">
                                                <Text weight="medium">{resource.name}</Text>
                                                <Badge size="2" color="gray"
                                                       hidden={resource.abbreviation === null}>{resource.abbreviation}
                                                </Badge>
                                                {resource.isSystem ? (
                                                    <Badge color="amber" variant="soft" size="1">
                                                        <Lock size={12} style={{marginRight: 4}}/>
                                                    </Badge>
                                                ) : (
                                                    <></>
                                                )}
                                            </Flex>
                                        </Table.RowHeaderCell>
                                        <Table.Cell>
                                            <Badge variant="soft"
                                                   color={resourceTypeToColor(resource.type)}>{typeToLabel(resource.type)}</Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            {resource.resourceCategory && (
                                                <Badge color={(resource.resourceCategory.color) as any || 'gray'}>
                                                    {resource.resourceCategory.name}
                                                </Badge>
                                            )}
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Code variant='soft'>{resource.id}</Code>
                                        </Table.Cell>
                                    </Table.Row>
                                </ContextMenu.Trigger>
                                <ContextMenu.Content>
                                    <ContextMenu.Label>{resource.name}</ContextMenu.Label>
                                    <ContextMenu.Item disabled={!canWrite} onClick={() => navigate(`/resources/definitions/${resource.id}`)}>
                                        <Edit size={16}/>
                                        <b>{t('mit_edit', 'Edit')}</b>
                                    </ContextMenu.Item>
                                    <ContextMenu.Separator/>
                                    <ContextMenu.Item onClick={() => handleExportOne(resource)}>
                                        <Download size={16}/>
                                        <b>{t('mit_export_json', 'Export As JSON')}</b>
                                    </ContextMenu.Item>
                                    <ContextMenu.Item
                                        color="orange"
                                        disabled={!canWrite}
                                        onClick={() => navigate(`/resources/definitions/${resource.id}/json`)}>
                                        <Braces size={16}/>
                                        <b>{t('mit_edit_json', 'Edit as JSON')}</b>
                                    </ContextMenu.Item>
                                    <ContextMenu.Separator/>
                                    <ContextMenu.Item color="ruby" disabled={resource.isSystem || !canWrite} onClick={() => {
                                        setSelectedIds([resource.id]);
                                        setDeleteDialogOpen(true);
                                    }}>
                                        <Trash2 size={16}/>
                                        <b>{t('mit_delete', 'Delete')}</b>
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Root>
                        ))
                    ) : (
                        !isLoading && (
                            <Table.Row>
                                <Table.Cell colSpan={6} className="text-center text-[var(--gray-11)]">
                                    {t('lbl_no_resources_found', 'No resources found')}
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
                    <Dialog.Title>{t('lbl_delete_resources', 'Delete Resources')}</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        {t('lbl_confirm_delete_resources', `Are you sure you want to delete ${selectedIds.length} selected resource(s)?`, {length: selectedIds.length})}
                        {' '}{t('lbl_delete_confirmation', 'This action cannot be undone.')}
                    </Dialog.Description>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                <ArrowBigLeft className="w-5 h-5"/>
                                {t('btn_back', 'Back')}
                            </Button>
                        </Dialog.Close>
                        <Dialog.Close>
                            <Button variant="solid" color="red" onClick={confirmDelete}
                                    disabled={deleteMutation.isPending || !canWrite}>
                                <Trash2 className="w-5 h-5"/>
                                {t('btn_delete', 'Delete')}
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
                <Dialog.Content style={{maxWidth: 1400, maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
                    <Dialog.Title>{t('btn_help', 'Help')}</Dialog.Title>
                    <ScrollArea style={{flex: 1, minHeight: 0}} type="auto">
                        <ResourcesHelp hideTitle/>
                    </ScrollArea>
                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray" onClick={() => setHelpDialogOpen(false)}>
                                {t('btn_close', 'Close')}
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </Card>
    );
};

export default ClassDefinitions;
