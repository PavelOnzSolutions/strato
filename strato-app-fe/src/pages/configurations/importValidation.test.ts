import {describe, it, expect} from 'vitest';
import {parseDataObject, findUnknownSectionKeys} from './importValidation';
import type {IConfigurationSchema} from '../../models/configuration.model';
import type {ISectionCatalogEntry} from '../../models/section-catalog.model';

describe('parseDataObject', () => {
    it('accepts a plain object', () => {
        const r = parseDataObject('{"db":{"primary":{"host":"x"}}}');
        expect(r.error).toBeNull();
        expect(r.data).toEqual({db: {primary: {host: 'x'}}});
    });
    it('accepts an empty object', () => {
        expect(parseDataObject('{}')).toEqual({error: null, data: {}});
    });
    it('rejects an array', () => {
        const r = parseDataObject('[]');
        expect(r.data).toBeNull();
        expect(r.error).toMatch(/object/i);
    });
    it('rejects a scalar', () => {
        expect(parseDataObject('42').data).toBeNull();
    });
    it('rejects invalid JSON', () => {
        const r = parseDataObject('{nope');
        expect(r.data).toBeNull();
        expect(r.error).toMatch(/invalid json/i);
    });
});

describe('findUnknownSectionKeys', () => {
    const catalog: ISectionCatalogEntry[] = [
        {documentId: 'doc-db', sectionKey: 'database'} as ISectionCatalogEntry,
        {documentId: 'doc-cache', sectionKey: 'cache'} as ISectionCatalogEntry,
    ];
    const schema: IConfigurationSchema = {
        id: 's', name: 's', flavor: 'AZURE' as any,
        sections: [
            {catalogEntryDocumentId: 'doc-db', disabledFieldPaths: [], fieldDefaults: {}, customFields: []},
        ],
    };
    it('returns keys not declared in the schema', () => {
        expect(findUnknownSectionKeys({database: {}, cache: {}}, schema, catalog)).toEqual(['cache']);
    });
    it('returns empty when all keys are known', () => {
        expect(findUnknownSectionKeys({database: {}}, schema, catalog)).toEqual([]);
    });
});
