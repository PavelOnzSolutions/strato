export interface IBackupRequestDto {
  tables: string[];
}

export interface IRestoreRequestDto {
  collections: string[];
}

export interface IBackupMetadataDto {
  creator: string;
  timestamp: string;
  signature: string;
  appId: string;
  version: string;
  collections: string[];
}
