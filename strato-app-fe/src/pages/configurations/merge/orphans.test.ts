import {describe, expect, it} from 'vitest';
import {findOrphanPaths} from './orphans';
import {ConfigurationData, IConfigurationSchema} from '../../../models/configuration.model';
import {Flavor} from '../../../constants/flavors';

const schemaWith = (fieldNames: string[]): IConfigurationSchema => ({
    id: 's', documentId: 'd', name: 'n', flavor: 'AZURE' as Flavor,
    sections: [{
        catalogEntryDocumentId: 'cat',
        disabledFieldPaths: [],
        fieldDefaults: {},
        customFields: fieldNames.map((n) => ({name: n} as any)),
    }],
});

describe('findOrphanPaths', () => {
    it('returns leaves not present in schema customFields', () => {
        const data: ConfigurationData = {cat: {item1: {known: 'x', orphan: 'y'}}};
        const orphans = findOrphanPaths(data, schemaWith(['known']));
        expect(orphans).toEqual([['cat', 'item1', 'orphan']]);
    });

    it('returns empty when all fields are in schema', () => {
        const data: ConfigurationData = {cat: {item1: {known: 'x'}}};
        const orphans = findOrphanPaths(data, schemaWith(['known']));
        expect(orphans).toEqual([]);
    });

    it('returns all leaves when section is not in schema', () => {
        const data: ConfigurationData = {ghost: {item1: {a: 1, b: 2}}};
        const orphans = findOrphanPaths(data, schemaWith(['known']));
        expect(orphans).toContainEqual(['ghost', 'item1', 'a']);
        expect(orphans).toContainEqual(['ghost', 'item1', 'b']);
    });
});
