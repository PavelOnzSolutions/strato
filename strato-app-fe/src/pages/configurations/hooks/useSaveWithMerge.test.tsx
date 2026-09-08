import {describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {useSaveWithMerge} from './useSaveWithMerge';
import {VersionConflictError} from '../api/VersionConflictError';
import {IConfiguration} from '../../../models/configuration.model';

const baseConfig: IConfiguration = {
    id: 'cfg', documentId: 'doc', version: 2, name: 'c',
    schemaId: 'sch', flavor: 'AZURE' as any, data: {sec: {item: {a: 1}}},
};

describe('useSaveWithMerge', () => {
    it('on 200, calls resetBaseAfterSave and markAuthored, returns saved', async () => {
        const saved: IConfiguration = {...baseConfig, version: 3};
        const saveConfig = vi.fn().mockResolvedValue(saved);
        const resetBaseAfterSave = vi.fn();
        const markAuthored = vi.fn();

        const {result} = renderHook(() => useSaveWithMerge({
            saveConfig, getBase: () => baseConfig, resetBaseAfterSave, markAuthored,
        }));

        await act(async () => {
            const res = await result.current.attemptSave({...baseConfig, baseVersion: 2});
            expect(res.status).toBe('saved');
        });

        expect(resetBaseAfterSave).toHaveBeenCalledWith(saved);
        expect(markAuthored).toHaveBeenCalledWith(3);
    });

    it('on 409 with no real conflicts, auto-merges and retries (success)', async () => {
        const latest: IConfiguration = {...baseConfig, version: 3, data: {sec: {item: {a: 1, b: 2}}}};
        const finalSaved: IConfiguration = {...baseConfig, version: 4};
        const saveConfig = vi.fn()
            .mockRejectedValueOnce(new VersionConflictError({
                code: 'CONFIG_VERSION_CONFLICT', latestVersion: 3, latest,
            }))
            .mockResolvedValueOnce(finalSaved);

        const {result} = renderHook(() => useSaveWithMerge({
            saveConfig, getBase: () => baseConfig, resetBaseAfterSave: vi.fn(), markAuthored: vi.fn(),
        }));

        await act(async () => {
            const res = await result.current.attemptSave({
                ...baseConfig, baseVersion: 2, data: {sec: {item: {a: 1, c: 3}}},
            });
            expect(res.status).toBe('saved');
        });

        expect(saveConfig).toHaveBeenCalledTimes(2);
        const secondArg = saveConfig.mock.calls[1][0];
        expect(secondArg.baseVersion).toBe(3);
        expect(secondArg.data).toEqual({sec: {item: {a: 1, b: 2, c: 3}}});
    });

    it('on 409 with real conflicts, returns conflicts result', async () => {
        const latest: IConfiguration = {...baseConfig, version: 3, data: {sec: {item: {a: 99}}}};
        const saveConfig = vi.fn().mockRejectedValue(new VersionConflictError({
            code: 'CONFIG_VERSION_CONFLICT', latestVersion: 3, latest,
        }));

        const {result} = renderHook(() => useSaveWithMerge({
            saveConfig, getBase: () => baseConfig, resetBaseAfterSave: vi.fn(), markAuthored: vi.fn(),
        }));

        await act(async () => {
            const res = await result.current.attemptSave({
                ...baseConfig, baseVersion: 2, data: {sec: {item: {a: 42}}},
            });
            expect(res.status).toBe('conflicts');
            if (res.status === 'conflicts') {
                expect(res.conflicts).toHaveLength(1);
                expect(res.latest).toEqual(latest);
            }
        });
    });

    it('on generic error, returns error result without calling resetBaseAfterSave', async () => {
        const saveConfig = vi.fn().mockRejectedValue(new Error('Network down'));
        const resetBaseAfterSave = vi.fn();

        const {result} = renderHook(() => useSaveWithMerge({
            saveConfig, getBase: () => baseConfig, resetBaseAfterSave, markAuthored: vi.fn(),
        }));

        await act(async () => {
            const res = await result.current.attemptSave({...baseConfig, baseVersion: 2});
            expect(res.status).toBe('error');
        });

        expect(resetBaseAfterSave).not.toHaveBeenCalled();
    });
});
