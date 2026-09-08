package solutions.onz.platform.strato.creator.configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import solutions.onz.platform.strato.creator.api.websocket.ObservableChangePublisher;
import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mapping.PersistentPropertyAccessor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.data.mongodb.core.mapping.MongoPersistentEntity;
import org.springframework.data.mongodb.core.mapping.MongoPersistentProperty;
import org.springframework.data.mongodb.core.mapping.event.AfterSaveEvent;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Guards the WebSocket payload shape: it must use the JSON/REST field names the
 * frontend models consume ({@code id}, {@code lastModifiedDate}) — not the Mongo
 * storage names ({@code _id}, {@code last_modified_date}) produced by the Mongo
 * converter. A regression here silently drops every schema-change notification,
 * because the client filters on {@code payload.id} / {@code payload.lastModifiedDate}.
 */
class ObservableMongoEventListenerTest {

    private final MongoTemplate mongoTemplate = mock(MongoTemplate.class);
    private final ObservableChangePublisher publisher = mock(ObservableChangePublisher.class);
    private final MongoMappingContext mappingContext = mock(MongoMappingContext.class);
    private ObjectMapper objectMapper;
    private ObservableMongoEventListener listener;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules()
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // Stub just enough of the mapping context for collectionName() + getIdValue().
        MongoPersistentEntity<?> persistentEntity = mock(MongoPersistentEntity.class);
        MongoPersistentProperty idProperty = mock(MongoPersistentProperty.class);
        PersistentPropertyAccessor<Object> accessor = mock(PersistentPropertyAccessor.class);
        doReturn(persistentEntity).when(mappingContext).getPersistentEntity(ConfigurationSchema.class);
        when(persistentEntity.getCollection()).thenReturn("configuration_schemas");
        doReturn(idProperty).when(persistentEntity).getIdProperty();
        doReturn(accessor).when(persistentEntity).getPropertyAccessor(any());
        when(accessor.getProperty(idProperty)).thenReturn("schema-1");

        listener = new ObservableMongoEventListener(mongoTemplate, mappingContext, publisher, objectMapper);
    }

    @Test
    @SuppressWarnings("unchecked")
    void onAfterSave_publishesPayloadWithJsonFieldNames() {
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .id("schema-1")
                .name("My Schema")
                .build();
        schema.setLastModifiedDate(Instant.parse("2026-05-25T10:15:30Z"));

        listener.onAfterSave(new AfterSaveEvent<>((Object) schema, new Document(), "configuration_schemas"));

        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(publisher).publishSingle(
                eq("configuration_schemas"),
                eq(ConfigurationSchema.class),
                eq("CREATE"),
                any(Instant.class),
                anyString(),
                eq("schema-1"),
                payloadCaptor.capture());

        Map<String, Object> payload = payloadCaptor.getValue();
        assertThat(payload)
                .containsKey("id")
                .containsKey("lastModifiedDate")
                .doesNotContainKey("_id")
                .doesNotContainKey("last_modified_date");
        assertThat(payload.get("id")).isEqualTo("schema-1");
        assertThat(payload.get("lastModifiedDate")).isEqualTo("2026-05-25T10:15:30Z");
    }
}
