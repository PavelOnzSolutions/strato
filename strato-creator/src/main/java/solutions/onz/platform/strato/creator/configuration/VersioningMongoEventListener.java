package solutions.onz.platform.strato.creator.configuration;

import solutions.onz.platform.strato.creator.domain.AbstractVersioningEntity;
import solutions.onz.platform.strato.creator.provisioner.domain.Configuration;
import solutions.onz.platform.strato.creator.forge.domain.Environment;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.annotation.Id;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.data.mongodb.core.mapping.MongoPersistentEntity;
import org.springframework.data.mongodb.core.mapping.event.AbstractMongoEventListener;
import org.springframework.data.mongodb.core.mapping.event.BeforeConvertEvent;
import org.springframework.data.mongodb.core.mapping.event.BeforeDeleteEvent;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Mongo event listener that implements simple document versioning for entities
 * extending AbstractVersioningEntity.
 *
 * Rules:
 * - On first save (no _id): assign documentId (UUID), version=1, deleted=false
 * (if null)
 * - On update (has _id): create a new version by nullifying @Id to force
 * insert, keep same documentId,
 * and set version to latest+1; ensure deleted flag defaults to false if null.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VersioningMongoEventListener extends AbstractMongoEventListener<Object> {

    // Global bypass for delete versioning logic; used for hard deletes
    private static final ThreadLocal<Boolean> DELETE_BYPASS = ThreadLocal.withInitial(() -> Boolean.FALSE);

    public static void runWithDeleteBypass(Runnable runnable) {
        Boolean prev = DELETE_BYPASS.get();
        DELETE_BYPASS.set(Boolean.TRUE);
        try {
            runnable.run();
        } finally {
            DELETE_BYPASS.set(prev);
        }
    }

    private final MongoTemplate mongoTemplate;
    private final MongoMappingContext mappingContext;
    private final CacheManager cacheManager;

    @Override
    public void onBeforeConvert(BeforeConvertEvent<Object> event) {
        Object source = event.getSource();
        if (!(source instanceof AbstractVersioningEntity<?> v)) {
            return;
        }

        // Ensure deleted has a default value
        if (v.getDeleted() == null) {
            v.setDeleted(Boolean.FALSE);
        }

        String id = getIdValue(source);
        if (id == null || id.isBlank()) {
            // New document: initialize documentId and version
            if (v.getDocumentId() == null) {
                v.setDocumentId(UUID.randomUUID());
            }
            if (v.getVersion() == null || v.getVersion() <= 1) {
                v.setVersion(1);
            }
            return;
        }

        // Existing document: create a new version (copy) instead of updating
        // Before creating a new version, evict caches if it's an Environment
        if (source instanceof Environment) {
            evictEnvironmentsCaches();
        } else if (source instanceof Configuration) {
            evictConfigurationsCaches();
        }

        // 1) Keep/resolve documentId
        if (v.getDocumentId() == null) {
            // Try to read existing entity to inherit its documentId
            Object existing = mongoTemplate.findById(id, source.getClass());
            if (existing instanceof AbstractVersioningEntity<?> ve && ve.getDocumentId() != null) {
                v.setDocumentId(ve.getDocumentId());
            } else {
                v.setDocumentId(UUID.randomUUID());
            }
        }

        // 2) Determine next version based on max(version) for the same documentId
        Integer nextVersion = Optional.ofNullable(findLatestVersion(source.getClass(), v.getDocumentId()))
                .map(latest -> latest + 1)
                .orElseGet(() -> {
                    // Fall back to an existing version + 1 if a query failed
                    Integer cur = v.getVersion();
                    return (cur == null ? 1 : cur) + 1;
                });
        v.setVersion(nextVersion);
        log.debug("Versioning: Creating new version {} for documentId {} (type: {})", nextVersion, v.getDocumentId(),
                source.getClass().getSimpleName());

        // 3) Force insert by nullifying the @Id field, so a new document is created
        setIdValueNull(source);
    }

    @Override
    public void onBeforeDelete(BeforeDeleteEvent<Object> event) {
        // Allow hard deletes when bypass is enabled
        if (Boolean.TRUE.equals(DELETE_BYPASS.get())) {
            return;
        }
        Class<?> type = event.getType();
        if (type == null || !AbstractVersioningEntity.class.isAssignableFrom(type))
            return;
        String id = java.util.Optional.ofNullable(event.getDocument()).map(d -> d.get("_id")).map(String::valueOf)
                .orElse(null);
        if (id == null)
            return;

        Object existing = mongoTemplate.findById(id, type);
        if (existing instanceof AbstractVersioningEntity<?> v) {
            // Create a new deleted version and prevent physical delete by altering the
            // delete query
            setIdValueNull(v);
            v.setDeleted(Boolean.TRUE);
            if (v.getDocumentId() == null) {
                v.setDocumentId(UUID.randomUUID());
            }
            Integer nextVersion = Optional.ofNullable(findLatestVersion(type, v.getDocumentId()))
                    .map(latest -> latest + 1)
                    .orElse(1);
            v.setVersion(nextVersion);
            if (v instanceof Environment) {
                evictEnvironmentsCaches();
            } else if (v instanceof Configuration) {
                evictConfigurationsCaches();
            }
            mongoTemplate.save(v, collectionName(type));

            // Prevent physical delete by making the query unmatchable
            if (event.getDocument() != null) {
                event.getDocument().put("_id", "__soft_deleted__" + java.util.UUID.randomUUID());
            }
        }
    }

    private void evictEnvironmentsCaches() {
        if (cacheManager == null)
            return;
        Cache envCache = cacheManager.getCache("environments");
        if (envCache != null) {
            envCache.clear();
        }
        Cache envLatestCache = cacheManager.getCache("environments_latest");
        if (envLatestCache != null) {
            envLatestCache.clear();
        }
        log.debug("Versioning: Evicted environments and environments_latest caches");
    }

    private void evictConfigurationsCaches() {
        if (cacheManager == null)
            return;
        Cache cache = cacheManager.getCache("configurations");
        if (cache != null) {
            cache.clear();
        }
        Cache latestCache = cacheManager.getCache("configurations_latest");
        if (latestCache != null) {
            latestCache.clear();
        }
        log.debug("Versioning: Evicted configurations and configurations_latest caches");
    }

    private Integer findLatestVersion(Class<?> type, UUID documentId) {
        if (documentId == null)
            return null;
        log.debug("Versioning: Finding latest version for documentId {} in collection {}", documentId,
                collectionName(type));
        try {
            Query q = new Query(Criteria.where("documentId").is(documentId))
                    .with(Sort.by(Sort.Direction.DESC, "version"))
                    .limit(1);
            Object latest = mongoTemplate.findOne(q, type, collectionName(type));
            if (latest instanceof AbstractVersioningEntity<?> ve) {
                log.debug("Versioning: Found version {} for documentId {}", ve.getVersion(), documentId);
                return ve.getVersion();
            }
        } catch (Exception e) {
            log.warn(
                    "Versioning: Sorted query failed for documentId {} in collection {}. Falling back to in-memory max. Error: {}",
                    documentId, collectionName(type), e.getMessage());
            // Fallback: fetch all versions for this documentId and find max version in
            // memory.
            // This is slower but more resilient if indexes are missing or being rebuilt in
            // CosmosDB.
            Query fallbackQuery = new Query(Criteria.where("documentId").is(documentId));
            List<?> allVersions = mongoTemplate.find(fallbackQuery, type, collectionName(type));
            return allVersions.stream()
                    .filter(AbstractVersioningEntity.class::isInstance)
                    .map(AbstractVersioningEntity.class::cast)
                    .map(AbstractVersioningEntity::getVersion)
                    .filter(Objects::nonNull)
                    .max(Integer::compare)
                    .orElse(null);
        }
        log.debug("Versioning: No previous versions found for documentId {}", documentId);
        return null;
    }

    private String collectionName(Class<?> type) {
        MongoPersistentEntity<?> entity = mappingContext.getPersistentEntity(type);
        return entity != null ? entity.getCollection() : null;
    }

    private String getIdValue(Object source) {
        Field idField = findIdField(source.getClass());
        if (idField == null)
            return null;
        try {
            idField.setAccessible(true);
            Object value = idField.get(source);
            return value == null ? null : String.valueOf(value);
        } catch (IllegalAccessException e) {
            return null;
        }
    }

    private void setIdValueNull(Object source) {
        Field idField = findIdField(source.getClass());
        if (idField == null)
            return;
        try {
            idField.setAccessible(true);
            idField.set(source, null);
        } catch (IllegalAccessException ignored) {
        }
    }

    private Field findIdField(Class<?> type) {
        // Search for @Id annotation first
        Class<?> t = type;
        while (t != null && t != Object.class) {
            for (Field f : t.getDeclaredFields()) {
                if (f.isAnnotationPresent(Id.class) || "id".equals(f.getName())) {
                    return f;
                }
            }
            t = t.getSuperclass();
        }
        return null;
    }
}
