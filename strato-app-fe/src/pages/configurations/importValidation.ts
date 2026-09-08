import type {ConfigurationData, IConfigurationSchema} from '../../models/configuration.model';
import type {ISectionCatalogEntry} from '../../models/section-catalog.model';

export interface ParseDataResult {
    error: string | null;
    data: ConfigurationData | null;
}

/** Parse the pasted/uploaded text as the configuration `data` object.
 *  Accepts only a plain JSON object (sectionKey -> itemName -> fields).
 *  An empty object {} is valid. */
export function parseDataObject(raw: string): ParseDataResult {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        return {error: 'Invalid JSON: ' + (e as Error).message, data: null};
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {error: 'Data must be a JSON object', data: null};
    }
    return {error: null, data: parsed as ConfigurationData};
}

/** Return the top-level section keys present in `data` that are not declared
 *  in the given schema (resolved through the section catalog by documentId). */
export function findUnknownSectionKeys(
    data: ConfigurationData,
    schema: IConfigurationSchema,
    catalog: ISectionCatalogEntry[],
): string[] {
    const catalogById = new Map(catalog.map((e) => [e.documentId, e]));
    const known = new Set<string>();
    for (const s of schema.sections ?? []) {
        const entry = catalogById.get(s.catalogEntryDocumentId);
        if (entry) known.add(entry.sectionKey);
    }
    return Object.keys(data ?? {}).filter((k) => !known.has(k));
}
