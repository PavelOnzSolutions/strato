import i18n from "../i18n.ts";

export const AVAILABLE_PERMISSIONS: string[] = [
    'PERM_USER_READ',
    'PERM_USER_WRITE',
    'PERM_ROLE_READ',
    'PERM_ROLE_WRITE',
    'PERM_VERSIONS_READ',
    'PERM_VERSIONS_WRITE',
    'PERM_ENVIRONMENT_READ',
    'PERM_ENVIRONMENT_WRITE',
    'PERM_DEPLOYMENT_READ',
    'PERM_DEPLOYMENT_EXECUTE',
    'PERM_DEPLOYMENT_WRITE',
    'PERM_RESOURCE_READ',
    'PERM_RESOURCE_WRITE',
    'PERM_AUDIT_READ',
    'PERM_AUDIT_DELETE',
    'PERM_BACKUP_READ',
    'PERM_BACKUP_WRITE',
    'PERM_HEALTH_READ',
    'PERM_PLATFORM_READ',
    'PERM_CONFIG_PROVIDER_READ',
    'PERM_CONFIG_PROVIDER_WRITE',
    'PERM_CONFIG_SCHEMA_READ',
    'PERM_CONFIG_SCHEMA_WRITE',
    'PERM_CONFIG_SECTIONS_READ',
    'PERM_CONFIG_SECTIONS_WRITE',
    'PERM_CONFIG_SECTIONS_OVERRIDE',
    'PERM_CONFIG_LOCK_SET'
];

export const PERM_SET_CONFIG_LOCK = 'PERM_CONFIG_LOCK_SET';

export const PERM_CATALOG_ADMIN = 'PERM_CATALOG_ADMIN';

// --- Hierarchy definitions ---

export interface PermissionScope {
    scope: string;
    levels: string[]; // highest to lowest
}

/** All permission scopes with their level ordering (highest first). */
export const PERMISSION_SCOPES: PermissionScope[] = [
    { scope: 'USER',            levels: ['WRITE', 'READ'] },
    { scope: 'ROLE',            levels: ['WRITE', 'READ'] },
    { scope: 'VERSIONS',        levels: ['WRITE', 'READ'] },
    { scope: 'ENVIRONMENT',     levels: ['WRITE', 'READ'] },
    { scope: 'DEPLOYMENT',      levels: ['WRITE', 'EXECUTE', 'READ'] },
    { scope: 'RESOURCE',        levels: ['WRITE', 'READ'] },
    { scope: 'AUDIT',           levels: ['DELETE', 'READ'] },
    { scope: 'BACKUP',          levels: ['WRITE', 'READ'] },
    { scope: 'HEALTH',          levels: ['READ'] },
    { scope: 'PLATFORM',        levels: ['READ'] },
    { scope: 'CONFIG_PROVIDER', levels: ['WRITE', 'READ'] },
    { scope: 'CONFIG_SCHEMA',   levels: ['WRITE', 'READ'] },
    { scope: 'CONFIG_SECTIONS',  levels: ['OVERRIDE', 'WRITE', 'READ'] },
    { scope: 'CONFIG_LOCK',     levels: ['SET']}
];

/** Build a permission string like PERM_USER_WRITE. */
export const toPermissionString = (scope: string, level: string): string =>
    `PERM_${scope}_${level}`;

/**
 * Given a scope and the level being toggled, return which permissions
 * should be added or removed to enforce the hierarchy.
 *
 * When `checking` is true (user checks the box):
 *   - returns the toggled level + all levels below it.
 * When `checking` is false (user unchecks the box):
 *   - returns the toggled level + all levels above it (to remove).
 */
export const getImpliedPermissions = (
    scope: string,
    level: string,
    checking: boolean,
): string[] => {
    const scopeDef = PERMISSION_SCOPES.find(s => s.scope === scope);
    if (!scopeDef) return [toPermissionString(scope, level)];

    const idx = scopeDef.levels.indexOf(level);
    if (idx === -1) return [toPermissionString(scope, level)];

    if (checking) {
        // include this level and all lower levels (higher index = lower rank)
        return scopeDef.levels.slice(idx).map(l => toPermissionString(scope, l));
    } else {
        // include this level and all higher levels (lower index = higher rank)
        return scopeDef.levels.slice(0, idx + 1).map(l => toPermissionString(scope, l));
    }
};

/**
 * Given a single permission string, return it plus all permissions it implies.
 * E.g. PERM_DEPLOYMENT_WRITE => [PERM_DEPLOYMENT_WRITE, PERM_DEPLOYMENT_EXECUTE, PERM_DEPLOYMENT_READ]
 * Used for authorization checks.
 */
export const getImpliedByPermission = (permission: string): string[] => {
    for (const scopeDef of PERMISSION_SCOPES) {
        const prefix = `PERM_${scopeDef.scope}_`;
        if (!permission.startsWith(prefix)) continue;

        const level = permission.slice(prefix.length);
        const idx = scopeDef.levels.indexOf(level);
        if (idx === -1) break;

        // this level + all lower-ranked levels
        return scopeDef.levels.slice(idx).map(l => toPermissionString(scopeDef.scope, l));
    }
    return [permission];
};

const SCOPE_LABELS: Record<string, string> = {
    USER: 'User',
    ROLE: 'Role',
    VERSIONS: 'Versions',
    ENVIRONMENT: 'Environment',
    DEPLOYMENT: 'Deployment',
    RESOURCE: 'Resource',
    AUDIT: 'Audit',
    BACKUP: 'Backup',
    HEALTH: 'Health',
    PLATFORM: 'Platform',
    CONFIG_PROVIDER: 'Config Provider',
    CONFIG_SCHEMA: 'Config Schema',
    CONFIG_SECTIONS: 'Section Catalog',
    CONFIG_LOCK: 'Config Lock'
};

const LEVEL_LABELS: Record<string, string> = {
    READ: 'Read',
    WRITE: 'Write',
    EXECUTE: 'Execute',
    DELETE: 'Delete',
    SET: 'Set',
    OVERRIDE: 'System Override'
};

export const scopeToLabel = (scope: string): string =>
    SCOPE_LABELS[scope] ?? scope;

export const levelToLabel = (level: string): string =>
    LEVEL_LABELS[level] ?? level;

/**
 * Converts a permission to a human-readable label.
 * @param permission - The permission to convert.
 * @returns The human-readable label for the permission.
 */
export const permissionToLabel = (permission: string) => {
    switch (permission) {
        case 'PERM_USER_READ':
            return i18n.t('lbl_permission_user_read', 'View user accounts and their roles');
        case 'PERM_USER_WRITE':
            return i18n.t('lbl_permission_user_write', 'Create, modify, or deactivate users');
        case 'PERM_ROLE_READ':
            return i18n.t('lbl_permission_role_read', 'View roles and their permission sets');
        case 'PERM_ROLE_WRITE':
            return i18n.t('lbl_permission_role_write', 'Create or edit custom roles');
        case 'PERM_VERSIONS_READ':
            return i18n.t('lbl_permission_versions_read', 'View Global deployment matrix');
        case 'PERM_VERSIONS_WRITE':
            return i18n.t('lbl_permission_versions_write', 'Write Global deployment matrix');
        case 'PERM_ENVIRONMENT_READ':
            return i18n.t('lbl_permission_environment_read', 'View environment definitions and status');
        case 'PERM_ENVIRONMENT_WRITE':
            return i18n.t('lbl_permission_environment_write', 'Create or modify environment definitions');
        case 'PERM_DEPLOYMENT_READ':
            return i18n.t('lbl_permission_deployment_read', 'View deployment history and status');
        case 'PERM_DEPLOYMENT_EXECUTE':
            return i18n.t('lbl_permission_deployment_execute', 'Trigger new deployments');
        case 'PERM_DEPLOYMENT_WRITE':
            return i18n.t('lbl_permission_deployment_write', 'Manage deployment configurations');
        case 'PERM_RESOURCE_READ':
            return i18n.t('lbl_permission_resource_read', 'View resource classes and categories');
        case 'PERM_RESOURCE_WRITE':
            return i18n.t('lbl_permission_resource_write', 'Manage resource definitions and templates');
        case 'PERM_AUDIT_READ':
            return i18n.t('lbl_permission_audit_read', 'Access the system audit logs');
        case 'PERM_AUDIT_DELETE':
            return i18n.t('lbl_permission_audit_delete', 'Remove the system audit log entries');
        case 'PERM_BACKUP_READ':
            return i18n.t('lbl_permission_backup_read', 'View backup history and create backups');
        case 'PERM_BACKUP_WRITE':
            return i18n.t('lbl_permission_backup_write', 'Restore data from backups');
        case 'PERM_HEALTH_READ':
            return i18n.t('lbl_permission_health_read', 'Access system health metrics and info');
        case 'PERM_PLATFORM_READ':
            return i18n.t('lbl_permission_platform_read', 'Access sensitive platform data and diagnostics');
        case 'PERM_CONFIG_PROVIDER_READ':
            return i18n.t('lbl_permission_config_provider_read', 'Read configurations');
        case 'PERM_CONFIG_PROVIDER_WRITE':
            return i18n.t('lbl_permission_config_provider_write', 'Manage configurations');
        case 'PERM_CONFIG_SCHEMA_READ':
            return i18n.t('lbl_permission_config_schema_read', 'Read configuration schemas');
        case 'PERM_CONFIG_SCHEMA_WRITE':
            return i18n.t('lbl_permission_config_schema_write', 'Manage configuration schemas');
        case 'PERM_CONFIG_SECTIONS_READ':
            return i18n.t('lbl_permission_config_sections_read', 'Read configuration section templates');
        case 'PERM_CONFIG_SECTIONS_WRITE':
            return i18n.t('lbl_permission_config_sections_write', 'Manage configuration section templates');
        case 'PERM_CONFIG_SECTIONS_OVERRIDE':
            return i18n.t('lbl_permission_config_sections_override', 'Allows System sections override');
        case 'PERM_CONFIG_LOCK_SET':
            return i18n.t('lbl_permission_config_lock_set', 'Toggle configuration lock');
        default:
            return permission;
    }
};