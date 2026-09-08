import React, {useCallback, useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Badge, Box, Card, Dialog, Flex, Progress, Select, Text, Spinner} from '@radix-ui/themes';
import {
    ArrowLeft,
    Braces,
    Eye,
    FormIcon,
    HelpCircle,
    Lock,
    Save,
    Scale,
    Waypoints
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import {useTranslation} from 'react-i18next';

import {fetchWithAuth} from '../../utils/api';
import {useAuth} from '../../context/AuthContext';
import {useToolbar} from '../../context/ToolbarContext';
import {usePageTitle} from '../../context/PageTitleContext';
import {useToast} from '../../context/ToastContext';
import {useTheme} from '../../context/ThemeContext';
import {PERM_SET_CONFIG_LOCK} from '../../constants/permissions';
import {ConfigurationData, IConfiguration, IConfigurationSchema} from '../../models/configuration.model';
import {ISectionCatalogEntry} from '../../models/section-catalog.model';
import {ConfigProviderSidebar} from './components/ConfigProviderSidebar';
import {ConfigProviderMainPanel} from './components/ConfigProviderMainPanel';
import {AddItemDialog} from './components/modals/AddItemDialog';
import {CompareConfigDialog} from './components/modals/CompareConfigDialog';
import {DraggableDialogContent} from '../../components/system/DraggableDialogContent';
import {ConfigProviderViewHelp} from '../documentation/ConfigProviderViewHelp';
import {buildItemDefaults, computeEffectiveFields} from '../../utils/effective-fields';
import {fetchEnvironmentByIdCompact} from "../environments/api.ts";
import {fetchCatalogByFlavor, fetchConfigurationById, fetchProviderOutput, fetchSchema, saveConfiguration} from "./api.ts";
import {useConfigurationEditorState} from './hooks/useConfigurationEditorState';
import {useSaveWithMerge} from './hooks/useSaveWithMerge';
import {applyResolutions, MergeConflict, ResolutionMap} from './merge/configMerge';
import {ConfigUpdateBanner} from './components/ConfigUpdateBanner';
import {SchemaUpdateBanner} from './components/SchemaUpdateBanner';
import {ConflictResolutionModal} from './components/modals/ConflictResolutionModal';
import {SchemaCascadeModal} from './components/modals/SchemaCascadeModal';
import {summarizeSchemaDiff} from './merge/schemaDiff';
import {findOrphanPaths} from './merge/orphans';
import {OutsideSchemaPanel} from './components/OutsideSchemaPanel';
import {ConfigDeletedModal} from './components/modals/ConfigDeletedModal';

const lockConfiguration = async (documentId: string, locked: boolean): Promise<void> => {
    const r = await fetchWithAuth(`/configurations/${documentId}/lock`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({locked}),
    });
    if (!r.ok) throw new Error('Failed to update lock state');
};

// ---------------------------------------------------------------------------
// Inner component — requires non-null config + schema so the hook can be
// instantiated unconditionally (Rules of Hooks).
// ---------------------------------------------------------------------------
interface ProviderViewInnerProps {
    id: string;
    initialConfig: IConfiguration;
    initialSchema: IConfigurationSchema;
    catalog: ISectionCatalogEntry[];
    currentUserLogin: string;
}

const ProviderViewInner: React.FC<ProviderViewInnerProps> = ({
    id,
    initialConfig,
    initialSchema,
    catalog,
    currentUserLogin,
}) => {
    const navigate = useNavigate();
    const {t} = useTranslation();
    const {showToast} = useToast();
    const {appearance, codeFont} = useTheme();
    const {hasPermission} = useAuth();
    const qc = useQueryClient();

    const editor = useConfigurationEditorState({
        initialConfig,
        initialSchema,
        currentUserLogin,
    });

    const [selected, setSelected] = useState<{ sectionKey: string; itemName: string } | null>(null);
    const [addDialog, setAddDialog] = useState<{ sectionKey: string } | null>(null);
    const [viewMode, setViewMode] = useState<'form' | 'json'>('form');

    const [compareOpen, setCompareOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [conflictState, setConflictState] = useState<{
        conflicts: MergeConflict[];
        mergedConfig: IConfiguration;
        latest: IConfiguration;
        autoMergedCount: number;
    } | null>(null);

    const catalogByDocId = useMemo(() => {
        const m = new Map<string, ISectionCatalogEntry>();
        catalog.forEach((c) => m.set(c.documentId, c));
        return m;
    }, [catalog]);

    const {data: providerOutput} = useQuery({
        queryKey: ['provider-output', editor.working.name],
        queryFn: () => fetchProviderOutput(editor.working.name),
        enabled: !!editor.working.name && viewMode === 'json',
    });

    const {data: environmentCompact} = useQuery({
        queryKey: ['environment-compact', editor.working.environmentId],
        queryFn: () => editor.working.environmentId ? fetchEnvironmentByIdCompact(editor.working.environmentId) : null,
        enabled: !!editor.working.environmentId,
    });

    const data: ConfigurationData = editor.working.data;
    console.log('[ProviderViewInner render] working.version=', editor.working.version,
        'data sample=', JSON.stringify(data).slice(0, 200),
        'selected=', selected);
    const isLocked = editor.working.locked ?? false;
    const canLock = hasPermission(PERM_SET_CONFIG_LOCK);

    const {attemptSave} = useSaveWithMerge({
        saveConfig: saveConfiguration,
        getBase: () => editor.base.config,
        resetBaseAfterSave: editor.resetBaseAfterSave,
        markAuthored: editor.markAuthored,
    });

    const handleSave = useCallback(async () => {
        if (isSaving || isLocked) return;
        setIsSaving(true);
        try {
            const toSave: IConfiguration = {
                ...editor.working,
                baseVersion: editor.base.config.version,
            };
            const res = await attemptSave(toSave);
            if (res.status === 'saved') {
                showToast(t('msg_save_success', 'Configuration saved successfully!'), 'success');
                qc.invalidateQueries({queryKey: ['configuration', id]});
                return;
            }
            if (res.status === 'conflicts') {
                setConflictState({
                    conflicts: res.conflicts,
                    mergedConfig: res.merged,
                    latest: res.latest,
                    // TODO: compute accurately by diffing res.merged vs editor.working
                    autoMergedCount: 0,
                });
                return;
            }
            showToast(res.error instanceof Error ? res.error.message : 'Save failed', 'error');
        } finally {
            setIsSaving(false);
        }
    }, [isSaving, isLocked, editor, attemptSave, showToast, t, qc, id]);

    const handleApplyResolutions = useCallback(async (resolutions: ResolutionMap) => {
        if (!conflictState) return;
        const finalData = applyResolutions(conflictState.mergedConfig.data, conflictState.conflicts, resolutions);
        const finalToSave: IConfiguration = {
            ...editor.working,
            data: finalData,
            baseVersion: conflictState.latest.version,
        };
        setConflictState(null);
        setIsSaving(true);
        try {
            const res = await attemptSave(finalToSave);
            if (res.status === 'conflicts') {
                setConflictState({
                    conflicts: res.conflicts,
                    mergedConfig: res.merged,
                    latest: res.latest,
                    autoMergedCount: 0,
                });
            } else if (res.status === 'saved') {
                showToast(t('msg_save_success', 'Configuration saved successfully!'), 'success');
                qc.invalidateQueries({queryKey: ['configuration', id]});
            } else {
                showToast(res.error instanceof Error ? res.error.message : 'Save failed', 'error');
            }
        } finally {
            setIsSaving(false);
        }
    }, [attemptSave, conflictState, editor, showToast, t, qc, id]);

    const lockMutation = useMutation({
        mutationFn: ({locked}: { locked: boolean }) => {
            if (!editor.working.documentId) throw new Error('No documentId');
            return lockConfiguration(editor.working.documentId, locked);
        },
        onSuccess: () => qc.invalidateQueries({queryKey: ['configuration', id]}),
        onError: () => showToast(t('msg_lock_error', 'Failed to update lock state.'), 'error'),
    });

    usePageTitle(`${t('ptitle_config_provider', 'Configuration')}: ${editor.working.name ?? ''} v${editor.working.version ?? '0'}`);

    useToolbar([
        {
            id: 'back',
            label: t('btn_back', 'Back'),
            icon: ArrowLeft,
            color: 'amber',
            variant: 'solid',
            onClick: () => navigate('/configurations/maps'),
        },
        {
            id: 'birds',
            label: t('btn_show_whole_config', 'Birds Eye'),
            color: 'indigo',
            icon: Eye,
            onClick: () => navigate(`/configurations/maps/${id}/tree-view`),
        },
        {
            id: 'compare',
            label: t('btn_compare', 'Compare'),
            icon: Scale,
            onClick: () => setCompareOpen(true),
        },
        {
            id: 'save',
            label: t('btn_save', 'Save'),
            icon: Save,
            color: 'green',
            variant: 'solid',
            disabled: !editor.hasLocalEdits || isLocked || isSaving,
            isLoading: isSaving,
            onClick: handleSave,
        },
        {
            id: 'help',
            label: t('btn_help', 'Help'),
            icon: HelpCircle,
            color: 'sky',
            onClick: () => setHelpOpen(true),
        },
        {
            id: 'lock',
            label: t('btn_lock', 'Lock'),
            icon: Lock,
            isSwitch: true,
            checked: isLocked,
            disabled: !canLock || lockMutation.isPending,
            onCheckedChange: (checked: boolean) => lockMutation.mutate({locked: checked}),
        },
    ]);

    const handleAddItem = (sectionKey: string) => setAddDialog({sectionKey});

    const handleConfirmAdd = (itemName: string) => {
        if (!addDialog) return;
        const schema = editor.base.schema;
        const sectionEntry = schema.sections.find(
            (s) => catalogByDocId.get(s.catalogEntryDocumentId)?.sectionKey === addDialog.sectionKey,
        );
        const cat = sectionEntry && catalogByDocId.get(sectionEntry.catalogEntryDocumentId);
        if (!sectionEntry || !cat) {
            setAddDialog(null);
            return;
        }
        const eff = computeEffectiveFields(cat, sectionEntry);
        const defaults = buildItemDefaults(eff, sectionEntry.fieldDefaults ?? {});
        const next: ConfigurationData = {
            ...data,
            [addDialog.sectionKey]: {
                ...(data[addDialog.sectionKey] ?? {}),
                [itemName]: defaults,
            },
        };
        editor.setWorking({...editor.working, data: next});
        setSelected({sectionKey: addDialog.sectionKey, itemName});
        setAddDialog(null);
    };

    const handleDeleteItem = (sectionKey: string, itemName: string) => {
        const next: ConfigurationData = {...data};
        if (next[sectionKey]) {
            const section = {...next[sectionKey]};
            delete section[itemName];
            next[sectionKey] = section;
        }
        editor.setWorking({...editor.working, data: next});
        if (selected?.sectionKey === sectionKey && selected.itemName === itemName) {
            setSelected(null);
        }
    };

    const handleItemDataChange = (val: Record<string, unknown>) => {
        if (!selected) return;
        const next: ConfigurationData = {
            ...data,
            [selected.sectionKey]: {
                ...(data[selected.sectionKey] ?? {}),
                [selected.itemName]: val,
            },
        };
        editor.setWorking({...editor.working, data: next});
    };

    const effectiveFieldsForSelected = useMemo(() => {
        if (!selected) return [];
        const schema = editor.base.schema;
        const sectionEntry = schema.sections.find(
            (s) => catalogByDocId.get(s.catalogEntryDocumentId)?.sectionKey === selected.sectionKey,
        );
        const cat = sectionEntry && catalogByDocId.get(sectionEntry.catalogEntryDocumentId);
        if (!sectionEntry || !cat) return [];
        return computeEffectiveFields(cat, sectionEntry);
    }, [selected, editor.base.schema, catalogByDocId]);

    const orphans = useMemo(
        () => findOrphanPaths(editor.working.data, editor.base.schema),
        [editor.working.data, editor.base.schema],
    );

    const handleDiscardOrphan = useCallback((path: [string, string, string]) => {
        const [sec, item, field] = path;
        const next: ConfigurationData = JSON.parse(JSON.stringify(editor.working.data));
        if (next[sec]?.[item]) {
            delete next[sec][item][field];
            if (Object.keys(next[sec][item]).length === 0) delete next[sec][item];
            if (Object.keys(next[sec]).length === 0) delete next[sec];
        }
        editor.setWorking({...editor.working, data: next});
    }, [editor]);

    return (
        <Card
            size="4"
            className="w-full shadow-lg overflow-hidden"
            style={{height: '86vh', display: 'flex', flexDirection: 'column'}}
        >
            <Flex
                className="config-provider-header"
                gap="3"
                align="center"
                p="3"
                style={{borderBottom: '1px solid var(--gray-6)'}}
            >
                <Text weight="bold" size="6">{editor.working.name}</Text>
                {editor.working.environmentId && (
                    <Badge color="blue" size="2"><Waypoints size={14}/>{environmentCompact?.name}</Badge>
                )}
                <Box style={{marginLeft: 'auto'}}>
                    <Select.Root value={viewMode} onValueChange={(v) => setViewMode(v as 'form' | 'json')}>
                        <Select.Trigger/>
                        <Select.Content>
                            <Select.Item value="form">
                                <Flex direction="row" align="center" gap="2">
                                    <FormIcon size={14}></FormIcon>
                                    {t('btn_view_form', 'Form')}
                                </Flex>
                            </Select.Item>
                            <Select.Item value="json">
                                <Flex direction="row" align="center" gap="2">
                                    <Braces size={14}></Braces>
                                    {t('btn_view_json', 'JSON preview')}
                                </Flex>
                            </Select.Item>
                        </Select.Content>
                    </Select.Root>
                </Box>
            </Flex>

            {viewMode === 'form' ? (
                <Flex style={{flex: 1, overflow: 'hidden'}}>
                    <Box
                        style={{
                            width: 320,
                            borderRight: '1px solid var(--gray-6)',
                            overflowY: 'auto',
                            flexShrink: 0,
                        }}
                    >
                        <ConfigProviderSidebar
                            schema={editor.base.schema}
                            catalogByDocId={catalogByDocId}
                            data={data}
                            selected={selected}
                            onSelect={(s, i) => setSelected({sectionKey: s, itemName: i})}
                            onAddItem={handleAddItem}
                            onDeleteItem={handleDeleteItem}
                            locked={isLocked}
                            userHasReadPerm={(p) => !p || hasPermission(p)}
                            userHasWritePerm={(p) => !p || hasPermission(p)}
                        />
                    </Box>
                    <Box style={{flex: 1, overflowY: 'auto', padding: '12px'}}>
                        {editor.hasRemoteConfigUpdate && editor.latest && (
                            <ConfigUpdateBanner
                                user={editor.latest.createdBy ?? 'unknown'}
                                latestVersion={editor.latest.version ?? 0}
                                hasLocalEdits={editor.hasLocalEdits}
                                onReload={() => editor.resetBaseAfterSave(editor.latest!)}
                                onViewChanges={handleSave}
                            />
                        )}
                        {editor.hasRemoteSchemaUpdate
                            && editor.latestSchema
                            && editor.lastPromptedSchemaTimestamp !== (editor.latestSchema.lastModifiedDate ?? null) && (
                            <SchemaUpdateBanner
                                user={editor.latestSchema.lastModifiedBy ?? editor.latestSchema.createdBy ?? 'unknown'}
                                schemaName={editor.base.schema.name}
                                onUseNew={() => editor.acceptLatestSchema()}
                                onContinue={() => editor.dismissSchemaPrompt()}
                            />
                        )}
                        <ConfigProviderMainPanel
                            selected={selected}
                            effectiveFields={effectiveFieldsForSelected}
                            data={
                                selected
                                    ? (data[selected.sectionKey]?.[selected.itemName] as
                                        Record<string, unknown> | undefined)
                                    : undefined
                            }
                            onDataChange={handleItemDataChange}
                            locked={isLocked}
                        />
                        <OutsideSchemaPanel
                            orphans={orphans}
                            values={editor.working.data}
                            onDiscard={handleDiscardOrphan}
                        />
                    </Box>
                </Flex>
            ) : (
                <Box style={{flex: 1, overflow: 'hidden'}}>
                    <Editor
                        height="100%"
                        defaultLanguage="json"
                        value={JSON.stringify(providerOutput?.data ?? {}, null, 2)}
                        theme={appearance === 'dark' ? 'vs-dark' : 'light'}
                        options={{
                            readOnly: true,
                            minimap: {enabled: false},
                            fontFamily: codeFont,
                            fontLigatures: true,
                            scrollBeyondLastLine: false,
                        }}
                    />
                </Box>
            )}

            <AddItemDialog
                open={!!addDialog}
                onOpenChange={(open) => {
                    if (!open) setAddDialog(null);
                }}
                existingNames={addDialog ? Object.keys(data[addDialog.sectionKey] ?? {}) : []}
                onConfirm={handleConfirmAdd}
            />

            <CompareConfigDialog
                open={compareOpen}
                onOpenChange={setCompareOpen}
                currentConfig={editor.working}
            />

            <Dialog.Root open={helpOpen} onOpenChange={setHelpOpen}>
                <DraggableDialogContent
                    maxWidth="900px"
                    maxHeight="85vh"
                    title={t('title_config_provider_help', 'Config Provider Viewer – Help')}
                >
                    <Box style={{maxHeight: '75vh', overflowY: 'auto', paddingRight: '10px'}}>
                        <ConfigProviderViewHelp hideTitle/>
                    </Box>
                </DraggableDialogContent>
            </Dialog.Root>

            {conflictState && (
                <ConflictResolutionModal
                    open
                    conflicts={conflictState.conflicts}
                    autoMergedCount={conflictState.autoMergedCount}
                    theirsUser={conflictState.latest.createdBy ?? 'unknown'}
                    baseVersion={editor.base.config.version ?? 0}
                    latestVersion={conflictState.latest.version ?? 0}
                    onCancel={() => setConflictState(null)}
                    onApply={handleApplyResolutions}
                />
            )}
            {editor.hasRemoteSchemaUpdate
                && editor.latestSchema != null
                && editor.lastPromptedSchemaTimestamp !== (editor.latestSchema.lastModifiedDate ?? null) && (
                <SchemaCascadeModal
                    open
                    user={editor.latestSchema.lastModifiedBy ?? editor.latestSchema.createdBy ?? 'unknown'}
                    schemaName={editor.base.schema.name}
                    diff={summarizeSchemaDiff(editor.base.schema, editor.latestSchema)}
                    catalogByDocId={catalogByDocId}
                    onUseNew={() => editor.acceptLatestSchema()}
                    onContinue={() => editor.dismissSchemaPrompt()}
                />
            )}
            {editor.deletedBy && (
                <ConfigDeletedModal
                    open
                    user={editor.deletedBy}
                    onClose={() => {
                        editor.clearDeletedFlag();
                        navigate('/configurations');
                    }}
                    onSaveAsNew={async () => {
                        try {
                            const cloned = await saveConfiguration({
                                name: editor.working.name + ' (recovered)',
                                schemaId: editor.working.schemaId,
                                flavor: editor.working.flavor,
                                environmentId: editor.working.environmentId,
                                data: editor.working.data,
                            } as Partial<IConfiguration>);
                            editor.clearDeletedFlag();
                            navigate(`/configurations/${cloned.id}`);
                        } catch {
                            showToast('Failed to save as new', 'error');
                        }
                    }}
                />
            )}
        </Card>
    );
};

// ---------------------------------------------------------------------------
// Outer shell — handles data fetching + loading state, then delegates to
// ProviderViewInner once all required data is available.
// ---------------------------------------------------------------------------
export const ConfigurationProviderView: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const {t} = useTranslation();
    const {user} = useAuth();

    const {data: config, isLoading: isConfigLoading} = useQuery({
        queryKey: ['configuration', id],
        queryFn: () => fetchConfigurationById(id!),
        enabled: !!id,
    });

    const {data: schema, isLoading: isSchemaLoading} = useQuery({
        queryKey: ['configuration-schema', config?.schemaId],
        queryFn: () => fetchSchema(config!.schemaId),
        enabled: !!config?.schemaId,
    });

    const {data: catalog, isLoading: isCatalogLoading} = useQuery({
        queryKey: ['section-catalog', config?.flavor],
        queryFn: () => fetchCatalogByFlavor(config!.flavor),
        enabled: !!config?.flavor,
    });

    if (isConfigLoading || isSchemaLoading || isCatalogLoading || !config || !schema || !catalog) {
        return (
            <Card size="4" className="w-full">
                <Flex gap="3" align="center">
                    <Progress/>
                </Flex>
                <Flex direction="column" gap="2" align="center" justify="center" mt="5">
                    <Flex align="center" justify="center" className="h-64">
                        <Spinner size="3" />
                    </Flex>
                    <Text size="2" color="gray">{t('msg_processing', 'Processing...')}</Text>
                </Flex>
            </Card>
        );
    }

    return (
        <ProviderViewInner
            id={id!}
            initialConfig={config}
            initialSchema={schema}
            catalog={catalog}
            currentUserLogin={user?.username ?? ''}
        />
    );
};

export default ConfigurationProviderView;
