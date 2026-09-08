import {ConfigurationData} from '../../../models/configuration.model';

export interface MergeConflict {
    path: [section: string, item: string, field: string];
    base: unknown;
    ours: unknown;
    theirs: unknown;
}

export interface MergeResult {
    merged: ConfigurationData;
    conflicts: MergeConflict[];
}

function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        return a.every((v, i) => deepEqual(v, (b as unknown[])[i]));
    }
    if (typeof a === 'object') {
        const ao = a as Record<string, unknown>;
        const bo = b as Record<string, unknown>;
        const ak = Object.keys(ao);
        const bk = Object.keys(bo);
        if (ak.length !== bk.length) return false;
        return ak.every((k) => deepEqual(ao[k], bo[k]));
    }
    return false;
}

const SEP = '\0';

function collectLeafPaths(
    base: ConfigurationData,
    ours: ConfigurationData,
    theirs: ConfigurationData,
): Array<[string, string, string]> {
    const out = new Set<string>();
    const visit = (root: ConfigurationData) => {
        for (const [sec, items] of Object.entries(root ?? {})) {
            for (const [item, fields] of Object.entries(items ?? {})) {
                for (const field of Object.keys(fields ?? {})) {
                    out.add(`${sec}${SEP}${item}${SEP}${field}`);
                }
            }
        }
    };
    visit(base);
    visit(ours);
    visit(theirs);
    return Array.from(out).map((s) => s.split(SEP) as [string, string, string]);
}

function readLeaf(root: ConfigurationData, sec: string, item: string, field: string): unknown {
    return root?.[sec]?.[item]?.[field];
}

function writeLeaf(
    root: ConfigurationData, sec: string, item: string, field: string, value: unknown,
): void {
    if (value === undefined) {
        if (root[sec]?.[item]) {
            delete root[sec][item][field];
            if (Object.keys(root[sec][item]).length === 0) delete root[sec][item];
            if (Object.keys(root[sec]).length === 0) delete root[sec];
        }
        return;
    }
    root[sec] ??= {};
    root[sec][item] ??= {};
    root[sec][item][field] = value;
}

export function mergeConfigData(
    base: ConfigurationData,
    ours: ConfigurationData,
    theirs: ConfigurationData,
): MergeResult {
    const merged: ConfigurationData = JSON.parse(JSON.stringify(ours ?? {}));
    const conflicts: MergeConflict[] = [];

    for (const [sec, item, field] of collectLeafPaths(base, ours, theirs)) {
        const b = readLeaf(base, sec, item, field);
        const o = readLeaf(ours, sec, item, field);
        const t = readLeaf(theirs, sec, item, field);

        const ourChanged = !deepEqual(b, o);
        const theirChanged = !deepEqual(b, t);

        if (!ourChanged && !theirChanged) continue;
        if (!ourChanged && theirChanged) {
            writeLeaf(merged, sec, item, field, t);
            continue;
        }
        if (ourChanged && !theirChanged) {
            writeLeaf(merged, sec, item, field, o);
            continue;
        }
        if (deepEqual(o, t)) {
            writeLeaf(merged, sec, item, field, o);
            continue;
        }
        conflicts.push({path: [sec, item, field], base: b, ours: o, theirs: t});
        writeLeaf(merged, sec, item, field, o);
    }

    return {merged, conflicts};
}

export interface Resolution {
    choice: 'ours' | 'theirs' | 'manual';
    value?: unknown;
}

export type ResolutionMap = Record<string, Resolution>;

export function resolutionKey(path: [string, string, string]): string {
    return path.join(SEP);
}

export function applyResolutions(
    merged: ConfigurationData,
    conflicts: MergeConflict[],
    resolutions: ResolutionMap,
): ConfigurationData {
    const out: ConfigurationData = JSON.parse(JSON.stringify(merged ?? {}));
    for (const c of conflicts) {
        const r = resolutions[resolutionKey(c.path)];
        if (!r || r.choice === 'ours') continue;
        const [sec, item, field] = c.path;
        const value = r.choice === 'theirs' ? c.theirs : r.value;
        writeLeaf(out, sec, item, field, value);
    }
    return out;
}
