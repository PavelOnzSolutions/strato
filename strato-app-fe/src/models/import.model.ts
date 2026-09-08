export type ImportSource = 'ARM' | 'GRAPH';

export interface IImportRequest {
  subscriptionId: string;
  resourceGroup: string;
  region: string;
  azureCredentialId: string; // ID of the Class representing Azure Credential
  values?: Record<string, any>;
  source?: ImportSource;
}

export interface IImportedItem {
  id: string | null;
  name: string | null;
  type: string | null; // e.g. "Microsoft.Storage/storageAccounts"
  apiVersion: string | null;
  kind: string | null;
  region: string | null;
  template?: Record<string, any>;
}

export interface IImportMatch {
  imported: IImportedItem;
  matchedResourceId: string;
  matchedResourceName: string;
  confidence: number; // 1.0 = exact, 0.7 = type-only
}

export interface IDetectedReference {
  fromImportedId: string;
  fromImportedName: string;
  toImportedId: string;
  toImportedName: string;
  propertyPath: string;
}

export interface IImportResult {
  items: IImportedItem[];
  matches: IImportMatch[];
  unmatched: IImportedItem[];
  detectedReferences?: IDetectedReference[];
  message?: string;
  sourceUsed?: ImportSource;
}
