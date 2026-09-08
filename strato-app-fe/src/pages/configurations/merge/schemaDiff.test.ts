import {describe, expect, it} from 'vitest';
import {sectionIdToName, summarizeSchemaDiff} from './schemaDiff';
import {IConfigurationSchema, ISchemaSection} from '../../../models/configuration.model';
import {ISectionCatalogEntry} from '../../../models/section-catalog.model';
import {Flavor} from '../../../constants/flavors';

function schema(sections: ISchemaSection[]): IConfigurationSchema {
    return {id: 'x', documentId: 'd', name: 'n', flavor: 'AZURE' as Flavor, sections};
}

describe('summarizeSchemaDiff', () => {
    it('reports added customFields by name', () => {
        const a = schema([{
            catalogEntryDocumentId: 'cat',
            disabledFieldPaths: [], fieldDefaults: {},
            customFields: [{name: 'one'} as any],
        }]);
        const b = schema([{
            catalogEntryDocumentId: 'cat',
            disabledFieldPaths: [], fieldDefaults: {},
            customFields: [{name: 'one'} as any, {name: 'two'} as any],
        }]);
        expect(summarizeSchemaDiff(a, b)).toEqual({
            added: ['two'], removed: [], typeChanged: [],
        });
    });

    it('reports removed sections by catalogEntryDocumentId', () => {
        const a = schema([{
            catalogEntryDocumentId: 'cat-a',
            disabledFieldPaths: [], fieldDefaults: {}, customFields: [],
        }]);
        const b = schema([]);
        expect(summarizeSchemaDiff(a, b).removed).toContain('section:cat-a');
    });
});

describe('sectionIdToName', () => {
    const catalog = new Map<string, ISectionCatalogEntry>([
        ['cat-a', {documentId: 'cat-a', displayName: 'Database'} as ISectionCatalogEntry],
    ]);

    it('maps a known section id to its catalog displayName', () => {
        expect(sectionIdToName('cat-a', catalog)).toBe('Database');
    });

    it('falls back to the id for unknown sections', () => {
        expect(sectionIdToName('cat-unknown', catalog)).toBe('cat-unknown');
    });

    it('falls back to the id when no catalog is provided', () => {
        expect(sectionIdToName('cat-a')).toBe('cat-a');
    });
});
