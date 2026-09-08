import {useCallback} from 'react';
import {IConfiguration} from '../../../models/configuration.model';
import {VersionConflictError} from '../api/VersionConflictError';
import {mergeConfigData, MergeConflict} from '../merge/configMerge';

export type AttemptResult =
    | {status: 'saved'; saved: IConfiguration}
    | {status: 'conflicts'; conflicts: MergeConflict[]; merged: IConfiguration; latest: IConfiguration}
    | {status: 'error'; error: unknown};

interface Args {
    saveConfig: (config: IConfiguration) => Promise<IConfiguration>;
    getBase: () => IConfiguration;
    resetBaseAfterSave: (saved: IConfiguration) => void;
    markAuthored: (version: number) => void;
}

// Inner async loop used by both the initial attempt and the auto-merge retry
// path, so that `attemptSave`'s useCallback does not depend on itself.
async function saveLoop(
    toSave: IConfiguration,
    saveConfig: (config: IConfiguration) => Promise<IConfiguration>,
    getBase: () => IConfiguration,
    resetBaseAfterSave: (saved: IConfiguration) => void,
    markAuthored: (version: number) => void,
): Promise<AttemptResult> {
    try {
        const saved = await saveConfig(toSave);
        if (saved.version != null) markAuthored(saved.version);
        resetBaseAfterSave(saved);
        return {status: 'saved', saved};
    } catch (err) {
        if (err instanceof VersionConflictError && err.body.code === 'CONFIG_VERSION_CONFLICT') {
            const latest = err.body.latest as IConfiguration;
            const base = getBase();
            const result = mergeConfigData(base.data, toSave.data, latest.data);
            if (result.conflicts.length === 0) {
                // Auto-merge succeeded — retry with the clean merged copy.
                return saveLoop(
                    {...toSave, baseVersion: latest.version, data: result.merged},
                    saveConfig,
                    getBase,
                    resetBaseAfterSave,
                    markAuthored,
                );
            }
            const mergedConfig: IConfiguration = {...toSave, data: result.merged};
            return {status: 'conflicts', conflicts: result.conflicts, merged: mergedConfig, latest};
        }
        return {status: 'error', error: err};
    }
}

export function useSaveWithMerge(args: Args) {
    const {saveConfig, getBase, resetBaseAfterSave, markAuthored} = args;

    const attemptSave = useCallback(
        (toSave: IConfiguration): Promise<AttemptResult> =>
            saveLoop(toSave, saveConfig, getBase, resetBaseAfterSave, markAuthored),
        [saveConfig, getBase, resetBaseAfterSave, markAuthored],
    );

    return {attemptSave};
}
