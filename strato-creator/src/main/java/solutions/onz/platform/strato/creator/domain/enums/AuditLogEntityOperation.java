package solutions.onz.platform.strato.creator.domain.enums;

public enum AuditLogEntityOperation {
    CREATE,
    UPDATE,
    DELETE,
    SAVE, // legacy/general
    EXECUTE,
    BACKUP,
    RESTORE,
    LOCK,
    UNLOCK,
    ITEM_ADD,
    ITEM_DELETE,
    UNDEFINED;

    public static AuditLogEntityOperation fromString(String operation) {
        for (AuditLogEntityOperation op : AuditLogEntityOperation.values()) {
            if (op.name().equalsIgnoreCase(operation)) {
                return op;
            }
        }
        throw new IllegalArgumentException("Unknown operation: " + operation);
    }
}
