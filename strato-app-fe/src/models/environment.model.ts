export interface IEnvironmentConfig {
    id?: string;
    subscriptionId: string;
    azureCredentialId: string;
    region: string;
    resourceGroup: string;
    values: Record<string, string>;
}

export interface IEnvironmentNode {
    id?: string;
    key: string;
    label?: string;
    resourceClassId: string;
    values: Record<string, string>;
    disableNamingRule?: boolean;
    // Frontend only properties for ReactFlow
    position?: { x: number; y: number };
}

export interface IEnvironmentReference {
    id?: string;
    fromNode: string;
    fromAttribute: string;
    fromHandle?: string;
    toNode: string;
    toAttribute: string;
    toHandle?: string;
}

export interface IEnvironment {
    id: string;
    name?: string;
    version?: number;
    documentId?: string;
    config?: IEnvironmentConfig;
    nodes: IEnvironmentNode[];
    references: IEnvironmentReference[];
}

export interface IEnvironmentCreate {
    config: IEnvironmentConfig;
    nodes: IEnvironmentNode[];
    references: IEnvironmentReference[];
}

export type IEnvironmentNew = Omit<IEnvironment, 'id'>;
export type IEnvironmentCompact = Pick<IEnvironment, 'id' | 'name' | 'version' | 'documentId'>;

