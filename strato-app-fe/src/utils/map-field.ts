/**
 * Pure serialize/parse helpers for MAP_OF_STRING / MAP_OF_OBJECT field editors.
 *
 * A map field is stored as a plain object with dynamic string keys. The editor
 * works on an ordered list of entries so keys can be typed/renamed without losing
 * focus or collapsing duplicate keys mid-typing; these helpers convert between the
 * two representations.
 */
export interface MapEntry {
    key: string;
    value: unknown;
}

/** Convert a stored map object into ordered editable entries. Non-object input → []. */
export const objectToEntries = (value: unknown): MapEntry[] => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return [];
    return Object.entries(value as Record<string, unknown>).map(([key, v]) => ({key, value: v}));
};

/**
 * Serialize editable entries back into a plain object.
 * Keys are trimmed; empty/whitespace-only keys are omitted; on duplicate keys the
 * last occurrence wins (matching object-literal semantics).
 */
export const entriesToObject = (entries: MapEntry[]): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const {key, value} of entries) {
        const k = key.trim();
        if (k.length === 0) continue;
        out[k] = value;
    }
    return out;
};
