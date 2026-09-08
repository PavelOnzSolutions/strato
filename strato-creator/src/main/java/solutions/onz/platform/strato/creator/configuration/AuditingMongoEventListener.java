package solutions.onz.platform.strato.creator.configuration;

import solutions.onz.platform.strato.creator.domain.AuditLog;
import solutions.onz.platform.strato.creator.annotations.Auditable;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogEntityOperation;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogSeverity;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogType;
import solutions.onz.platform.strato.creator.repositories.AuditLogRepository;
import solutions.onz.platform.strato.creator.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.stereotype.Component;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.data.mongodb.core.mapping.MongoPersistentEntity;
import org.springframework.data.mongodb.core.mapping.event.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Event listener for MongoDB auditing operations.
 * Audits changes before and after save and delete operations.
 */
@Component
@RequiredArgsConstructor
public class AuditingMongoEventListener extends AbstractMongoEventListener<Object> {

    private final AuditLogRepository auditLogRepository;
    private final MongoTemplate mongoTemplate;
    private final MongoMappingContext mappingContext;

    // store original state within the same thread during a save or delete operation
    private final ThreadLocal<Map<String, Object>> originals = ThreadLocal.withInitial(HashMap::new);

    /**
     * Event listener for MongoDB before conversion events.
     * Audits changes before saving or deleting entities.
     */
    @Override
    public void onBeforeConvert(BeforeConvertEvent<Object> event) {
        Object source = event.getSource();
        if (!isAuditable(source))
            return;

        String id = getIdValue(source);
        if (id != null && !id.isBlank()) {
            // existing entity; load current state for UPDATE comparison
            Object existing = mongoTemplate.findById(id, source.getClass());
            if (existing != null) {
                originals.get().put(key(source.getClass(), id), toMap(existing));
            }
        }
    }

    /**
     * Event listener for MongoDB after save events.
     * Audits changes after saving entities.
     */
    @Override
    public void onAfterSave(AfterSaveEvent<Object> event) {
        Object source = event.getSource();
        if (!isAuditable(source))
            return;

        String id = getIdValue(source);
        Map<String, Object> original = id == null ? null
                : (Map<String, Object>) originals.get().remove(key(source.getClass(), id)); // Dirty cast, so far it
                                                                                            // works
        AuditLogEntityOperation operation = (original == null) ? AuditLogEntityOperation.CREATE
                : AuditLogEntityOperation.UPDATE;
        String collection = collectionName(source.getClass());
        Map<String, Object> after = toMap(source);
        AuditLog log = buildLog(source.getClass(), collection, id, operation, AuditLogSeverity.INFO,
                original, after);
        auditLogRepository.save(log);
    }

    /**
     * Event listener for MongoDB before delete events.
     * Stores the current state of the entity for comparison during the delete operation.
     */
    @Override
    public void onBeforeDelete(BeforeDeleteEvent<Object> event) {
        Class<?> type = event.getType();
        if (type == null || !isAuditable(type))
            return;
        String id = Optional.ofNullable(event.getDocument()).map(d -> d.get("_id")).map(String::valueOf).orElse(null);
        if (id != null) {
            Object existing = mongoTemplate.findById(id, type);
            if (existing != null) {
                originals.get().put(key(type, id), toMap(existing));
            }
        }
    }

    /**
     * Event listener for MongoDB after delete events.
     * Audits changes after deleting entities.
     */
    @Override
    public void onAfterDelete(AfterDeleteEvent<Object> event) {
        Class<?> type = event.getType();
        if (type == null || !isAuditable(type))
            return;
        String id = Optional.ofNullable(event.getDocument()).map(d -> d.get("_id")).map(String::valueOf).orElse(null);
        Map<String, Object> original = id == null ? null : (Map<String, Object>) originals.get().remove(key(type, id));
        String collection = collectionName(type);
        AuditLog log = buildLog(type, collection, id, AuditLogEntityOperation.DELETE, AuditLogSeverity.WARNING,
                original, null);
        auditLogRepository.save(log);
    }

    private String key(Class<?> type, String id) {
        return type.getName() + ":" + id;
    }

    private boolean isAuditable(Object entity) {
        return isAuditable(entity.getClass());
    }

    private boolean isAuditable(Class<?> type) {
        return type.isAnnotationPresent(Auditable.class);
    }

    private String collectionName(Class<?> type) {
        MongoPersistentEntity<?> persistentEntity = mappingContext.getPersistentEntity(type);
        if (persistentEntity != null) {
            return persistentEntity.getCollection();
        }
        return type.getSimpleName();
    }

    private String getIdValue(Object entity) {
        MongoPersistentEntity<?> persistentEntity = mappingContext.getPersistentEntity(entity.getClass());
        if (persistentEntity != null && persistentEntity.getIdProperty() != null) {
            Object id = persistentEntity.getPropertyAccessor(entity).getProperty(persistentEntity.getIdProperty());
            return id == null ? null : String.valueOf(id);
        }
        return null;
    }

    private Map<String, Object> toMap(Object pojo) {
        Document doc = new Document();
        mongoTemplate.getConverter().write(pojo, doc);
        return new HashMap<>(doc);
    }

    private AuditLog buildLog(Class<?> type, String collection, String entityId, AuditLogEntityOperation op,
            AuditLogSeverity severity,
            Map<String, Object> original, Map<String, Object> after) {
        AuditLog log = new AuditLog();
        log.setType(AuditLogType.ENTITY_CHANGE);
        log.setSeverity(severity);
        log.setCollectionName(collection);
        log.setOperation(op);
        log.setEntityId(entityId);
        log.setEntityClass(type.getName());
        log.setOriginalData(original);
        log.setData(after);
        log.setTimestamp(Instant.now());
        log.setUserLogin(currentUsername());
        return log;
    }

    private String currentUsername() {
        return SecurityUtils.getCurrentUserLogin();
    }
}
