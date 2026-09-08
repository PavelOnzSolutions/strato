import {AccentColor} from '../context/ThemeContext';
import {EAuditLogEntityOperation, EAuditLogSeverity, EAuditLogType} from "../models/audit-log.model.ts";

export const getHueFromAccentColor = (accentColor: AccentColor, dark: boolean): number => {
    const hueMap: Record<AccentColor, number> = {
        'strato': dark ? 200 : 210,
        'gray': 168,
        'gold': 45,
        'bronze': 30,
        'brown': 30,
        'yellow': 60,
        'amber': 45,
        'orange': 30,
        'tomato': 10,
        'red': 0,
        'ruby': 350,
        'crimson': 340,
        'pink': 325,
        'plum': 300,
        'purple': 280,
        'violet': 270,
        'iris': 260,
        'indigo': 240,
        'blue': 220,
        'cyan': 190,
        'teal': 170,
        'jade': 150,
        'green': 130,
        'grass': 110,
        'lime': 90,
        'mint': 160,
        'sky': 200,
    };

    return hueMap[accentColor] ?? 200;
};

export const getAuditSeverityColor = (severity: EAuditLogSeverity) => {
    switch (severity) {
        case EAuditLogSeverity.SUCCESS:
            return 'green';
        case EAuditLogSeverity.INFO:
            return 'blue';
        case EAuditLogSeverity.WARNING:
            return 'amber';
        case EAuditLogSeverity.ERROR:
            return 'red';
        default:
            return 'gray';
    }
};

export const getAuditOperationColor = (operation: EAuditLogEntityOperation) => {
    switch (operation) {
        case EAuditLogEntityOperation.DELETE:
            return 'red';
        case EAuditLogEntityOperation.UNDEFINED:
            return 'gray';
        case EAuditLogEntityOperation.CREATE:
            return 'green';
        case EAuditLogEntityOperation.UPDATE:
            return 'yellow';
        case EAuditLogEntityOperation.EXECUTE:
            return 'sky';
        case EAuditLogEntityOperation.BACKUP:
            return 'blue';
        case EAuditLogEntityOperation.RESTORE:
            return 'orange';
        case EAuditLogEntityOperation.LOCK:
            return 'tomato';
        case EAuditLogEntityOperation.UNLOCK:
            return 'lime';
        case EAuditLogEntityOperation.ITEM_ADD:
            return 'mint';
        case EAuditLogEntityOperation.ITEM_DELETE:
            return 'crimson';
        default:
            return 'gray';
    }
};

export const getAuditTypeColor = (type: EAuditLogType) => {
    switch (type) {
        case EAuditLogType.ENTITY_CHANGE:
            return 'iris';
        case EAuditLogType.ENTITY_VERSION:
            return 'lime';
        case EAuditLogType.CONFIGURATION_CHANGE:
            return 'blue';
        case EAuditLogType.AUTHORIZATION:
            return 'orange';
        case EAuditLogType.USER_ACTION:
            return 'teal';
        case EAuditLogType.SYSTEM_EVENT:
            return 'brown';
        case EAuditLogType.DEPLOYMENT:
            return 'mint';
        case EAuditLogType.BACKUP:
            return 'plum';
        case EAuditLogType.RESTORE:
            return 'tomato';
        default:
            return 'gray';
    }
};

export const getTypeColor = (type: string): string => {
    const typeColors: Record<string, string> = {
        object: 'red',
        array_of_object: 'amber',
        array_of_string: 'lime',
        map_of_string: 'cyan',
        map_of_object: 'teal',
        array: 'orange',
        string: 'green',
        number: 'blue',
        boolean: 'sky',
        null: 'gray',
    };
    return typeColors[type] || 'gray';
};


