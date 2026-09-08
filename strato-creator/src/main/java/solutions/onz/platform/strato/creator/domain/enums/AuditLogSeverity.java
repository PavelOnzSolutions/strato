package solutions.onz.platform.strato.creator.domain.enums;

public enum AuditLogSeverity {
    SUCCESS,
    INFO,
    WARNING,
    ERROR;

    public static AuditLogSeverity fromString(String severity) {
        try {
            return AuditLogSeverity.valueOf(severity.toUpperCase());
        } catch (IllegalArgumentException e) {
            return INFO; // Default to INFO if the string does not match any enum
        }
    }
}
