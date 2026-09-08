package solutions.onz.platform.strato.creator.configuration;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.annotations.Observable;
import solutions.onz.platform.strato.creator.utils.SecurityUtils;
import solutions.onz.platform.strato.creator.api.websocket.ObservableChangePublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.data.mongodb.core.mapping.MongoPersistentEntity;
import org.springframework.data.mongodb.core.mapping.event.AbstractMongoEventListener;
import org.springframework.data.mongodb.core.mapping.event.AfterDeleteEvent;
import org.springframework.data.mongodb.core.mapping.event.AfterSaveEvent;
import org.springframework.data.mongodb.core.mapping.event.BeforeConvertEvent;
import org.springframework.data.mongodb.core.mapping.event.BeforeDeleteEvent;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Publishes ObservableChange WebSocket messages for {@link Observable} entities,
 * independent of {@code @Auditable}. Some entities (e.g. Configuration,
 * ConfigurationSchema) opt into change notifications without being audited —
 * keeping the two concerns separate avoids coupling that previously dropped
 * every Observable-but-not-Auditable broadcast.
 * <p>
 * Payloads are serialized with the application {@link ObjectMapper} so the WebSocket
 * shape matches the REST/JSON shape the frontend models expect (e.g. {@code id},
 * {@code lastModifiedDate}). Using the Mongo converter instead would leak storage
 * field names ({@code _id}, {@code last_modified_date}), which silently breaks any
 * client that filters on those fields.
 */
@Component
@RequiredArgsConstructor
public class ObservableMongoEventListener extends AbstractMongoEventListener<Object> {

    private final MongoTemplate mongoTemplate;
    private final MongoMappingContext mappingContext;
    private final ObservableChangePublisher publisher;
    private final ObjectMapper objectMapper;

    // Captures pre-save / pre-delete state so we can:
    //   - distinguish CREATE vs UPDATE on save (presence of prior _id)
    //   - extract documentId on delete (post-delete the entity is gone)
    private final ThreadLocal<Map<String, Object>> originals = ThreadLocal.withInitial(HashMap::new);

    @Override
    public void onBeforeConvert(BeforeConvertEvent<Object> event) {
        Object source = event.getSource();
        if (!isObservable(source)) return;
        String id = getIdValue(source);
        if (id == null || id.isBlank()) return;
        Object existing = mongoTemplate.findById(id, source.getClass());
        if (existing != null) {
            originals.get().put(key(source.getClass(), id), toMap(existing));
        }
    }

    @Override
    public void onAfterSave(AfterSaveEvent<Object> event) {
        Object source = event.getSource();
        if (!isObservable(source)) return;
        String id = getIdValue(source);
        @SuppressWarnings("unchecked")
        Map<String, Object> original = id == null ? null
                : (Map<String, Object>) originals.get().remove(key(source.getClass(), id));
        String operation = (original == null) ? "CREATE" : "UPDATE";
        String collection = collectionName(source.getClass());
        Map<String, Object> after = toMap(source);
        publisher.publishSingle(collection, source.getClass(), operation, Instant.now(),
                currentUsername(), id, after);
    }

    @Override
    public void onBeforeDelete(BeforeDeleteEvent<Object> event) {
        Class<?> type = event.getType();
        if (type == null || !isObservable(type)) return;
        String id = Optional.ofNullable(event.getDocument())
                .map(d -> d.get("_id"))
                .map(String::valueOf)
                .orElse(null);
        if (id == null) return;
        Object existing = mongoTemplate.findById(id, type);
        if (existing != null) {
            originals.get().put(key(type, id), toMap(existing));
        }
    }

    @Override
    public void onAfterDelete(AfterDeleteEvent<Object> event) {
        Class<?> type = event.getType();
        if (type == null || !isObservable(type)) return;
        String id = Optional.ofNullable(event.getDocument())
                .map(d -> d.get("_id"))
                .map(String::valueOf)
                .orElse(null);
        if (id == null) return;
        @SuppressWarnings("unchecked")
        Map<String, Object> original = (Map<String, Object>) originals.get().remove(key(type, id));
        String documentId = null;
        if (original != null) {
            Object docIdValue = original.get("documentId");
            documentId = docIdValue == null ? null : String.valueOf(docIdValue);
        }
        String collection = collectionName(type);
        publisher.publishBatch(collection, type, "DELETE", Instant.now(),
                currentUsername(), List.of(id), documentId);
    }

    private boolean isObservable(Object entity) {
        return isObservable(entity.getClass());
    }

    private boolean isObservable(Class<?> type) {
        return type.isAnnotationPresent(Observable.class);
    }

    private String collectionName(Class<?> type) {
        MongoPersistentEntity<?> persistentEntity = mappingContext.getPersistentEntity(type);
        return persistentEntity != null ? persistentEntity.getCollection() : type.getSimpleName();
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
        // Serialize via Jackson (not the Mongo converter) so the payload carries the
        // JSON/REST field names the frontend uses (id, lastModifiedDate) rather than
        // Mongo storage names (_id, last_modified_date).
        return objectMapper.convertValue(pojo, new TypeReference<Map<String, Object>>() {});
    }

    private String key(Class<?> type, String id) {
        return type.getName() + ":" + id;
    }

    private String currentUsername() {
        return SecurityUtils.getCurrentUserLogin();
    }
}
