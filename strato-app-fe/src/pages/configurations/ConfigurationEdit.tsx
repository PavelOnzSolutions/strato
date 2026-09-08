import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Badge, Box, Callout, Card, Flex, Select, Text, TextField} from '@radix-ui/themes';
import {ArrowLeft, CurlyBraces, Lock, Save, Waypoints} from 'lucide-react';
import {useTranslation} from 'react-i18next';

import {fetchWithAuth} from '../../utils/api';
import {useToolbar} from '../../context/ToolbarContext';
import {usePageTitle} from '../../context/PageTitleContext';
import {useToast} from '../../context/ToastContext';
import {useAuth} from '../../context/AuthContext';
import {ConfigurationData, IConfiguration, IConfigurationSchema} from '../../models/configuration.model';
import {ISectionCatalogEntry} from '../../models/section-catalog.model';
import {fetchCatalogByFlavor, saveConfiguration} from './api';
import {IEnvironment} from '../../models/environment.model';
import {PERM_SET_CONFIG_LOCK} from '../../constants/permissions';
import {Flavor, FLAVOR_LABELS} from '../../constants/flavors';
import {useCanWrite} from '../../components/permissions/WriteGuard';
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

// ---------------------------------------------------------------------------
// Inner component — instantiates editor state hook (requires non-null cfg+schema)
// and wires save with merge-aware flow.
// ---------------------------------------------------------------------------
interface ConfigEditBannersProps {
    cfg: IConfiguration;
    schema: IConfigurationSchema;
    currentUserLogin: string;
    /** Callback so the outer component can observe the latest saved IConfiguration. */
    onSaveSuccess: (saved: IConfiguration) => void;
    /** Exposes handleSave to the outer component for the toolbar button. */
    onSaveRef: (fn: () => Promise<void>) => void;
    isSaving: boolean;
    setIsSaving: (v: boolean) => void;
}

const ConfigEditBanners: React.FC<ConfigEditBannersProps> = ({
    cfg, schema, currentUserLogin, onSaveSuccess, onSaveRef, isSaving, setIsSaving,
}) => {
    const {showToast} = useToast();
    const navigate = useNavigate();

    const editor = useConfigurationEditorState({initialConfig: cfg, initialSchema: schema, currentUserLogin});

    // Section ids → names for the schema-cascade modal. Only fetched when a
    // remote schema update is pending, i.e. the modal can actually appear.
    const {data: catalog} = useQuery({
        queryKey: ['section-catalog', editor.base.schema.flavor],
        queryFn: () => fetchCatalogByFlavor(editor.base.schema.flavor),
        enabled: !!editor.latestSchema,
    });
    const catalogByDocId = useMemo(() => {
        const m = new Map<string, ISectionCatalogEntry>();
        (catalog ?? []).forEach((c) => m.set(c.documentId, c));
        return m;
    }, [catalog]);

    const [conflictState, setConflictState] = useState<{
        conflicts: MergeConflict[];
        mergedConfig: IConfiguration;
        latest: IConfiguration;
        autoMergedCount: number;
    } | null>(null);

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

    const {attemptSave} = useSaveWithMerge({
        saveConfig: saveConfiguration,
        getBase: () => editor.base.config,
        resetBaseAfterSave: editor.resetBaseAfterSave,
        markAuthored: editor.markAuthored,
    });

    const handleSave = useCallback(async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const toSave: IConfiguration = {
                ...editor.working,
                baseVersion: editor.base.config.version,
            };
            const res = await attemptSave(toSave);
            if (res.status === 'saved') {
                onSaveSuccess(res.saved);
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
    }, [isSaving, setIsSaving, editor, attemptSave, onSaveSuccess, showToast]);

    // Expose handleSave to outer component for toolbar wiring.
    useEffect(() => {
        onSaveRef(handleSave);
    }, [onSaveRef, handleSave]);

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
                onSaveSuccess(res.saved);
            } else {
                showToast(res.error instanceof Error ? res.error.message : 'Save failed', 'error');
            }
        } finally {
            setIsSaving(false);
        }
    }, [attemptSave, conflictState, editor, onSaveSuccess, setIsSaving, showToast]);

    const shouldShowSchemaModal =
        editor.hasRemoteSchemaUpdate
        && editor.latestSchema != null
        && editor.lastPromptedSchemaTimestamp !== (editor.latestSchema.lastModifiedDate ?? null);

    return (
        <>
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
            {shouldShowSchemaModal && editor.latestSchema && (
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
            <OutsideSchemaPanel
                orphans={orphans}
                values={editor.working.data}
                onDiscard={handleDiscardOrphan}
            />
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
        </>
    );
};

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
const fetchConfig = async (id: string): Promise<IConfiguration> => {
    const response = await fetchWithAuth(`/configurations/${id}`);
    if (!response.ok) throw new Error('Failed to fetch configuration');
    return response.json();
};

const fetchSchemas = async (): Promise<IConfigurationSchema[]> => {
    const response = await fetchWithAuth('/configuration-schemas');
    if (!response.ok) throw new Error('Failed to fetch schemas');
    return response.json();
};

const fetchEnvironments = async (): Promise<IEnvironment[]> => {
    const response = await fetchWithAuth('/environments');
    if (!response.ok) throw new Error('Failed to fetch environments');
    return response.json();
};

const lockConfiguration = async (documentId: string, locked: boolean): Promise<void> => {
    const response = await fetchWithAuth(`/configurations/${documentId}/lock`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({locked}),
    });
    if (!response.ok) throw new Error('Failed to update lock state');
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const ConfigurationEdit: React.FC = () => {
    const {id} = useParams<{id: string}>();
    const isNew = !id || id === 'new';
    const navigate = useNavigate();
    const {t} = useTranslation();
    const {showToast} = useToast();
    const {hasPermission, user} = useAuth();
    const queryClient = useQueryClient();
    const canLock = hasPermission(PERM_SET_CONFIG_LOCK);
    const canWrite = useCanWrite('PERM_CONFIG_PROVIDER_WRITE');

    const [name, setName] = useState('');
    const [schemaId, setSchemaId] = useState('');
    const [envId, setEnvId] = useState<string | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);

    // Ref to the save handler exposed by ConfigEditBanners (only relevant when
    // an existing config + schema are loaded and the inner component is mounted).
    const saveHandlerRef = React.useRef<(() => Promise<void>) | null>(null);
    const onSaveRef = useCallback((fn: () => Promise<void>) => {
        saveHandlerRef.current = fn;
    }, []);

    const {data: existing, isLoading} = useQuery({
        queryKey: ['configuration', id],
        queryFn: () => fetchConfig(id!),
        enabled: !isNew,
    });

    const {data: schemas} = useQuery({
        queryKey: ['configuration-schemas-dropdown'],
        queryFn: fetchSchemas,
    });

    const {data: environments} = useQuery({
        queryKey: ['environments-dropdown'],
        queryFn: fetchEnvironments,
    });

    useEffect(() => {
        if (existing) {
            setName(existing.name || '');
            setSchemaId(existing.schemaId || '');
            setEnvId(existing.environmentId);
        }
    }, [existing]);

    const selectedSchema = schemas?.find(s => s.id === schemaId);
    const flavor: Flavor = selectedSchema?.flavor ?? existing?.flavor ?? 'AZURE';
    const isLocked = existing?.locked ?? false;

    // For NEW configurations or metadata-only saves (name/schema change), use the
    // simple mutation path (no merge complexity needed — these don't touch data).
    const mutation = useMutation({
        mutationFn: saveConfiguration,
        onSuccess: (saved) => {
            queryClient.invalidateQueries({queryKey: ['configuration', saved.id]});
            queryClient.invalidateQueries({queryKey: ['configurations']});
            showToast(t('msg_config_saved', 'Configuration saved'), 'success');
            navigate(`/configurations/maps/${saved.id}/provider-view`);
        },
        onError: (e: Error) => {
            showToast(e.message, 'error');
        },
    });

    const lockMutation = useMutation({
        mutationFn: ({locked}: {locked: boolean}) => {
            if (!existing?.documentId) throw new Error('No documentId');
            return lockConfiguration(existing.documentId, locked);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['configuration', id]});
        },
        onError: () => showToast(t('msg_lock_error', 'Failed to update lock state.'), 'error'),
    });

    const handleSave = useCallback(async () => {
        if (isLocked) return;
        if (!name.trim()) {
            showToast(t('msg_name_required', 'Name is required'), 'error');
            return;
        }
        if (!schemaId) {
            showToast(t('msg_select_schema', 'Please select a schema'), 'error');
            return;
        }
        if (isNew) {
            // New configuration: use simple mutation (no OCC needed).
            mutation.mutate({
                id: undefined,
                documentId: undefined,
                name,
                schemaId,
                environmentId: envId,
                data: {},
                flavor,
            } as Partial<IConfiguration>);
            return;
        }
        // Existing configuration: delegate to the merge-aware handler in
        // ConfigEditBanners (which has access to the editor state).
        if (saveHandlerRef.current) {
            await saveHandlerRef.current();
            queryClient.invalidateQueries({queryKey: ['configuration', id]});
            queryClient.invalidateQueries({queryKey: ['configurations']});
        }
    }, [isLocked, name, schemaId, isNew, mutation, envId, flavor, queryClient, id, showToast, t]);

    const handleSaveSuccess = useCallback((saved: IConfiguration) => {
        queryClient.invalidateQueries({queryKey: ['configuration', saved.id]});
        queryClient.invalidateQueries({queryKey: ['configurations']});
        showToast(t('msg_config_saved', 'Configuration saved'), 'success');
        navigate(`/configurations/maps/${saved.id}/provider-view`);
    }, [queryClient, showToast, t, navigate]);

    usePageTitle(isNew
        ? t('ptitle_new_config', 'New Configuration')
        : `${t('ptitle_edit_config', 'Edit Configuration')}: ${name}`);

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
            id: 'save',
            label: t('btn_save', 'Save'),
            icon: Save,
            variant: 'solid',
            color: 'green',
            disabled: isLocked || !canWrite,
            isLoading: mutation.isPending || isSaving,
            onClick: handleSave,
        },
        {
            id: 'lock',
            label: t('btn_lock', 'Lock'),
            icon: Lock,
            isSwitch: true,
            checked: isLocked,
            onCheckedChange: (checked: boolean) => lockMutation.mutate({locked: checked}),
            disabled: !canLock || lockMutation.isPending,
            hidden: isNew,
        },
    ]);

    if (isLoading && !isNew) {
        return <Box p="4"><Text>{t('msg_loading', 'Loading...')}</Text></Box>;
    }

    return (
        <Flex direction="column" gap="4" p="4">
            {existing && selectedSchema && (
                <ConfigEditBanners
                    cfg={existing}
                    schema={selectedSchema}
                    currentUserLogin={user?.username ?? ''}
                    onSaveSuccess={handleSaveSuccess}
                    onSaveRef={onSaveRef}
                    isSaving={isSaving}
                    setIsSaving={setIsSaving}
                />
            )}
            {isLocked && (
                <Callout.Root color="amber">
                    <Callout.Icon><Lock size={14}/></Callout.Icon>
                    <Callout.Text>
                        {t('msg_config_locked', 'This configuration is locked and cannot be edited.')}
                    </Callout.Text>
                </Callout.Root>
            )}
            <Card size="3">
                <Flex direction="column" gap="3">
                    <Box>
                        <Text as="div" size="2" mb="1" weight="bold">
                            {t('lbl_name', 'Name')}
                        </Text>
                        <TextField.Root
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('ph_config_name', 'Configuration name...')}
                            disabled={isLocked}
                        />
                    </Box>

                    <Box>
                        <Text as="label" size="2" mb="1" weight="bold">
                            {t('lbl_schema', 'Schema')}
                        </Text>
                        <Select.Root
                            value={schemaId}
                            onValueChange={setSchemaId}
                            disabled={isLocked || !isNew}
                        >
                            <Select.Trigger
                                placeholder={t('ph_select_schema', 'Select a schema...')}
                                style={{width: '100%'}}
                            />
                            <Select.Content>
                                {schemas?.map(s => (
                                    <Select.Item key={s.id} value={s.id}>
                                        <Flex gap="2" align="center">
                                            <CurlyBraces size={16} className="text-(--cyan-9)"/>
                                            {s.name}
                                            <Badge size="1" color="gray">{FLAVOR_LABELS[s.flavor]}</Badge>
                                        </Flex>
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </Box>

                    <Box>
                        <Text as="div" size="2" mb="1" weight="bold">
                            {t('lbl_flavor', 'Flavor')}
                        </Text>
                        <Badge color="blue">{FLAVOR_LABELS[flavor]}</Badge>
                    </Box>

                    <Box>
                        <Text as="label" size="2" mb="1" weight="bold">
                            {t('lbl_linked_environment', 'Linked Environment')}
                        </Text>
                        <Select.Root
                            value={envId ?? 'none'}
                            onValueChange={(val) => setEnvId(val === 'none' ? undefined : val)}
                            disabled={isLocked}
                        >
                            <Select.Trigger
                                placeholder={t('ph_select_environment', 'Select an environment...')}
                                style={{width: '100%'}}
                            />
                            <Select.Content>
                                <Select.Item value="none">{t('lbl_none', 'None')}</Select.Item>
                                {environments?.map(env => (
                                    <Select.Item key={env.id} value={env.id}>
                                        <Flex gap="2" align="center">
                                            <Waypoints size={16} className="text-(--crimson-9)"/>
                                            {env.name}
                                        </Flex>
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>
                    </Box>

                    {selectedSchema?.description && (
                        <Box>
                            <Badge color="blue">{selectedSchema.description}</Badge>
                        </Box>
                    )}
                </Flex>
            </Card>
        </Flex>
    );
};

export default ConfigurationEdit;
