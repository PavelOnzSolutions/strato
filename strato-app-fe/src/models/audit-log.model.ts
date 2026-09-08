export interface IAuditLog {
    id: string;
    type: EAuditLogType;
    severity: EAuditLogSeverity;
    collectionName?: string;
    operation?: EAuditLogEntityOperation;
    originalData?: any;
    data?: any;
    timestamp: Date;
    userLogin?: string;
}

export enum EAuditLogType {
    ENTITY_CHANGE = 'ENTITY_CHANGE',
    ENTITY_VERSION = 'ENTITY_VERSION',
    USER_ACTION = 'USER_ACTION',
    CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
    AUTHORIZATION = 'AUTHORIZATION',
    SYSTEM_EVENT = 'SYSTEM_EVENT',
    DEPLOYMENT = 'DEPLOYMENT',
    BACKUP = 'BACKUP',
    RESTORE = 'RESTORE'
}

export enum EAuditLogSeverity {
    SUCCESS = 'SUCCESS',
    INFO = 'INFO',
    WARNING = 'WARNING',
    ERROR = 'ERROR'
}

export enum EAuditLogEntityOperation {
    DELETE = 'DELETE',
    UNDEFINED = 'UNDEFINED',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    EXECUTE = 'EXECUTE',
    BACKUP = 'BACKUP',
    RESTORE = 'RESTORE',
    LOCK = 'LOCK',
    UNLOCK = 'UNLOCK',
    ITEM_ADD = 'ITEM_ADD',
    ITEM_DELETE = 'ITEM_DELETE',
}

export type AuditLogCompact = Omit<IAuditLog, 'originalData' | 'data'>;
