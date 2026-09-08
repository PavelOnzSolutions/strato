package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.AuditLog;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogEntityOperation;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogSeverity;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogType;
import solutions.onz.platform.strato.creator.repositories.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PostFilter;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Service for managing audit logs.
 *
 * @author Your Name
 * @since 1.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository repo;
    private final MongoTemplate mongoTemplate;

    public record CompactAuditLog(
            String id,
            AuditLogType type,
            AuditLogSeverity severity,
            String collectionName,
            AuditLogEntityOperation operation,
            String entityId,
            String entityClass,
            Instant timestamp,
            String userLogin) {
    }

    /**
     * Retrieves a list of compact audit logs with access control based on user
     * roles.
     * Only administrators or users with matching userLogin can view logs.
     *
     * @return List of compact audit logs
     * @deprecated Use
     *             {@link #findCompact(Pageable, AuditLogType, AuditLogSeverity, AuditLogEntityOperation, String, String)}
     *             instead
     */
    @Deprecated
    @PostFilter("hasAuthority(@permissions.AUDIT_READ) or filterObject.userLogin == authentication.name")
    public List<CompactAuditLog> findAllCompact() {
        return repo.findAll().stream()
                .map(this::toCompact)
                .toList();
    }

    /**
     * Paginated and filtered search for audit logs with security enforcement.
     * Non-admin users can only see their own logs unless explicitly granted
     * PERM_AUDIT_READ.
     */
    @PreAuthorize("hasAuthority(@permissions.AUDIT_READ)")
    public Page<CompactAuditLog> findCompact(
            Pageable pageable,
            AuditLogType type,
            AuditLogSeverity severity,
            AuditLogEntityOperation operation,
            String userLogin,
            String collectionName) {

        Query query = new Query();

        // Apply filters
        if (type != null) {
            query.addCriteria(Criteria.where("type").is(type));
        }
        if (severity != null) {
            query.addCriteria(Criteria.where("severity").is(severity));
        }
        if (operation != null) {
            query.addCriteria(Criteria.where("operation").is(operation));
        }
        if (collectionName != null && !collectionName.isBlank()) {
            query.addCriteria(Criteria.where("collectionName").regex(collectionName, "i"));
        }

        // Get total count for pagination
        long count = mongoTemplate.count(query, AuditLog.class);

        // Early return if no results
        if (count == 0) {
            return PageableExecutionUtils.getPage(
                    List.of(),
                    pageable,
                    () -> 0L);
        }

        // Apply pagination and sorting
        query.with(pageable);

        // Execute query and map to compact representation
        List<CompactAuditLog> compactLogs = mongoTemplate.find(query, AuditLog.class)
                .stream()
                .map(this::toCompact)
                .toList();

        return PageableExecutionUtils.getPage(
                compactLogs,
                pageable,
                () -> count);
    }


    /**
     * Retrieves an audit log by ID with access control based on user roles.
     * Only administrators or users with matching userLogin can view logs.
     *
     * @param id The ID of the audit log
     * @return Optional containing the audit log if found, otherwise empty
     */
    @PostAuthorize("hasAuthority(@permissions.AUDIT_READ) or returnObject.orElse('').userLogin == authentication.name")
    public Optional<AuditLog> findById(String id) {
        return repo.findById(id);
    }

    /**
     * Checks if an audit log with the given ID exists.
     *
     * @param id The ID of the audit log
     * @return true if the audit log exists, false otherwise
     */
    public boolean existsById(String id) {
        return repo.existsById(id);
    }

    /**
     * Deletes an audit log by ID with access control based on user roles.
     * Only administrators can delete logs.
     *
     * @param id The ID of the audit log
     */
    @PreAuthorize("hasAuthority(@permissions.AUDIT_DELETE)")
    public void deleteById(String id) {
        repo.deleteById(id);
    }

    /**
     * Deletes multiple audit logs by ID with access control based on user roles.
     * Only administrators can delete logs.
     *
     * @param ids The IDs of the audit logs
     */
    @PreAuthorize("hasAuthority(@permissions.AUDIT_DELETE)")
    public void deleteAllById(List<String> ids) {
        repo.deleteAllById(ids);
    }

    private CompactAuditLog toCompact(AuditLog a) {
        return new CompactAuditLog(
                a.getId(),
                a.getType(),
                a.getSeverity(),
                a.getCollectionName(),
                a.getOperation(),
                a.getEntityId(),
                a.getEntityClass(),
                a.getTimestamp(),
                a.getUserLogin());
    }
}
