import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {IConfiguration, IConfigurationSchema} from '../../../models/configuration.model';
import {useWebSocket, WebSocketEvent} from '../../../context/WebSocketContext';
import {useToast} from '../../../context/ToastContext';
import {mergeConfigData} from '../merge/configMerge';

export interface EditorStateBase {
    config: IConfiguration;
    schema: IConfigurationSchema;
}

export interface ConfigurationEditorState {
    base: EditorStateBase;
    working: IConfiguration;
    latest: IConfiguration | null;
    latestSchema: IConfigurationSchema | null;
    lastPromptedSchemaTimestamp: string | null;
    hasRemoteConfigUpdate: boolean;
    hasRemoteSchemaUpdate: boolean;
    hasLocalEdits: boolean;
    deletedBy: string | null;
    setWorking: (next: IConfiguration) => void;
    acceptLatestSchema: () => void;
    dismissSchemaPrompt: () => void;
    markAuthored: (version: number) => void;
    resetBaseAfterSave: (saved: IConfiguration, schema?: IConfigurationSchema) => void;
    clearDeletedFlag: () => void;
    _ingestConfigBroadcast?: (payload: IConfiguration, user: string) => void;
    _ingestSchemaBroadcast?: (payload: IConfigurationSchema, user: string) => void;
    _ingestConfigDelete?: (entityId: string, user: string) => void;
}

function deepEqualJson(a: unknown, b: unknown): boolean {
    return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

export function useConfigurationEditorState(args: {
    initialConfig: IConfiguration;
    initialSchema: IConfigurationSchema;
    currentUserLogin: string;
}): ConfigurationEditorState {
    const {initialConfig, initialSchema, currentUserLogin} = args;
    const [base, setBase] = useState<EditorStateBase>({config: initialConfig, schema: initialSchema});
    const [working, setWorking] = useState<IConfiguration>(initialConfig);
    const [latest, setLatest] = useState<IConfiguration | null>(null);
    const [latestSchema, setLatestSchema] = useState<IConfigurationSchema | null>(null);
    const [lastPromptedSchemaTimestamp, setLastPromptedSchemaTimestamp] = useState<string | null>(null);
    const [authoredVersions, setAuthoredVersions] = useState<Set<number>>(new Set());
    const [deletedBy, setDeletedBy] = useState<string | null>(null);

    const {showToast} = useToast();
    const {subscribe, addNotification} = useWebSocket();

    // Ref that always reflects the latest state without being a useCallback dep.
    // Reading from this ref inside stable callbacks (ingest*) eliminates:
    //   - H1: subscription churn on every keystroke (working.data changed → new callback → re-subscribe)
    //   - H2: stale closure — merge always uses the absolute latest working + base data
    const stateRef = useRef({base, working, authoredVersions, currentUserLogin});
    useEffect(() => {
        stateRef.current = {base, working, authoredVersions, currentUserLogin};
    });

    // Helper: fire toast + bell notification for a remote change that passed all filters.
    const emitRemoteChangeNotification = useCallback((
        message: string,
        toastType: 'info' | 'error',
        notificationType: string,
    ) => {
        showToast(message, toastType);
        addNotification({
            id: crypto.randomUUID(),
            type: notificationType,
            payload: {message},
            timestamp: Date.now(),
            read: false,
        } satisfies WebSocketEvent);
    }, [showToast, addNotification]);

    const markAuthored = useCallback((version: number) => {
        setAuthoredVersions((s) => {
            const next = new Set(s);
            next.add(version);
            return next;
        });
    }, []);

    const resetBaseAfterSave = useCallback((saved: IConfiguration, schema?: IConfigurationSchema) => {
        setBase((prev) => ({config: saved, schema: schema ?? prev.schema}));
        setWorking(saved);
        setLatest(null);
        // Prune authoredVersions strictly below the new base version.
        setAuthoredVersions((s) => new Set(Array.from(s).filter((v) => v >= (saved.version ?? 0))));
    }, []);

    const acceptLatestSchema = useCallback(() => {
        setBase((prev) => latestSchema ? {...prev, schema: latestSchema} : prev);
        const ts = latestSchema?.lastModifiedDate ?? null;
        setLatestSchema(null);
        setLastPromptedSchemaTimestamp(ts);
    }, [latestSchema]);

    const dismissSchemaPrompt = useCallback(() => {
        setLastPromptedSchemaTimestamp(latestSchema?.lastModifiedDate ?? null);
    }, [latestSchema]);

    const ingestConfigBroadcast = useCallback((payload: IConfiguration, user: string) => {
        const {
            base: curBase,
            working: curWorking,
            authoredVersions: curAuthored,
            currentUserLogin: curUser,
        } = stateRef.current;

        if (payload.documentId !== curBase.config.documentId) return;
        if (user === curUser
            && payload.version != null
            && curAuthored.has(payload.version)) {
            return; // echo of user's own save
        }
        const baseVersion = curBase.config.version ?? 0;
        const payloadVersion = payload.version ?? 0;
        if (payloadVersion <= baseVersion) return;

        // Immediate 3-way merge against current working state.
        const hadLocalEdits = !deepEqualJson(curWorking.data, curBase.config.data);
        const result = mergeConfigData(curBase.config.data ?? {}, curWorking.data ?? {}, payload.data ?? {});

        if (result.conflicts.length === 0) {
            console.log('[ingestConfigBroadcast] merge result', {
                conflicts: result.conflicts.length,
                mergedData: JSON.stringify(result.merged).slice(0, 200),
                incomingVersion: payload.version,
            });
            // Silent pull — base advances, working absorbs the merge.
            setBase((prev) => ({...prev, config: payload}));
            setWorking((prev) => ({
                ...prev,
                data: result.merged,
                version: payload.version,
            }));
            console.log('[ingestConfigBroadcast] setBase/setWorking dispatched');
            // latest stays null — no banner.
            const message = hadLocalEdits
                ? `Auto-merged update from ${user} (v${payload.version})`
                : `Configuration "${initialConfig.name}" was updated to v${payload.version} by ${user}`;
            emitRemoteChangeNotification(message, 'info', 'CONFIG_REMOTE_UPDATE');
            return;
        }

        // Conflicts present — keep today's behavior: surface banner, modal on save.
        setLatest(payload);
        emitRemoteChangeNotification(
            `Configuration "${initialConfig.name}" was updated by ${user} (v${payload.version}) — resolve conflicts on save.`,
            'info',
            'CONFIG_REMOTE_UPDATE',
        );
    }, [emitRemoteChangeNotification, initialConfig.name]);

    const ingestSchemaBroadcast = useCallback((payload: IConfigurationSchema, user: string) => {
        const {base: curBase} = stateRef.current;
        if (payload.id !== curBase.config.schemaId) return;
        const baseTs = curBase.schema.lastModifiedDate ?? '';
        const payloadTs = payload.lastModifiedDate ?? '';
        if (payloadTs <= baseTs) return;
        setLatestSchema(payload);
        emitRemoteChangeNotification(
            `Schema "${initialSchema.name}" was updated by ${user}`,
            'info',
            'SCHEMA_REMOTE_UPDATE',
        );
    }, [emitRemoteChangeNotification, initialSchema.name]);

    const clearDeletedFlag = useCallback(() => setDeletedBy(null), []);

    const ingestConfigDelete = useCallback((entityId: string, user: string) => {
        const {base: curBase} = stateRef.current;
        if (entityId !== curBase.config.documentId) return;
        setDeletedBy(user);
        emitRemoteChangeNotification(
            `Configuration "${initialConfig.name}" was deleted by ${user}`,
            'error',
            'CONFIG_REMOTE_DELETE',
        );
    }, [emitRemoteChangeNotification, initialConfig.name]);

    const hasRemoteConfigUpdate = useMemo(
        () => latest != null && (latest.version ?? 0) > (base.config.version ?? 0),
        [latest, base.config.version],
    );
    const hasRemoteSchemaUpdate = useMemo(
        () => latestSchema != null
            && (latestSchema.lastModifiedDate ?? '') > (base.schema.lastModifiedDate ?? ''),
        [latestSchema, base.schema.lastModifiedDate],
    );
    const hasLocalEdits = useMemo(
        () => !deepEqualJson(working.data, base.config.data),
        [working.data, base.config.data],
    );

    useEffect(() => {
        const unsub1 = subscribe('/topic/observable/configurations', (msg: any) => {
            if (msg?.operation === 'DELETE') {
                // DELETE events now carry msg.documentId on versioned entities.
                const docId = msg?.documentId;
                if (docId) {
                    ingestConfigDelete(docId, msg.user ?? 'unknown');
                }
                return;
            }
            // CREATE / UPDATE: filter by payload.documentId (stable UUID),
            // NOT msg.entityId (which is the per-version _id).
            if (msg?.payload) {
                ingestConfigBroadcast(msg.payload as IConfiguration, msg.user ?? 'unknown');
            }
        });
        const unsub2 = subscribe('/topic/observable/configuration_schemas', (msg: any) => {
            if (msg?.operation === 'DELETE') return;
            if (msg?.payload) {
                ingestSchemaBroadcast(msg.payload as IConfigurationSchema, msg.user ?? 'unknown');
            }
        });
        return () => {
            unsub1 && unsub1();
            unsub2 && unsub2();
        };
    }, [subscribe, ingestConfigBroadcast, ingestSchemaBroadcast, ingestConfigDelete]);

    return {
        base, working, latest, latestSchema, lastPromptedSchemaTimestamp,
        hasRemoteConfigUpdate, hasRemoteSchemaUpdate, hasLocalEdits,
        deletedBy,
        setWorking, acceptLatestSchema, dismissSchemaPrompt, markAuthored, resetBaseAfterSave,
        clearDeletedFlag,
        _ingestConfigBroadcast: ingestConfigBroadcast,
        _ingestSchemaBroadcast: ingestSchemaBroadcast,
        _ingestConfigDelete: ingestConfigDelete,
    };
}
