package solutions.onz.platform.strato.creator.api.websocket;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ObservableChangeMessage {
    private String entity; // fully qualified class name
    private String collection; // Mongo collection name
    private String operation; // CREATE, UPDATE, DELETE
    private Instant dateModified; // when the change happened (server time)
    private String user; // who performed the change
    private String entityId; // id of the single changed entity (if applicable)
    private Map<String, Object> payload; // for single changes, the new object state
    private List<String> ids; // for batch changes, list of affected IDs
    private String documentId; // stable document UUID for versioned entities (populated on DELETE)

    public ObservableChangeMessage setEntity(String entity) { this.entity = entity; return this; }

    public ObservableChangeMessage setCollection(String collection) { this.collection = collection; return this; }

    public ObservableChangeMessage setOperation(String operation) { this.operation = operation; return this; }

    public ObservableChangeMessage setDateModified(Instant dateModified) { this.dateModified = dateModified; return this; }

    public ObservableChangeMessage setUser(String user) { this.user = user; return this; }

    public ObservableChangeMessage setEntityId(String entityId) { this.entityId = entityId; return this; }

    public ObservableChangeMessage setPayload(Map<String, Object> payload) { this.payload = payload; return this; }

    public ObservableChangeMessage setIds(List<String> ids) { this.ids = ids; return this; }

    public ObservableChangeMessage setDocumentId(String documentId) { this.documentId = documentId; return this; }
}
