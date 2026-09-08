export interface IDirectoryConfig {
  enabled: boolean;
  credentialResourceId: string | null;
}

export interface IDirectoryUser {
  directoryId: string;
  displayName: string | null;
  email: string | null;
  upn: string;
  department: string | null;
  alreadyExists: boolean;
}

export interface IImportUserItem {
  directoryId: string;
  displayName: string | null;
  email: string | null;
  upn: string;
  department: string | null;
}

export enum EImportStatus {
  CREATED = 'CREATED',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  FAILED = 'FAILED',
}

export interface IImportUserResult {
  directoryId: string;
  upn: string;
  status: EImportStatus;
  reason: string | null;
}

export interface IEntraIdTestResponse {
  success: boolean;
  message: string;
  userCount: number | null;
}
