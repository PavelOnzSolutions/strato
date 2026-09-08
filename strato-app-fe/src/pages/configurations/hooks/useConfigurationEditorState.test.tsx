import {describe, expect, it, vi, beforeEach} from 'vitest';
import {act, renderHook} from '@testing-library/react';

const mockShowToast = vi.fn();
const mockAddNotification = vi.fn();

// Handlers registered by the hook's useEffect subscribe calls.
// Tests that go through the real WS handler path use triggerMessage to fire them.
type SubscribeCb = (msg: any) => void;
const subscribedHandlers = new Map<string, SubscribeCb[]>();

const triggerMessage = (topic: string, msg: any) => {
    (subscribedHandlers.get(topic) ?? []).forEach((cb) => cb(msg));
};

const mockSubscribe = vi.fn((topic: string, cb: SubscribeCb) => {
    const arr = subscribedHandlers.get(topic) ?? [];
    arr.push(cb);
    subscribedHandlers.set(topic, arr);
    return () => {
        const list = subscribedHandlers.get(topic) ?? [];
        const idx = list.indexOf(cb);
        if (idx >= 0) list.splice(idx, 1);
    };
});

// Mock the WebSocketContext to prevent actual STOMP wiring during unit tests.
// The mock returns a capturing subscribe so existing tests using `_ingest*` helpers
// still work, and new tests can also drive the real WS handler path via triggerMessage.
vi.mock('../../../context/WebSocketContext', () => ({
    useWebSocket: () => ({
        subscribe: mockSubscribe,
        addNotification: mockAddNotification,
        connected: true,
    }),
    useWebSocketSubscribe: () => undefined,
}));

vi.mock('../../../context/ToastContext', () => ({
    useToast: () => ({showToast: mockShowToast}),
}));

import {useConfigurationEditorState} from './useConfigurationEditorState';
import {IConfiguration, IConfigurationSchema} from '../../../models/configuration.model';

const SCHEMA_BASE_TS = '2026-05-25T10:00:00Z';
const SCHEMA_NEWER_TS = '2026-05-25T11:00:00Z';

const baseConfig: IConfiguration = {
    id: 'cfg-id', documentId: 'cfg-doc', version: 2, name: 'c',
    schemaId: 'sch-id', flavor: 'AZURE' as any,
    data: {sec: {item: {field: 'orig'}}},
};
const baseSchema: IConfigurationSchema = {
    id: 'sch-id', name: 's', flavor: 'AZURE' as any, sections: [],
    lastModifiedDate: SCHEMA_BASE_TS,
};

describe('useConfigurationEditorState — buffers and derived flags', () => {
    beforeEach(() => {
        subscribedHandlers.clear();
        mockSubscribe.mockClear();
    });

    it('starts with base = working, no remote updates', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        expect(result.current.hasLocalEdits).toBe(false);
        expect(result.current.hasRemoteConfigUpdate).toBe(false);
        expect(result.current.hasRemoteSchemaUpdate).toBe(false);
        expect(result.current.latest).toBeNull();
    });

    it('hasLocalEdits flips when working data diverges from base', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current.setWorking({
            ...baseConfig, data: {sec: {item: {field: 'edited'}}},
        }));
        expect(result.current.hasLocalEdits).toBe(true);
    });

    it('resetBaseAfterSave clears latest and updates base', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        const saved: IConfiguration = {...baseConfig, version: 3};
        act(() => result.current.resetBaseAfterSave(saved));
        expect(result.current.base.config.version).toBe(3);
        expect(result.current.latest).toBeNull();
        expect(result.current.hasRemoteConfigUpdate).toBe(false);
    });
});

describe('useConfigurationEditorState — broadcast ingest', () => {
    beforeEach(() => {
        subscribedHandlers.clear();
        mockSubscribe.mockClear();
    });

    it('silently pulls when newer version broadcast arrives with no local edits and no conflicts', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestConfigBroadcast!({...baseConfig, version: 3}, 'jane'));
        // No conflict, no local edits — silent pull: base advances, latest stays null.
        expect(result.current.hasRemoteConfigUpdate).toBe(false);
        expect(result.current.latest).toBeNull();
        expect(result.current.base.config.version).toBe(3);
    });

    it('ignores broadcasts for other documentIds', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestConfigBroadcast!({...baseConfig, documentId: 'other', version: 99}, 'jane'));
        expect(result.current.hasRemoteConfigUpdate).toBe(false);
    });

    it('suppresses own save broadcast when version is in authoredVersions', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current.markAuthored(3));
        act(() => result.current._ingestConfigBroadcast!({...baseConfig, version: 3}, 'joe'));
        expect(result.current.hasRemoteConfigUpdate).toBe(false);
    });

    it('does not suppress when a different user produced the same version', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current.markAuthored(3));
        act(() => result.current._ingestConfigBroadcast!({...baseConfig, version: 3}, 'jane'));
        // No local edits, no conflicts — silent pull (base advances, no banner).
        expect(result.current.base.config.version).toBe(3);
        expect(result.current.latest).toBeNull();
        expect(result.current.hasRemoteConfigUpdate).toBe(false);
    });

    it('schema broadcast sets latestSchema when newer lastModifiedDate arrives', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestSchemaBroadcast!({...baseSchema, lastModifiedDate: SCHEMA_NEWER_TS}, 'jane'));
        expect(result.current.hasRemoteSchemaUpdate).toBe(true);
    });

    it('schema broadcast ignored when payload has same or older lastModifiedDate', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestSchemaBroadcast!({...baseSchema, lastModifiedDate: SCHEMA_BASE_TS}, 'jane'));
        expect(result.current.hasRemoteSchemaUpdate).toBe(false);
    });

    it('acceptLatestSchema swaps base.schema and clears latestSchema', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestSchemaBroadcast!({...baseSchema, lastModifiedDate: SCHEMA_NEWER_TS}, 'jane'));
        act(() => result.current.acceptLatestSchema());
        expect(result.current.base.schema.lastModifiedDate).toBe(SCHEMA_NEWER_TS);
        expect(result.current.hasRemoteSchemaUpdate).toBe(false);
        expect(result.current.lastPromptedSchemaTimestamp).toBe(SCHEMA_NEWER_TS);
    });
});

describe('useConfigurationEditorState — delete detection', () => {
    beforeEach(() => {
        subscribedHandlers.clear();
        mockSubscribe.mockClear();
    });

    it('sets deletedBy when DELETE broadcast arrives for current documentId', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestConfigDelete!(baseConfig.documentId, 'jane'));
        expect(result.current.deletedBy).toBe('jane');
    });

    it('ignores DELETE for a different documentId', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestConfigDelete!('other-doc', 'jane'));
        expect(result.current.deletedBy).toBeNull();
    });

    it('clearDeletedFlag resets the flag', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestConfigDelete!(baseConfig.documentId, 'jane'));
        expect(result.current.deletedBy).toBe('jane');
        act(() => result.current.clearDeletedFlag());
        expect(result.current.deletedBy).toBeNull();
    });
});

describe('useConfigurationEditorState — remote-change side effects', () => {
    beforeEach(() => {
        subscribedHandlers.clear();
        mockSubscribe.mockClear();
        mockShowToast.mockClear();
        mockAddNotification.mockClear();
    });

    it('shows toast and adds notification on config update broadcast', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestConfigBroadcast!({...baseConfig, version: 3}, 'jane'));
        expect(mockShowToast).toHaveBeenCalledWith(
            expect.stringContaining('jane'), 'info',
        );
        expect(mockAddNotification).toHaveBeenCalledTimes(1);
        expect(mockAddNotification.mock.calls[0][0]).toMatchObject({
            type: 'CONFIG_REMOTE_UPDATE',
            read: false,
        });
    });

    it('shows toast and adds notification on schema update broadcast', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestSchemaBroadcast!({...baseSchema, lastModifiedDate: SCHEMA_NEWER_TS}, 'jane'));
        expect(mockShowToast).toHaveBeenCalledWith(
            expect.stringContaining('jane'), 'info',
        );
        expect(mockAddNotification).toHaveBeenCalledTimes(1);
        expect(mockAddNotification.mock.calls[0][0]).toMatchObject({
            type: 'SCHEMA_REMOTE_UPDATE',
            read: false,
        });
    });

    it('does not toast/notify on echo of own save', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current.markAuthored(3));
        act(() => result.current._ingestConfigBroadcast!({...baseConfig, version: 3}, 'joe'));
        expect(mockShowToast).not.toHaveBeenCalled();
        expect(mockAddNotification).not.toHaveBeenCalled();
    });

    it('does not toast/notify on config broadcast for a different documentId', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestConfigBroadcast!({...baseConfig, documentId: 'other-doc', version: 99}, 'jane'));
        expect(mockShowToast).not.toHaveBeenCalled();
        expect(mockAddNotification).not.toHaveBeenCalled();
    });

    it('shows error toast and adds notification on config DELETE for current documentId', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestConfigDelete!(baseConfig.documentId, 'jane'));
        expect(mockShowToast).toHaveBeenCalledWith(
            expect.stringContaining('jane'), 'error',
        );
        expect(mockAddNotification).toHaveBeenCalledTimes(1);
        expect(mockAddNotification.mock.calls[0][0]).toMatchObject({
            type: 'CONFIG_REMOTE_DELETE',
            read: false,
        });
    });
});

describe('useConfigurationEditorState — real WS handler path', () => {
    beforeEach(() => {
        subscribedHandlers.clear();
        mockSubscribe.mockClear();
        mockShowToast.mockClear();
        mockAddNotification.mockClear();
    });

    it('config UPDATE message with matching payload.documentId triggers ingest', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => triggerMessage('/topic/observable/configurations', {
            operation: 'UPDATE',
            entityId: 'some-version-mongo-id',    // wrong on purpose — should be ignored
            payload: {...baseConfig, version: 3}, // documentId matches base.config.documentId
            user: 'jane',
        }));
        // No local edits, no conflicts — silent pull: base advances, latest stays null.
        expect(result.current.hasRemoteConfigUpdate).toBe(false);
        expect(result.current.latest).toBeNull();
        expect(result.current.base.config.version).toBe(3);
        expect(mockShowToast).toHaveBeenCalled();
    });

    it('config UPDATE message with non-matching payload.documentId is ignored', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => triggerMessage('/topic/observable/configurations', {
            operation: 'UPDATE',
            entityId: 'some-version-mongo-id',
            payload: {...baseConfig, documentId: 'other-doc-id', version: 3},
            user: 'jane',
        }));
        expect(result.current.hasRemoteConfigUpdate).toBe(false);
        expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('schema UPDATE with matching payload.id and newer lastModifiedDate triggers ingest', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => triggerMessage('/topic/observable/configuration_schemas', {
            operation: 'UPDATE',
            entityId: 'schema-mongo-id',
            payload: {...baseSchema, lastModifiedDate: SCHEMA_NEWER_TS},
            user: 'jane',
        }));
        expect(result.current.hasRemoteSchemaUpdate).toBe(true);
        expect(result.current.latestSchema?.lastModifiedDate).toBe(SCHEMA_NEWER_TS);
    });

    it('config DELETE with msg.documentId matching base triggers ingest', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => triggerMessage('/topic/observable/configurations', {
            operation: 'DELETE',
            documentId: baseConfig.documentId,
            ids: ['old-version-id'],
            user: 'jane',
        }));
        expect(result.current.deletedBy).toBe('jane');
    });

    it('config DELETE without msg.documentId is ignored', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => triggerMessage('/topic/observable/configurations', {
            operation: 'DELETE',
            ids: ['old-version-id'],
            user: 'jane',
        }));
        expect(result.current.deletedBy).toBeNull();
    });
});

describe('useConfigurationEditorState — stale-closure regression (H1/H2)', () => {
    beforeEach(() => {
        subscribedHandlers.clear();
        mockShowToast.mockClear();
        mockAddNotification.mockClear();
    });

    it('uses latest working data even after rapid state changes (no stale closure)', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        // First edit — sets mine: 'first'
        act(() => result.current.setWorking({
            ...baseConfig, data: {sec: {item: {field: 'orig', mine: 'first'}}},
        }));
        // Second edit — overwrites mine: 'second'
        act(() => result.current.setWorking({
            ...baseConfig, data: {sec: {item: {field: 'orig', mine: 'second'}}},
        }));
        // Broadcast arrives — should merge against LATEST working ('second'), not 'first'
        act(() => result.current._ingestConfigBroadcast!({
            ...baseConfig, version: 3, data: {sec: {item: {field: 'orig', theirs: 'janeAdd'}}},
        }, 'jane'));
        expect(result.current.working.data).toEqual({
            sec: {item: {field: 'orig', mine: 'second', theirs: 'janeAdd'}},
        });
    });
});

describe('useConfigurationEditorState — auto-merge on broadcast', () => {
    beforeEach(() => {
        subscribedHandlers.clear();
        mockShowToast.mockClear();
        mockAddNotification.mockClear();
    });

    it('silently pulls when there are no local edits and no conflicts', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestConfigBroadcast!({
            ...baseConfig, version: 3, data: {sec: {item: {field: 'theirs'}}},
        }, 'jane'));
        expect(result.current.base.config.version).toBe(3);
        expect(result.current.working.data).toEqual({sec: {item: {field: 'theirs'}}});
        expect(result.current.latest).toBeNull();
        expect(result.current.hasRemoteConfigUpdate).toBe(false);
        expect(mockShowToast).toHaveBeenCalledWith(
            expect.stringContaining('updated to v3'), 'info'
        );
    });

    it('auto-merges working edits with incoming non-conflicting changes', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        // Joe edits a different field
        act(() => result.current.setWorking({
            ...baseConfig, data: {sec: {item: {field: 'orig', mine: 'joeEdit'}}},
        }));
        // Jane saves a non-conflicting change (different leaf)
        act(() => result.current._ingestConfigBroadcast!({
            ...baseConfig, version: 3, data: {sec: {item: {field: 'orig', theirs: 'janeAdd'}}},
        }, 'jane'));
        expect(result.current.base.config.version).toBe(3);
        expect(result.current.working.data).toEqual({
            sec: {item: {field: 'orig', mine: 'joeEdit', theirs: 'janeAdd'}},
        });
        expect(result.current.latest).toBeNull();
        expect(mockShowToast).toHaveBeenCalledWith(
            expect.stringContaining('Auto-merged'), 'info'
        );
    });

    it('falls back to banner when conflicts exist', () => {
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        // Joe changes "field" locally
        act(() => result.current.setWorking({
            ...baseConfig, data: {sec: {item: {field: 'joe'}}},
        }));
        // Jane changes the SAME "field" — real conflict
        act(() => result.current._ingestConfigBroadcast!({
            ...baseConfig, version: 3, data: {sec: {item: {field: 'jane'}}},
        }, 'jane'));
        expect(result.current.base.config.version).toBe(2); // base did NOT advance
        expect(result.current.latest?.version).toBe(3);
        expect(result.current.hasRemoteConfigUpdate).toBe(true);
        // Working still has Joe's value — conflict not yet resolved
        expect(result.current.working.data).toEqual({sec: {item: {field: 'joe'}}});
        expect(mockShowToast).toHaveBeenCalledWith(
            expect.stringContaining('resolve conflicts on save'), 'info'
        );
    });

    it('pulled save uses the new base.version on next save', () => {
        // Sanity: after a silent pull, base.config.version is 3, so the
        // editor's save handler will send baseVersion=3.
        const {result} = renderHook(() => useConfigurationEditorState({
            initialConfig: baseConfig, initialSchema: baseSchema, currentUserLogin: 'joe',
        }));
        act(() => result.current._ingestConfigBroadcast!({
            ...baseConfig, version: 3, data: {sec: {item: {field: 'theirs'}}},
        }, 'jane'));
        expect(result.current.base.config.version).toBe(3);
        // working.version mirrors so any code reading working.version sees v3.
        expect(result.current.working.version).toBe(3);
    });
});
