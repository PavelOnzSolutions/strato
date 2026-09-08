import {EAuditLogType} from "../models/audit-log.model.ts";
import i18n from "../i18n.ts";
import {SectionItemFieldType} from "../models/section-catalog.model.ts";

/**
 * Converts an audit log type to a human-readable label.
 * @param type - The audit log type to convert.
 * @returns The human-readable label for the audit log type.
 */
export const auditLogTypeToLabel = (type: EAuditLogType) => {
    switch (type) {
        case EAuditLogType.ENTITY_CHANGE:
            return i18n.t('lbl_audit_log_type_entity_change', 'Entity Change');
        case EAuditLogType.ENTITY_VERSION:
            return i18n.t('lbl_audit_log_type_entity_version', 'Entity Version');
        case EAuditLogType.USER_ACTION:
            return i18n.t('lbl_audit_log_type_user_action', 'User Action');
        case EAuditLogType.AUTHORIZATION:
            return i18n.t('lbl_audit_log_type_authorization', 'Authorization');
        case EAuditLogType.SYSTEM_EVENT:
            return i18n.t('lbl_audit_log_type_system_event', 'System Event');
        case EAuditLogType.DEPLOYMENT:
            return i18n.t('lbl_audit_log_type_deployment', 'Deployment');
        case EAuditLogType.BACKUP:
            return i18n.t('lbl_audit_log_type_backup', 'Backup');
        case EAuditLogType.RESTORE:
            return i18n.t('lbl_audit_log_type_restore', 'Restore');
        default:
            return type;
    }
};

/**
 * Converts a resource type to a human-readable label.
 * @param type - The resource type to convert.
 * @returns The human-readable label for the resource type.
 */
export const typeToLabel = (type: string) => {
    switch (type) {
        case 'AZURE_RESOURCE':
            return i18n.t('lbl_type_azure_resource', 'Azure Resource');
        case 'MSGRAPH':
            return i18n.t('lbl_type_msgraph', 'MS Graph API');
        case 'AZURE_REGION':
            return i18n.t('lbl_type_azure_region', 'Azure Region');
        case 'WEB_TOKEN':
            return i18n.t('lbl_type_web_token', 'Web Token (JWT)');
        case 'AZURE_CREDENTIAL':
            return i18n.t('lbl_type_azure_credential', 'Azure Credential');
        case 'GITHUB_CREDENTIAL':
            return i18n.t('lbl_type_github_credential', 'GitHub Credential');
        case 'BITBUCKET_CREDENTIAL':
            return i18n.t('lbl_type_bitbucket_credential', 'Bitbucket Credential');
        case 'AZURE_DEVOPS':
            return i18n.t('lbl_type_azure_devops', 'Azure DevOps');
        case 'AWS_RESOURCE':
            return i18n.t('lbl_type_aws_resource', 'AWS Resource');
        case 'KUBERNETES_RESOURCE':
            return i18n.t('lbl_type_kubernetes', 'Kubernetes Resource');
        case 'KUBERNETES_CLUSTER':
            return i18n.t('lbl_type_kubernetes_cluster', 'Kubernetes Cluster');
        case 'CATALOG':
            return i18n.t('lbl_type_catalog', 'Catalog');
        case 'PROCESS':
            return i18n.t('lbl_type_process', 'Process');
        default:
            return i18n.t('lbl_unknown', 'Unknown');
    }
};


/**
 * Converts a resource type to a badge label and color.
 * @param type
 */
export const resourceTypeToColor = (type: string) => {
    switch (type) {
        case 'AZURE_RESOURCE':
            return 'indigo';
        case 'MSGRAPH':
            return 'plum';
        case 'AZURE_REGION':
            return 'mint';
        case 'WEB_TOKEN':
            return 'yellow';
        case 'AZURE_CREDENTIAL':
            return 'red';
        case 'GITHUB_CREDENTIAL':
            return 'violet';
        case 'AZURE_DEVOPS':
            return 'sky';
        case 'AWS_RESOURCE':
            return 'orange';
        case 'KUBERNETES_RESOURCE':
            return 'green';
        case 'KUBERNETES_CLUSTER':
            return 'teal';
        case 'CATALOG':
            return 'gold';
        case 'BITBUCKET_CREDENTIAL':
            return 'cyan';
        case 'PROCESS':
            return 'purple';
        default:
            return 'gray';
    }
}

/**
 * Returns an icon path based on the resource type.
 * @param type - The resource type.
 * @returns The icon path for the resource type.
 */
export const resourceTypeToIcon = (type: string) => {
    switch (type) {
        case 'AZURE_RESOURCE':
            return '/assets/azure/All-Resources.svg';
        case 'MSGRAPH':
            return '/assets/azure/Graph-Explorer.svg';
        case 'AZURE_REGION':
            return '/assets/azure/Azure-Region.svg';
        case 'WEB_TOKEN':
            return '/assets/generics/Swagger.svg';
        case 'AZURE_CREDENTIAL':
            return '/assets/azure/Users.svg';
        case 'GITHUB_CREDENTIAL':
            return '/assets/generics/github-color.svg';
        case 'AZURE_DEVOPS':
            return '/assets/azure/Azure-DevOps.svg';
        case 'AWS_RESOURCE':
            return '/assets/aws/AWS-Cloud-logo.svg';
        case 'KUBERNETES_RESOURCE':
            return '/assets/generics/Kubernetes.svg';
        case 'KUBERNETES_CLUSTER':
            return '/assets/kubernetes/node.svg';
        case 'CATALOG':
            return '/assets/generics/Catalog.svg';
        case 'BITBUCKET_CREDENTIAL':
            return '/assets/generics/Bitbucket.svg';
        case 'PROCESS':
            return '/assets/generics/Process-Gears.svg';
        default:
            return '/assets/azure/All-Resources.svg';
    }
}

export const dataTypeToIcon = (type: string) => {
    switch (type) {
        case 'boolean': return 'binary';
        case 'integer': return 'hash';
        case 'number': return 'hash';
        case 'array_of_object': return 'brackets';
        case 'array_of_string': return 'brackets';
        case 'object': return 'braces';
        case 'string': return 'a-large-small';
        case 'secret': return 'key';
        case 'map_of_string': return 'list';
        case 'map_of_object': return 'list-tree';
        default: return 'braces';
    }
}

export const fieldTypeToDisplayType = (type: SectionItemFieldType, secret: boolean | undefined): string => {
    if (secret) return 'secret';
    switch (type) {
        case 'STRING': return 'String';
        case 'NUMBER': return 'Number';
        case 'BOOLEAN': return 'Boolean';
        case 'OBJECT': return 'Object';
        case 'ARRAY_OF_STRING': return 'Array of String values';
        case 'ARRAY_OF_OBJECT': return 'Array of Objects';
        case 'MAP_OF_STRING': return 'Map of String values';
        case 'MAP_OF_OBJECT': return 'Map of Objects';
        default: return 'unknown';
    }
};

/**
 * Converts a string (kebab-case, snake_case, or camelCase) to a human-readable label.
 * Capitalizes the first letters of each word.
 * @returns The human-readable label.
 * @param input
 */
export const lowerKebabCaseToLabel = (input: string) => {
    if (!input) return input;

    // Replace underscores and hyphens with spaces
    // Then add space before capital letters (camelCase)
    const result = input
        .replace(/[_-]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2');

    // Capitalize the first letter of each word
    return result
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Converts a number to a string with double precision and an SI suffix (k, M, G, etc.)
 * @param value The number to format
 * @returns Formatted string
 */
export const formatDoublePrecisionWithSuffix = (value: number): string => {
    if (value === 0) return '0';
    if (isNaN(value)) return 'NaN';

    const suffixes = ['', 'k', 'M', 'G', 'T', 'P', 'E'];
    const tier = Math.floor(Math.log10(Math.abs(value)) / 3);

    if (tier <= 0) return value.toFixed(2).replace(/\.?0+$/, '');

    const suffix = suffixes[tier] || `e${tier * 3}`;
    const scale = Math.pow(10, tier * 3);
    const scaled = value / scale;

    return scaled.toFixed(2).replace(/\.?0+$/, '') + suffix;
};

/**
 * Validates if a string is a valid GUID.
 * @param guid - The string to validate.
 * @returns True if the string is a valid GUID, false otherwise.
 */
export const isValidGuid = (guid: string) => {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return guidRegex.test(guid);
};

/**
 * Formats a version object into a readable string.
 * @param v - The version object to format.
 * @returns Formatted version string.
 */
export const formatVersionOption = (v: any) => {
    const versionLabel = typeof v.version !== 'undefined' ? `v${v.version}` : 'v?';
    const author = v.createdBy || '-';
    const dateRaw = v.createdDate || null;
    const dateStr = dateRaw ? new Date(dateRaw).toLocaleString() : '-';
    return `${versionLabel} - ${author} - ${dateStr}`;
};

/**
 * Converts the provided value into a string representation.
 *
 * This function attempts to stringify a given input by prioritizing
 * specific properties (`data`, `content`, `json`, `document`, `value`)
 * if they exist within the input. If none of these properties are present,
 * it falls back to the input itself. If the resultant value is already
 * a string, it is returned as-is. Otherwise, the value is serialized
 * using `JSON.stringify`. Any errors encountered during stringification
 * result in returning the string representation of the value.
 *
 * @param {any} v - The value to be stringified. Can be of any type.
 * @returns {string} The string representation of the input value or its properties.
 */
export const stringifyContent = (v: any) => {
    const content = v?.data ?? v?.content ?? v?.json ?? v?.document ?? v?.value ?? v;
    try {
        return typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    } catch {
        return String(content ?? '');
    }
};
