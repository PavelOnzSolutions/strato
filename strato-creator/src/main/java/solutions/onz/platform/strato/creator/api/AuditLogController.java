package solutions.onz.platform.strato.creator.api;

import solutions.onz.platform.strato.creator.domain.AuditLog;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogEntityOperation;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogSeverity;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogType;
import solutions.onz.platform.strato.creator.services.AuditLogService;
import solutions.onz.platform.strato.creator.services.AuditLogService.CompactAuditLog;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping(path = "/api/audit-logs", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Audit Logs", description = "Read and delete audit logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    /**
     * List Audit Logs
     * Returns a compact list of Audit Logs with pagination and filtering
     */
    @GetMapping
    @Operation(summary = "List Audit Logs", description = "Returns a compact list of Audit Logs with pagination and filtering", tags = {
            "Audit Logs" })
    public ResponseEntity<Page<CompactAuditLog>> list(
            @ParameterObject Pageable pageable,
            @RequestParam(name = "type", required = false) AuditLogType type,
            @RequestParam(name = "severity", required = false) AuditLogSeverity severity,
            @RequestParam(name = "operation", required = false) AuditLogEntityOperation operation,
            @RequestParam(name = "user", required = false) String user,
            @RequestParam(name = "collection", required = false) String collection) {
        return ResponseEntity.ok(auditLogService.findCompact(pageable, type, severity, operation, user, collection));
    }

    /**
     * Get Audit Log by id
     * Returns full Audit Log entry by its unique identifier
     */
    @GetMapping(path = "/{id}")
    @Operation(summary = "Get Audit Log by id", description = "Returns full Audit Log entry by its unique identifier", tags = {
            "Audit Logs" })
    public ResponseEntity<AuditLog> get(@PathVariable("id") String id) {
        return auditLogService.findById(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Audit Log not found"));
    }

    /**
     * Delete Audit Log by id
     * @param id
     * @return
     */
    @DeleteMapping(path = "/{id}")
    @Operation(summary = "Delete Audit Log", description = "Deletes an audit log entry by id", tags = { "Audit Logs" })
    public ResponseEntity<Void> delete(@PathVariable("id") String id) {
        if (!auditLogService.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Audit Log not found");
        }
        auditLogService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @Operation(summary = "Bulk delete Audit Logs", description = "Deletes multiple audit log entries by ids", tags = {
            "Audit Logs" })
    public ResponseEntity<Void> deleteMulti(@RequestParam("id") final List<String> id) {
        auditLogService.deleteAllById(id);
        return ResponseEntity.noContent().build();
    }
}
