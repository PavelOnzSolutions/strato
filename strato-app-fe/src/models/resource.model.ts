// Resource model matching backend Resource.java
import { IResourceCategory } from './resource-category.model';

export interface IResource {
    id: string;
    name: string;
    abbreviation: string;
    icon: string;
    isSystem: boolean;
    type: EResourceType;
    resourceCategory: IResourceCategory | null;
    catalogDefinition?: ICatalogDefinition | null; // required only for Catalog type
    processDefinition?: IProcessDefinition | null; // required only for Process type
    namingRule: IResourceNamingRule | null;
    template: Record<string, any>;
    outputs: Record<string, string>;
    defaults: Record<string, string>;
}

export interface IResourceCreate {
    name: string;
    icon: string;
    isSystem: boolean;
    namingRule: IResourceNamingRule | null;
    resourceCategory: { id: string } | null;
    template: Record<string, any>;
    defaults: Record<string, string>;
    outputs: Record<string, string>;
}

export interface IResourceNamingRule {
    maxLength: number;
    minLength: number;
    format: string;
    forbiddenChars: string[];
}

export interface ICatalogDefinition {
    itemType: ECatalogItemType;
    resourceClassIds?: { name: string; resourceClassId: string }[]; // Mappings for RESOURCE_CLASS type
}

export interface IProcessDefinition {
    workflowSteps: any[]; // Array of workflow steps
    inputMappings: Record<string, string>; // Maps workflow input variables to expressions
    outputMappings: Record<string, string>; // Maps resource output keys to workflow variable names
}

export interface ICredentialResourceValidationResult {
    valid: boolean;
    scopes: string[];
}

export interface ICredentialIdentityInfo {
    type: 'USER' | 'SERVICE_PRINCIPAL';
    objectId?: string;
    appId?: string;
    userPrincipalName?: string;
    displayName?: string;
}

export interface ICredentialTenantInfo {
    id: string;
    displayName?: string;
}

export interface ICredentialTokenInfo {
    audience?: string;
    issuer?: string;
    issuedAt?: string;        // ISO-8601
    notBefore?: string;
    expiresAt?: string;
    authenticationMethods?: string[];
}

export interface ICredentialDirectoryRole {
    id: string;
    displayName?: string;
}

export interface ICredentialPermissionsInfo {
    scopes?: string[];
    appRoles?: string[];
    directoryRoles?: ICredentialDirectoryRole[];
}

export interface ICredentialErrorInfo {
    code?: string;
    message: string;
    correlationId?: string;
    timestamp?: string;
    exceptionClass?: string;
}

export interface IAzureCredentialValidationResult {
    valid: boolean;
    durationMs?: number;
    identity?: ICredentialIdentityInfo;
    tenant?: ICredentialTenantInfo;
    token?: ICredentialTokenInfo;
    permissions?: ICredentialPermissionsInfo;
    rawClaims?: Record<string, unknown>;
    error?: ICredentialErrorInfo;
    graphWarnings?: string[];
    /** Legacy field, retained for backward compatibility. Prefer `permissions.scopes` / `permissions.appRoles`. */
    scopes?: string[];
}

export enum EResourceType {
    AZURE_RESOURCE = 'AZURE_RESOURCE',
    MSGRAPH = 'MSGRAPH',
    AZURE_REGION = 'AZURE_REGION',
    AZURE_CREDENTIAL = 'AZURE_CREDENTIAL',
    AZURE_DEVOPS = 'AZURE_DEVOPS',
    GITHUB_CREDENTIAL = 'GITHUB_CREDENTIAL',
    AWS_RESOURCE = 'AWS_RESOURCE',
    WEB_TOKEN = 'WEB_TOKEN',
    KUBERNETES_RESOURCE = 'KUBERNETES_RESOURCE',
    KUBERNETES_CLUSTER = 'KUBERNETES_CLUSTER',
    CATALOG = 'CATALOG',
    BITBUCKET_CREDENTIAL = 'BITBUCKET_CREDENTIAL',
    PROCESS = 'PROCESS',
}

export enum ECatalogItemType {
    STRING = 'STRING',
    NUMBER = 'NUMBER',
    OBJECT = 'OBJECT',
    ARRAY_STRING = 'ARRAY_STRING',
    ARRAY_OBJECT = 'ARRAY_OBJECT',
    RESOURCE_CLASS = 'RESOURCE_CLASS',
}

export type ResourceCompact = Omit<IResource, 'template' | 'defaults' | 'catalogDefinition'>;
