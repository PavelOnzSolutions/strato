package solutions.onz.platform.strato.creator.domain;

import solutions.onz.platform.strato.creator.annotations.Auditable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@Accessors(chain = true)
@Auditable
@Document(collection = "directory_config")
public class DirectoryConfig {

    public static final String SINGLETON_ID = "default";

    @Id
    private String id = SINGLETON_ID;

    @Field("enabled")
    private boolean enabled = false;

    @Field("credential_resource_id")
    private String credentialResourceId;

    @Field("updated_at")
    private Instant updatedAt;

    @Field("updated_by")
    private String updatedBy;
}
