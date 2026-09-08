import React, {useState} from 'react';
import {Badge, Box, Button, Card, ContextMenu, Dialog, Flex, Progress, Select, Table, Text, Tooltip} from '@radix-ui/themes';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {ArrowBigLeft, Copy, Edit, Plus, RefreshCw, Trash2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {ISectionCatalogEntry} from '../../models/section-catalog.model';
import {Flavor, FLAVOR_LABELS, FLAVORS} from '../../constants/flavors';
import {useToolbar} from '../../context/ToolbarContext';
import {usePageTitle} from '../../context/PageTitleContext';
import {useToast} from '../../context/ToastContext';
import {DraggableDialogContent} from '../../components/system/DraggableDialogContent';
import {SectionCatalogEditor} from './components/SectionCatalogEditor';
import {CloneSectionDialog} from './components/modals/CloneSectionDialog';

import {fetchCatalog, deleteCatalogEntry, cloneCatalogEntry} from './api';
import {useCanWrite, WriteGuard} from '../../components/permissions/WriteGuard';

const SectionCatalogList: React.FC = () => {
    const {t} = useTranslation();
    const {showToast} = useToast();
    const queryClient = useQueryClient();
    const [flavor, setFlavor] = useState<Flavor>('AZURE');
    const [editorOpen, setEditorOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<ISectionCatalogEntry | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ISectionCatalogEntry | null>(null);
    const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
    const [cloneTarget, setCloneTarget] = useState<ISectionCatalogEntry | null>(null);
    const [cloneName, setCloneName] = useState('');
    const [cloneKey, setCloneKey] = useState('');
    const canWrite = useCanWrite('PERM_CONFIG_SECTIONS_WRITE');

    usePageTitle(t('ptitle_section_catalog', 'Section Catalog'));

    const {data: entries, isLoading, refetch} = useQuery({
        queryKey: ['section-catalog', flavor],
        queryFn: () => fetchCatalog(flavor),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCatalogEntry,
        onSuccess: () => {
            showToast(t('msg_catalog_entry_deleted', 'Catalog entry deleted'), 'success');
            queryClient.invalidateQueries({queryKey: ['section-catalog', flavor]});
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
        },
        onError: (e: Error) => {
            showToast(e.message, 'error');
        },
    });

    const cloneMutation = useMutation({
        mutationFn: ({id, displayName, sectionKey}: {id: string; displayName: string; sectionKey: string}) =>
            cloneCatalogEntry(id, displayName, sectionKey),
        onSuccess: (created) => {
            showToast(t('msg_catalog_entry_cloned', 'Catalog entry cloned'), 'success');
            queryClient.invalidateQueries({queryKey: ['section-catalog', flavor]});
            setCloneDialogOpen(false);
            setCloneTarget(null);
            setEditTarget(created);
            setEditorOpen(true);
        },
        onError: (e: Error) => {
            showToast(e.message, 'error');
        },
    });

    const openCloneDialog = (entry: ISectionCatalogEntry) => {
        setCloneTarget(entry);
        setCloneName(`${entry.displayName} (Copy)`);
        setCloneKey(`${entry.sectionKey}Copy`);
        setCloneDialogOpen(true);
    };

    useToolbar([
        {
            id: 'add',
            label: t('btn_add_section_type', 'Add section type'),
            icon: Plus,
            color: 'green',
            variant: 'solid',
            disabled: !canWrite,
            onClick: () => {
                setEditTarget(null);
                setEditorOpen(true);
            },
        },
        {
            id: 'refresh',
            label: t('btn_refresh', 'Refresh'),
            icon: RefreshCw,
            onClick: () => refetch(),
            isLoading: isLoading,
        },
    ]);

    const onConfirmDelete = () => {
        if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
        }
    };

    return (
        <Card size="4" className="w-full shadow-lg">
            <Flex gap="2" mb="3" align="center">
                <Text size="2">{t('lbl_flavor', 'Flavor')}:</Text>
                <Select.Root value={flavor} onValueChange={(v) => setFlavor(v as Flavor)}>
                    <Select.Trigger/>
                    <Select.Content>
                        {FLAVORS.map((f) => (
                            <Select.Item key={f} value={f}>
                                {FLAVOR_LABELS[f]}
                            </Select.Item>
                        ))}
                    </Select.Content>
                </Select.Root>
            </Flex>

            {isLoading && <Progress className="mb-4"/>}

            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell>{t('thead_display_name', 'Display name')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_section_key', 'Section key')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_type', 'Type')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_read_perm', 'Read perm')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>{t('thead_write_perm', 'Write perm')}</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell/>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {entries?.map((entry) => (
                        <ContextMenu.Root key={entry.id}>
                            <ContextMenu.Trigger>
                        <Table.Row className="hover:bg-[var(--accent-2)]" onClick={() => {
                            setEditTarget(entry);
                            setEditorOpen(true);
                        }}>
                            <Table.RowHeaderCell>
                                <Flex gap="2" align="center">
                                {entry.icon && (
                                    <img
                                        src={entry.icon.includes('/') ? `/assets/${entry.icon}` : `/assets/azure/${entry.icon}`}
                                        alt={entry.displayName}
                                        className="w-6 h-6"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                )}
                                <Text weight="medium">{entry.displayName}</Text>
                                </Flex>
                            </Table.RowHeaderCell>
                            <Table.Cell>
                                <Badge variant="soft" size="2">{entry.sectionKey}</Badge>
                            </Table.Cell>
                            <Table.Cell>
                                {entry.system ? (
                                    <Badge color="gold">{t('lbl_system', 'System')}</Badge>
                                ) : (
                                    <Badge color="purple">{t('lbl_extension', 'Extension')}</Badge>
                                )}
                            </Table.Cell>
                            <Table.Cell>{entry.requiredReadPermission ?? '—'}</Table.Cell>
                            <Table.Cell>{entry.requiredWritePermission ?? '—'}</Table.Cell>
                            <Table.Cell>
                                <Flex gap="3">
                                    <WriteGuard permission="PERM_CONFIG_SECTIONS_WRITE">
                                        <Tooltip content={t('btn_edit', 'Edit')}>
                                            <Button
                                                size="1"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditTarget(entry);
                                                    setEditorOpen(true);
                                                }}
                                            >
                                                <Edit size={14}/>
                                            </Button>
                                        </Tooltip>
                                    </WriteGuard>
                                    <WriteGuard permission="PERM_CONFIG_SECTIONS_WRITE">
                                        <Tooltip
                                            content={entry.system
                                                ? t('msg_system_immutable', 'System-defined, cannot be deleted')
                                                : t('btn_delete', 'Delete')}
                                        >
                                            <Button
                                                size="1"
                                                variant="ghost"
                                                color="red"
                                                disabled={entry.system}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteTarget(entry);
                                                    setDeleteDialogOpen(true);
                                                }}
                                            >
                                                <Trash2 size={14}/>
                                            </Button>
                                        </Tooltip>
                                    </WriteGuard>
                                </Flex>
                            </Table.Cell>
                        </Table.Row>
                            </ContextMenu.Trigger>
                            <ContextMenu.Content>
                                <ContextMenu.Item disabled={!canWrite} onClick={() => {
                                    setEditTarget(entry);
                                    setEditorOpen(true);
                                }}>
                                    <Edit size={16}/> <b>{t('mit_edit', 'Edit')}</b>
                                </ContextMenu.Item>
                                <ContextMenu.Item disabled={!canWrite} onClick={() => openCloneDialog(entry)}>
                                    <Copy size={16}/> <b>{t('mit_clone', 'Clone')}</b>
                                </ContextMenu.Item>
                                <ContextMenu.Separator/>
                                <ContextMenu.Item color="ruby" disabled={!canWrite || entry.system} onClick={() => {
                                    setDeleteTarget(entry);
                                    setDeleteDialogOpen(true);
                                }}>
                                    <Trash2 size={16}/> <b>{t('mit_delete', 'Delete')}</b>
                                </ContextMenu.Item>
                            </ContextMenu.Content>
                        </ContextMenu.Root>
                    ))}
                    {entries && entries.length === 0 && (
                        <Table.Row>
                            <Table.Cell colSpan={6}>
                                <Box py="4">
                                    <Text color="gray" align="center" as="div">
                                        {t('lbl_no_catalog_entries', 'No catalog entries')}
                                    </Text>
                                </Box>
                            </Table.Cell>
                        </Table.Row>
                    )}
                </Table.Body>
            </Table.Root>

            <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DraggableDialogContent maxWidth="450px"
                                        title={t('dlg_delete_catalog_entry', 'Delete catalog entry')}>
                    <Text size="2" mb="4" as="div">
                        {t(
                            'lbl_confirm_delete_catalog_entry',
                            `Are you sure you want to delete "${deleteTarget?.displayName ?? ''}"?`,
                        )}
                    </Text>
                    <Flex gap="3" mt="4" justify="end">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                <ArrowBigLeft size={16}/> {t('btn_back', 'Back')}
                            </Button>
                        </Dialog.Close>
                        <Button variant="solid" color="red" onClick={onConfirmDelete}
                                disabled={deleteMutation.isPending || !canWrite}>
                            <Trash2 size={16}/> {t('btn_delete', 'Delete')}
                        </Button>
                    </Flex>
                </DraggableDialogContent>
            </Dialog.Root>

            <SectionCatalogEditor
                open={editorOpen}
                onOpenChange={setEditorOpen}
                entry={editTarget}
                flavor={flavor}
                onSaved={() => {
                    setEditorOpen(false);
                    queryClient.invalidateQueries({queryKey: ['section-catalog', flavor]});
                }}
            />

            <CloneSectionDialog
                open={cloneDialogOpen}
                onOpenChange={setCloneDialogOpen}
                name={cloneName}
                onNameChange={setCloneName}
                sectionKey={cloneKey}
                onSectionKeyChange={setCloneKey}
                onConfirm={() => {
                    if (cloneTarget && cloneName.trim() && cloneKey.trim()) {
                        cloneMutation.mutate({
                            id: cloneTarget.id,
                            displayName: cloneName.trim(),
                            sectionKey: cloneKey.trim(),
                        });
                    }
                }}
                isPending={cloneMutation.isPending}
            />
        </Card>
    );
};

export default SectionCatalogList;
