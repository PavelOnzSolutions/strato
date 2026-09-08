package solutions.onz.platform.strato.creator.api.websocket;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Component
public class ObservableChangePublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public ObservableChangePublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishSingle(String collection,
            Class<?> entityClass,
            String operation,
            Instant when,
            String user,
            String entityId,
            Map<String, Object> payload) {
        ObservableChangeMessage msg = new ObservableChangeMessage()
                .setCollection(collection)
                .setEntity(entityClass.getName())
                .setOperation(operation)
                .setDateModified(when)
                .setUser(user)
                .setEntityId(entityId)
                .setPayload(payload);
        send(collection, msg);
    }

    public void publishBatch(String collection,
            Class<?> entityClass,
            String operation,
            Instant when,
            String user,
            List<String> ids) {
        publishBatch(collection, entityClass, operation, when, user, ids, null);
    }

    public void publishBatch(String collection,
            Class<?> entityClass,
            String operation,
            Instant when,
            String user,
            List<String> ids,
            String documentId) {
        ObservableChangeMessage msg = new ObservableChangeMessage()
                .setCollection(collection)
                .setEntity(entityClass.getName())
                .setOperation(operation)
                .setDateModified(when)
                .setUser(user)
                .setIds(ids)
                .setDocumentId(documentId);
        send(collection, msg);
    }

    private void send(String collection, ObservableChangeMessage msg) {
        String destination = "/topic/observable/" + collection;
        messagingTemplate.convertAndSend(destination, msg);
    }
}
