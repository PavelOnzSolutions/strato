package solutions.onz.platform.strato.creator.provisioner.domain;

import solutions.onz.platform.strato.creator.annotations.Observable;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Observable
@Document(collection = "configuration_locks")
public class ConfigurationLock {

    @Id
    private String id;

    @Indexed(unique = true)
    private UUID documentId;

    private boolean locked;

    private String lockedBy;

    private Instant lockedAt;
}
