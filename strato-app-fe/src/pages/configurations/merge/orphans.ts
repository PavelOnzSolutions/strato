import {ConfigurationData, IConfigurationSchema} from '../../../models/configuration.model';

export function findOrphanPaths(
    data: ConfigurationData,
    schema: IConfigurationSchema,
): Array<[string, string, string]> {
    const knownPerSection = new Map<string, Set<string>>();
    for (const section of schema.sections ?? []) {
        const names = new Set((section.customFields ?? []).map((f) => f.name));
        knownPerSection.set(section.catalogEntryDocumentId, names);
    }
    const out: Array<[string, string, string]> = [];
    for (const [sec, items] of Object.entries(data ?? {})) {
        const known = knownPerSection.get(sec);
        if (!known) {
            for (const [item, fields] of Object.entries(items ?? {})) {
                for (const field of Object.keys(fields ?? {})) out.push([sec, item, field]);
            }
            continue;
        }
        for (const [item, fields] of Object.entries(items ?? {})) {
            for (const field of Object.keys(fields ?? {})) {
                if (!known.has(field)) out.push([sec, item, field]);
            }
        }
    }
    return out;
}
