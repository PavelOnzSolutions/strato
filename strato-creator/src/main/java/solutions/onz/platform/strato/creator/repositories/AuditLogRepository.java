package solutions.onz.platform.strato.creator.repositories;

import solutions.onz.platform.strato.creator.domain.AuditLog;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    List<AuditLog> findAllByType(AuditLogType type);

    List<AuditLog> findAllByType(AuditLogType type, Pageable pageable);

    List<AuditLog> findAllByTypeInOrderByTimestampDesc(List<AuditLogType> types);
}
