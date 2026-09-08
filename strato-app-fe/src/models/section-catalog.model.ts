import {Flavor} from '../constants/flavors';

export type SectionItemFieldType =
    | 'STRING'
    | 'NUMBER'
    | 'BOOLEAN'
    | 'OBJECT'
    | 'ARRAY_OF_STRING'
    | 'ARRAY_OF_OBJECT'
    | 'MAP_OF_STRING'
    | 'MAP_OF_OBJECT';

export interface ISectionItemField {
    name: string;
    displayName: string;
    type: SectionItemFieldType;
    description?: string;
    defaultValue?: unknown;
    secret?: boolean;
    nestedFields?: ISectionItemField[];
}

export interface ISectionCatalogEntry {
    id: string;
    documentId: string;
    version?: number;
    flavor: Flavor;
    sectionKey: string;
    displayName: string;
    description?: string;
    icon?: string;
    system: boolean;
    itemFields: ISectionItemField[];
    requiredReadPermission?: string | null;
    requiredWritePermission?: string | null;
    createdBy?: string;
    createdDate?: string;
    deleted?: boolean;
}
