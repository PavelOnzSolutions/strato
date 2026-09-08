import {ISectionCatalogEntry, ISectionItemField} from '../models/section-catalog.model';
import {ISchemaSection} from '../models/configuration.model';

/**
 * Frontend mirror of the backend materializer's composeFields.
 *
 * Produces the list of effective fields for a section by:
 *  1. Removing catalog fields whose dotted path is listed in
 *     `section.disabledFieldPaths` (cascades through nested fields).
 *  2. Appending `section.customFields` (overlay-defined additions).
 */
export const computeEffectiveFields = (
    catalog: ISectionCatalogEntry,
    section: ISchemaSection,
): ISectionItemField[] => {
    const disabled = new Set(section.disabledFieldPaths ?? []);
    const filtered = filterDisabled(catalog.itemFields ?? [], disabled, '');
    return [...filtered, ...(section.customFields ?? [])];
};

const filterDisabled = (
    fields: ISectionItemField[],
    disabled: Set<string>,
    prefix: string,
): ISectionItemField[] => {
    const out: ISectionItemField[] = [];
    for (const f of fields) {
        const path = prefix ? `${prefix}.${f.name}` : f.name;
        if (disabled.has(path)) continue;
        if (f.nestedFields?.length) {
            out.push({...f, nestedFields: filterDisabled(f.nestedFields, disabled, path)});
        } else {
            out.push(f);
        }
    }
    return out;
};

/**
 * Build the default value for a new section item by walking the effective
 * field list and consulting `overlayDefaults` (dotted-path keys from the
 * schema overlay) before falling back to `field.defaultValue` and finally a
 * type-appropriate zero value.
 */
export const buildItemDefaults = (
    fields: ISectionItemField[],
    overlayDefaults: Record<string, unknown>,
    prefix = '',
): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
        const path = prefix ? `${prefix}.${f.name}` : f.name;
        const overrideDefault = overlayDefaults[path];
        if (overrideDefault !== undefined) {
            out[f.name] = overrideDefault;
            continue;
        }
        if (f.nestedFields?.length && f.type === 'OBJECT') {
            out[f.name] = buildItemDefaults(f.nestedFields, overlayDefaults, path);
        } else if (f.nestedFields?.length && f.type === 'ARRAY_OF_OBJECT') {
            out[f.name] = [];
        } else if (f.defaultValue !== undefined) {
            out[f.name] = f.defaultValue;
        } else {
            switch (f.type) {
                case 'STRING':
                    out[f.name] = '';
                    break;
                case 'NUMBER':
                    out[f.name] = 0;
                    break;
                case 'BOOLEAN':
                    out[f.name] = false;
                    break;
                case 'ARRAY_OF_STRING':
                    out[f.name] = [];
                    break;
                case 'ARRAY_OF_OBJECT':
                    out[f.name] = [];
                    break;
                case 'OBJECT':
                    out[f.name] = {};
                    break;
                case 'MAP_OF_STRING':
                    out[f.name] = {};
                    break;
                case 'MAP_OF_OBJECT':
                    out[f.name] = {};
                    break;
            }
        }
    }
    return out;
};
