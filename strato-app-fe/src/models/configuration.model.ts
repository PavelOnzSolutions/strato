import {Flavor} from '../constants/flavors';
import {ISectionItemField} from './section-catalog.model';
import {IEnvironment} from './environment.model';

export interface ISchemaSection {
    catalogEntryDocumentId: string;
    disabledFieldPaths: string[];
    fieldDefaults: Record<string, unknown>;
    customFields: ISectionItemField[];
}

export interface IConfigurationSchema {
    id: string;
    name: string;
    description?: string;
    flavor: Flavor;
    sections: ISchemaSection[];
    createdBy?: string;
    createdDate?: string;
    lastModifiedBy?: string;
    lastModifiedDate?: string;
}

/** data: sectionKey → itemName → itemData */
export type ConfigurationData = Record<string, Record<string, Record<string, unknown>>>;

export interface IConfiguration {
    id: string;
    documentId: string;
    version?: number;
    /** Request-only: the version this save was authored against. */
    baseVersion?: number;
    name: string;
    schemaId: string;
    flavor: Flavor;
    environmentId?: string;
    environment?: IEnvironment;
    data: ConfigurationData;
    createdBy?: string;
    createdDate?: string;
    deleted?: boolean;
    locked?: boolean;
}

export interface IVersionConflictResponse {
    code: 'CONFIG_VERSION_CONFLICT';
    latestVersion: number;
    latest: IConfiguration;
}
