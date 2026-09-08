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
    Progress,
    Select,
    Table,
    Text,
    TextField
} from '@radix-ui/themes';
import {ArrowBigLeft, Download, Edit, Plus, RefreshCw, Save, Trash2} from 'lucide-react';
import {useToolbar} from '../../context/ToolbarContext';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useRef, useState} from 'react';
import {IResourceCategory, IResourceCategoryCreate} from '../../models/resource-category.model';
import {useToast} from '../../context/ToastContext';
import {usePageTitle} from '../../context/PageTitleContext';
import {useTranslation} from 'react-i18next';
import {accentColors} from '../../context/ThemeContext';
import {DraggableDialogContent} from '../../components/system/DraggableDialogContent.tsx';
import {fetchCategories, createCategory, updateCategory, deleteCategory} from './api';
import {useCanWrite} from '../../components/permissions/WriteGuard';

const ClassCategories = () => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<IResourceCategory | null>(null);
    const [formName, setFormName] = useState('');
    const [formKey, setFormKey] = useState('');
    const [formColor, setFormColor] = useState<string>('blue');
    const [formDefaultProps, setFormDefaultProps] = useState<Record<string, string>>({});
    const [propsEditorOpen, setPropsEditorOpen] = useState(false);
    const { showToast } = useToast();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const canWrite = useCanWrite('PERM_RESOURCE_WRITE');

    const { data: categories, isLoading, refetch } = useQuery({
        queryKey: ['resource-categories'],
        queryFn: fetchCategories,
    });

    const createMutation = useMutation({
        mutationFn: createCategory,
        onSuccess: () => {
            showToast('Category created successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['resource-categories'] });
            resetForm();
            setCreateDialogOpen(false);
        },
        onError: () => {
            showToast('Failed to create category', 'error');
        },
    });

    const updateMutation = useMutation({
        mutationFn: updateCategory,
        onSuccess: () => {
            showToast('Category updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['resource-categories'] });
            resetForm();
            setEditDialogOpen(false);
        },
        onError: () => {
            showToast('Failed to update category', 'error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCategory,
        onSuccess: () => {
            showToast('Category deleted successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['resource-categories'] });
            setSelectedIds([]);
            setDeleteDialogOpen(false);
        },
        onError: () => {
            showToast('Failed to delete category', 'error');
        },
    });

    const resetForm = () => {
        setFormName('');
        setFormKey('');
        setFormColor('blue');
        setEditingCategory(null);
        setFormDefaultProps({});
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked && categories) {
            setSelectedIds(categories.map(c => c.id));
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

    const handleCreate = () => {
        resetForm();
        setCreateDialogOpen(true);
    };

    const handleEdit = (category: IResourceCategory) => {
        setEditingCategory(category);
        setFormName(category.name);
        setFormKey(category.key);
        setFormColor(category.color || 'blue');
        setFormDefaultProps(category.defaultProperties || {});
        setEditDialogOpen(true);
    };

    const handleDeleteSelected = () => {
        if (selectedIds.length === 0) {
            showToast('Please select at least one category to delete', 'error');
            return;
        }
        setDeleteDialogOpen(true);
    };

    const confirmCreate = () => {
        if (!formName || !formKey) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        // Build payload without undefined fields to satisfy TS and API expectations
        const payload: IResourceCategoryCreate = {
            name: formName,
            key: formKey,
            color: formColor,
            ...(formDefaultProps && Object.keys(formDefaultProps).length
                ? { defaultProperties: formDefaultProps }
                : {}),
        };
        createMutation.mutate(payload);
    };

    const confirmEdit = () => {
        if (!editingCategory || !formName || !formKey) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        updateMutation.mutate({ id: editingCategory.id, name: formName, key: formKey, color: formColor, defaultProperties: formDefaultProps });
    };

    const confirmDelete = async () => {
        for (const id of selectedIds) {
            await deleteMutation.mutateAsync(id);
        }
    };

    const handleDeleteSelectedRef = useRef(handleDeleteSelected);
    useEffect(() => {
        handleDeleteSelectedRef.current = handleDeleteSelected;
    }, [handleDeleteSelected]);

    const handleCreateRef = useRef(handleCreate);
    useEffect(() => {
        handleCreateRef.current = handleCreate;
    }, [handleCreate]);

    const allSelected = categories && categories.length > 0 && selectedIds.length === categories.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < (categories?.length || 0);

    usePageTitle(t('ptitle_resource_categories', 'Resource Categories'));

    useToolbar([
        { id: 'new', label: t('btn_new', 'New'), icon: Plus, onClick: () => handleCreateRef.current(), variant: 'solid', disabled: !canWrite },
        { id: 'refresh', label: t('btn_refresh', 'Refresh'), icon: RefreshCw, onClick: () => refetch(), isLoading: isLoading },
        {
            id: 'export', label: t('btn_export_all', 'Export All'), icon: Download, onClick: () => {
                if (!categories || categories.length === 0) {
                    showToast('No categories to export', 'error');
                    return;
                }
                const json = JSON.stringify(categories, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'resource-categories.json';
                a.click();
                URL.revokeObjectURL(url);
            },
        },
        { id: 'delete', label: t('btn_delete_selected', 'Delete Selected'), variant: 'solid', icon: Trash2, onClick: () => handleDeleteSelectedRef.current(), color: 'ruby', disabled: !canWrite },
    ]);

    // Color picker component
    const ColorPicker = ({ value, onChange }: { value: string; onChange: (color: string) => void }) => (
        <Flex wrap="wrap" gap="2">
            {accentColors.map((color) => (
                <Box
                    key={color}
                    onClick={() => onChange(color)}
                    className="cursor-pointer transition-transform hover:scale-110"
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: `var(--${color}-9)`,
                        border: value === color ? '3px solid var(--gray-12)' : '2px solid transparent',
                        boxShadow: value === color ? '0 0 0 2px var(--gray-1)' : 'none',
                    }}
                />
            ))}
        </Flex>
    );

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
                        <Table.ColumnHeaderCell>{t('thead_key', 'Key')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_color', 'Color')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_id', 'ID')}</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {categories && categories.length > 0 ? (
                        categories.map((category) => (
                            <ContextMenu.Root key={category.id}>
                                <ContextMenu.Trigger>
                                    <Table.Row className="hover:bg-(--accent-2)" onClick={() => handleEdit(category)}>
                                        <Table.Cell>
                                            <Checkbox
                                                checked={selectedIds.includes(category.id)}
                                                onCheckedChange={(checked) => handleSelectOne(category.id, checked === true)}
                                            />
                                        </Table.Cell>

                                        <Table.RowHeaderCell onClick={() => setSelectedIds([category.id])}>
                                            <Text weight="medium">{category.name}</Text>
                                        </Table.RowHeaderCell>
                                        <Table.Cell onClick={() => setSelectedIds([category.id])}>
                                            <Code>{category.key}</Code>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Badge color={(category.color === 'strato' ? 'violet' : category.color) as any || 'gray'}>
                                                {category.color || 'none'}
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell onClick={() => setSelectedIds([category.id])}>
                                            <Code>{category.id}</Code>
                                        </Table.Cell>
                                    </Table.Row>
                                </ContextMenu.Trigger>
                                <ContextMenu.Content>
                                    <ContextMenu.Label>{category.name}</ContextMenu.Label>
                                    <ContextMenu.Item disabled={!canWrite} onClick={() => handleEdit(category)}>
                                        <Edit size={16} />
                                        <b>{t('mit_edit', 'Edit')}</b>
                                    </ContextMenu.Item>
                                    <ContextMenu.Item onClick={() => {
                                        const json = JSON.stringify(category, null, 2);
                                        const blob = new Blob([json], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${category.key || category.id}.json`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}>
                                        <Download size={16} />
                                        <b>{t('mit_export_json', 'Export As JSON')}</b>
                                    </ContextMenu.Item>
                                    <ContextMenu.Separator />
                                    <ContextMenu.Item color="ruby" disabled={!canWrite} onClick={() => {
                                        setSelectedIds([category.id]);
                                        setDeleteDialogOpen(true);
                                    }}>
                                        <Trash2 size={16} />
                                        <b>{t('mit_delete', 'Delete')}</b>
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Root>
                        ))
                    ) : (
                        !isLoading && (
                            <Table.Row>
                                <Table.Cell colSpan={5} className="text-center text-[var(--gray-11)]">
                                    {t('lbl_no_categories_found', 'No categories found')}
                                </Table.Cell>
                            </Table.Row>
                        )
                    )}
                </Table.Body>
            </Table.Root>

            {/* Create Dialog */}
            <Dialog.Root open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <Dialog.Content style={{ maxWidth: 500 }}>
                    <Dialog.Title>{t('lbl_new_category', 'New Category')}</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        {t('lbl_enter_category_details', 'Enter the details for the new resource category.')}
                    </Dialog.Description>

                    <Flex direction="column" gap="3">
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">{t('lbl_name', 'Name')}</Text>
                            <TextField.Root
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="e.g. Virtual Machines"
                            />
                        </Box>
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">{t('lbl_key', 'Key')}</Text>
                            <TextField.Root
                                value={formKey}
                                onChange={(e) => setFormKey(e.target.value)}
                                placeholder="e.g. VM"
                            />
                        </Box>
                        <Box>
                            <Text as="div" size="2" mb="2" weight="bold">{t('lbl_color', 'Color')}</Text>
                            <ColorPicker value={formColor} onChange={setFormColor} />
                        </Box>
                        <Box>
                            <Button variant="soft" onClick={() => setPropsEditorOpen(true)}>
                                {t('btn_category_properties', 'Category Properties')}
                            </Button>
                            {Object.keys(formDefaultProps || {}).length > 0 && (
                                <Text size="1" color="gray" as="div" mt="2">
                                    {Object.keys(formDefaultProps).length} properties defined
                                </Text>
                            )}
                        </Box>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                <ArrowBigLeft className="w-5 h-5" />
                                {t('btn_back', 'Back')}
                            </Button>
                        </Dialog.Close>
                        <Button variant="solid" onClick={confirmCreate} loading={createMutation.isPending} disabled={!canWrite}>
                            <Save className="w-5 h-5" />
                            {t('btn_create', 'Create')}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Edit Dialog */}
            <Dialog.Root open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <Dialog.Content style={{ maxWidth: 500 }}>
                    <Dialog.Title>{t('lbl_edit_category', 'Edit Category')}</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        {t('lbl_update_category_details', 'Update the details for this resource category.')}
                    </Dialog.Description>

                    <Flex direction="column" gap="3">
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">{t('lbl_name', 'Name')}</Text>
                            <TextField.Root
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="e.g. Virtual Machines"
                            />
                        </Box>
                        <Box>
                            <Text as="div" size="2" mb="1" weight="bold">{t('lbl_key', 'Key')}</Text>
                            <TextField.Root
                                value={formKey}
                                onChange={(e) => setFormKey(e.target.value)}
                                placeholder="e.g. VM"
                            />
                        </Box>
                        <Box>
                            <Text as="div" size="2" mb="2" weight="bold">{t('lbl_color', 'Color')}</Text>
                            <ColorPicker value={formColor} onChange={setFormColor} />
                        </Box>
                        <Box>
                            <Button variant="soft" onClick={() => setPropsEditorOpen(true)}>
                                {t('btn_category_properties', 'Category Properties')}
                            </Button>
                            {Object.keys(formDefaultProps || {}).length > 0 && (
                                <Text size="1" color="gray" as="div" mt="2">
                                    {Object.keys(formDefaultProps).length} properties defined
                                </Text>
                            )}
                        </Box>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                <ArrowBigLeft className="w-5 h-5" />
                                {t('btn_back', 'Back')}
                            </Button>
                        </Dialog.Close>
                        <Button variant="solid" onClick={confirmEdit} loading={updateMutation.isPending} color="green" disabled={!canWrite}>
                            <Save className="w-5 h-5" />
                            {t('btn_save', 'Save')}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Category Properties Editor Dialog */}
            <Dialog.Root open={propsEditorOpen} onOpenChange={setPropsEditorOpen}>
                <Dialog.Content style={{ maxWidth: 640 }}>
                    <Dialog.Title>{t('lbl_category_properties', 'Category Properties')}</Dialog.Title>
                    <Dialog.Description size="2" mb="4">
                        {t('lbl_define_default_properties', 'Define default property types by JSON path (dot-separated).')}
                    </Dialog.Description>

                    <Flex direction="column" gap="3">
                        {Object.entries(formDefaultProps).map(([key, type]) => (
                            <Flex key={key} align="center" gap="2">
                                <TextField.Root
                                    value={key}
                                    onChange={(e) => {
                                        const newKey = e.target.value;
                                        setFormDefaultProps((prev) => {
                                            const entries = Object.entries(prev);
                                            const idx = entries.findIndex(([k]) => k === key);
                                            if (idx === -1) return prev;
                                            const newEntries = entries.slice();
                                            // Prevent duplicate keys
                                            if (newEntries.some(([k]) => k === newKey)) return prev;
                                            newEntries[idx] = [newKey, type];
                                            return Object.fromEntries(newEntries);
                                        });
                                    }}
                                    placeholder="spec.path.to.field"
                                />
                                <Select.Root value={type} onValueChange={(val) => {
                                    setFormDefaultProps((prev) => ({ ...prev, [key]: val }));
                                }}>
                                    <Select.Trigger />
                                    <Select.Content>
                                        <Select.Item value="string">string</Select.Item>
                                        <Select.Item value="integer">integer</Select.Item>
                                        <Select.Item value="array">array</Select.Item>
                                        <Select.Item value="boolean">boolean</Select.Item>
                                    </Select.Content>
                                </Select.Root>
                                <Button color="ruby" variant="soft" onClick={() => {
                                    setFormDefaultProps((prev) => {
                                        const copy = { ...prev };
                                        delete copy[key];
                                        return copy;
                                    });
                                }}>
                                    {t('btn_remove', 'Remove')}
                                </Button>
                            </Flex>
                        ))}

                        <Button variant="outline" onClick={() => {
                            // Add a new empty row with a unique placeholder key
                            setFormDefaultProps((prev) => {
                                let base = 'new.property';
                                let key = base;
                                let i = 1;
                                while (prev[key]) { key = `${base}.${i++}`; }
                                return { ...prev, [key]: 'string' };
                            });
                        }}>
                            {t('btn_add_property', 'Add Property')}
                        </Button>
                    </Flex>

                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                <ArrowBigLeft className="w-5 h-5" />
                                {t('btn_back', 'Back')}
                            </Button>
                        </Dialog.Close>
                        <Dialog.Close>
                            <Button variant="solid">
                                <Save className="w-5 h-5" />
                                {t('btn_done', 'Done')}
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {/* Delete Dialog */}
            <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DraggableDialogContent maxWidth="450px" title={t('lbl_delete_categories', 'Delete Categories')}>
                    <Dialog.Description size="2" mb="4">
                        {t('lbl_confirm_delete_categories', `Are you sure you want to delete ${selectedIds.length} selected category(ies)?`)}
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
                            <Button variant="solid" color="red" onClick={confirmDelete} disabled={deleteMutation.isPending || !canWrite}>
                                <Trash2 className="w-5 h-5" />
                                {t('btn_delete', 'Delete')}
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </DraggableDialogContent>
            </Dialog.Root>
        </Card>
    );
};

export default ClassCategories;
