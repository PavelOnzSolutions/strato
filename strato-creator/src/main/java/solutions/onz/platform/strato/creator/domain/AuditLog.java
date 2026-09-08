package solutions.onz.platform.strato.creator.domain;

import solutions.onz.platform.strato.creator.annotations.Backupable;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogEntityOperation;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogSeverity;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Getter
@Setter
@AllArgsConstructor
@Backupable
@NoArgsConstructor
@Document("audit_logs")
public class AuditLog {
    @Id
    private String id;

    private AuditLogType type;
    private AuditLogSeverity severity;
    private String collectionName;
    private AuditLogEntityOperation operation;
    private String entityId;
    private String entityClass;
    private Object originalData;
    private Object data;
    @Indexed
    private Instant timestamp;
    @Indexed
    private String userLogin;
}
