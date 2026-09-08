import {IConfigurationSchema} from '../../../models/configuration.model';
import {ISectionCatalogEntry} from '../../../models/section-catalog.model';

export interface SchemaDiffSummary {
    added: string[];
    removed: string[];
    typeChanged: string[];
}

/** Marks a diff entry as a whole-section change (vs. a bare field name). */
export const SECTION_DIFF_PREFIX = 'section:';

/**
 * Resolve a section's {@link ISchemaSection.catalogEntryDocumentId} to the
 * human-readable catalog displayName. Falls back to the id when the catalog is
 * unavailable or the entry is unknown, so callers degrade gracefully.
 */
export function sectionIdToName(
    sectionId: string,
    catalogByDocId?: Map<string, ISectionCatalogEntry>,
): string {
    return catalogByDocId?.get(sectionId)?.displayName ?? sectionId;
}

export function summarizeSchemaDiff(
    a: IConfigurationSchema,
    b: IConfigurationSchema,
): SchemaDiffSummary {
    const aIds = new Set(a.sections.map((s) => s.catalogEntryDocumentId));
    const bIds = new Set(b.sections.map((s) => s.catalogEntryDocumentId));
    const added: string[] = [];
    const removed: string[] = [];
    const typeChanged: string[] = [];

    for (const id of aIds) if (!bIds.has(id)) removed.push(`${SECTION_DIFF_PREFIX}${id}`);
    for (const id of bIds) if (!aIds.has(id)) added.push(`${SECTION_DIFF_PREFIX}${id}`);

    const sectionsById = (s: IConfigurationSchema) =>
        Object.fromEntries(s.sections.map((sec) => [sec.catalogEntryDocumentId, sec]));
    const aMap = sectionsById(a);
    const bMap = sectionsById(b);

    for (const id of aIds) {
        if (!bIds.has(id)) continue;
        const aSec = aMap[id];
        const bSec = bMap[id];
        const aFields = new Map<string, unknown>(aSec.customFields.map((f) => [f.name, f]));
        const bFields = new Map<string, unknown>(bSec.customFields.map((f) => [f.name, f]));
        for (const [name] of aFields) if (!bFields.has(name)) removed.push(name);
        for (const [name] of bFields) if (!aFields.has(name)) added.push(name);
        for (const [name, af] of aFields) {
            const bf = bFields.get(name);
            if (bf && JSON.stringify(af) !== JSON.stringify(bf)) typeChanged.push(name);
        }
    }
    return {added, removed, typeChanged};
}

