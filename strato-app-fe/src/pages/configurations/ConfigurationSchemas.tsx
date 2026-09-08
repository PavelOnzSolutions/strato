import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  ContextMenu,
  Dialog,
  Flex,
  Progress,
  Table,
  Text
} from '@radix-ui/themes';
import {useToolbar} from '../../context/ToolbarContext';
import {ArrowBigLeft, Copy, Download, Edit, HelpCircle, Plus, RefreshCw, Trash2, Upload} from 'lucide-react';
import {usePageTitle} from '../../context/PageTitleContext';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {fetchWithAuth} from '../../utils/api';
import {useToast} from '../../context/ToastContext';
import {IConfigurationSchema} from '../../models/configuration.model';
import {FLAVOR_LABELS} from '../../constants/flavors';
import {useTranslation} from 'react-i18next';
import {DraggableDialogContent} from '../../components/system/DraggableDialogContent.tsx';
import {CloneDialog} from './components/modals/CloneDialog.tsx';
import ConfigurationSchemasHelp from '../documentation/ConfigurationSchemasHelp.tsx';
import {cloneSchema, deleteSchema, fetchSchemas} from "./api.ts";
import {useCanWrite} from '../../components/permissions/WriteGuard';

const ConfigurationSchemas = () => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
    const [cloneTarget, setCloneTarget] = useState<IConfigurationSchema | null>(null);
    const [cloneName, setCloneName] = useState('');
    const [helpDialogOpen, setHelpDialogOpen] = useState(false);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const canWrite = useCanWrite('PERM_CONFIG_SCHEMA_WRITE');

    const { data: schemas, isLoading, refetch } = useQuery({
        queryKey: ['configuration-schemas'],
        queryFn: fetchSchemas,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteSchema,
        onSuccess: () => {
            showToast('Schema deleted successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['configuration-schemas'] });
        },
        onError: () => {
            showToast('Failed to delete schema', 'error');
        },
    });

    const cloneMutation = useMutation({
        mutationFn: ({ id, name }: { id: string, name: string }) => cloneSchema(id, name),
        onSuccess: (newSchema) => {
            showToast('Schema cloned successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['configuration-schemas'] });
            setCloneDialogOpen(false);
            navigate(`/configurations/schemas/${newSchema.id}`);
        },
        onError: () => showToast('Failed to clone schema', 'error'),
    });

    const handleSelectAll = (checked: boolean) => {
        if (checked && schemas) {
            setSelectedIds(schemas.map(s => s.id));
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

    const confirmDelete = async () => {
        for (const id of selectedIds) {
            await deleteMutation.mutateAsync(id);
        }
        setSelectedIds([]);
        setDeleteDialogOpen(false);
    };

    const allSelected = schemas && schemas.length > 0 && selectedIds.length === schemas.length;
    const someSelected = selectedIds.length > 0 && selectedIds.length < (schemas?.length || 0);

    usePageTitle(t('ptitle_configuration_schemas', 'Configuration Schemas'));

    const handleExportSingle = (s: IConfigurationSchema) => {
        const json = JSON.stringify(s, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${s.name}.schema.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportBatch = async () => {
        if (selectedIds.length === 0) return;
        const r = await fetchWithAuth('/configuration-schemas/export-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selectedIds),
        });
        if (!r.ok) {
            showToast(t('msg_export_error', 'Export failed'), 'error');
            return;
        }
        const data = await r.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `schemas-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    useToolbar([
        { id: 'new', label: t('btn_new', 'New'), icon: Plus, onClick: () => navigate('/configurations/schemas/new'), variant: 'solid', disabled: !canWrite },
        { id: 'import', label: t('btn_import', 'Import'), icon: Upload, onClick: () => navigate('/configurations/schemas/import'), disabled: !canWrite },
        ...(selectedIds.length > 0 ? [{ id: 'export-selected', label: t('btn_export_selected', 'Export selected'), icon: Download, onClick: handleExportBatch }] : []),
        { id: 'refresh', label: t('btn_refresh', 'Refresh'), icon: RefreshCw, onClick: () => refetch(), isLoading: isLoading },
        { id: 'help', label: t('btn_help', 'Help'), icon: HelpCircle, onClick: () => setHelpDialogOpen(true), color: 'sky' },
    ]);

    return (
        <Card size="4" className="w-full shadow-lg">
            {isLoading && <Progress className="mb-4" />}

            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>
                            <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} {...(someSelected && { 'data-state': 'indeterminate' })} />
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_name', 'Name')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_flavor', 'Flavor')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_sections', 'Sections')}</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {schemas?.map((schema) => (
                        <ContextMenu.Root key={schema.id}>
                            <ContextMenu.Trigger>
                                <Table.Row className="hover:bg-[var(--accent-2)]" onClick={() => navigate(`/configurations/schemas/${schema.id}`)}>
                                    <Table.Cell>
                                        <Checkbox checked={selectedIds.includes(schema.id)} onCheckedChange={(checked) => handleSelectOne(schema.id, checked === true)} />
                                    </Table.Cell>
                                    <Table.RowHeaderCell>
                                        <Text weight="medium">{schema.name}</Text>
                                    </Table.RowHeaderCell>
                                    <Table.Cell>
                                        <Badge color="blue" variant="soft" size="1">{FLAVOR_LABELS[schema.flavor]}</Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Badge color="gray" variant="soft" size="1" radius="full">{schema.sections?.length ?? 0}</Badge>
                                    </Table.Cell>
                                </Table.Row>
                            </ContextMenu.Trigger>
                            <ContextMenu.Content>
                                <ContextMenu.Item disabled={!canWrite} onClick={() => navigate(`/configurations/schemas/${schema.id}`)}>
                                    <Edit size={16} /> <b>{t('mit_edit', 'Edit')}</b>
                                </ContextMenu.Item>
                                <ContextMenu.Item disabled={!canWrite} onClick={() => {
                                    setCloneTarget(schema);
                                    setCloneName(`${schema.name} (Copy)`);
                                    setCloneDialogOpen(true);
                                }}>
                                    <Copy size={16} /> <b>{t('mit_clone', 'Clone')}</b>
                                </ContextMenu.Item>
                                <ContextMenu.Item onClick={() => handleExportSingle(schema)}>
                                    <Download size={16} /> <b>{t('mit_export', 'Export')}</b>
                                </ContextMenu.Item>
                                <ContextMenu.Separator />
                                <ContextMenu.Item color="ruby" disabled={!canWrite} onClick={() => { setSelectedIds([schema.id]); setDeleteDialogOpen(true); }}>
                                    <Trash2 size={16} /> <b>{t('mit_delete', 'Delete')}</b>
                                </ContextMenu.Item>
                            </ContextMenu.Content>
                        </ContextMenu.Root>
                    ))}
                </Table.Body>
            </Table.Root>

            <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DraggableDialogContent maxWidth="450px" title={t('lbl_delete_schemas', 'Delete Schemas')}>
                    <Text size="2" mb="4">{t('lbl_confirm_delete_schemas', `Are you sure you want to delete ${selectedIds.length} selected schema(s)?`)}</Text>
                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close><Button variant="soft" color="gray"><ArrowBigLeft size={16} /> {t('btn_back', 'Back')}</Button></Dialog.Close>
                        <Button variant="solid" color="red" onClick={confirmDelete} disabled={!canWrite}><Trash2 size={16} /> {t('btn_delete', 'Delete')}</Button>
                    </Flex>
                </DraggableDialogContent>
            </Dialog.Root>

            <CloneDialog
                open={cloneDialogOpen}
                onOpenChange={setCloneDialogOpen}
                name={cloneName}
                onNameChange={setCloneName}
                onConfirm={() => {
                    if (cloneTarget && cloneName.trim()) {
                        cloneMutation.mutate({ id: cloneTarget.id, name: cloneName.trim() });
                    }
                }}
                isPending={cloneMutation.isPending}
            />

            <Dialog.Root open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
                <DraggableDialogContent title={t('dlg_help_title', 'Configuration Schemas Documentation')} maxWidth="1000px" maxHeight="90vh">
                    <Box px="4" pb="4">
                        <ConfigurationSchemasHelp />
                    </Box>
                </DraggableDialogContent>
            </Dialog.Root>
        </Card>
    );
};

export default ConfigurationSchemas;
