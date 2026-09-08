package solutions.onz.platform.strato.creator.domain;

import solutions.onz.platform.strato.creator.annotations.Auditable;
import solutions.onz.platform.strato.creator.annotations.Backupable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Getter
@Setter
@Accessors(chain = true)
@AllArgsConstructor
@NoArgsConstructor
@Auditable
@Backupable
@Document(collection = "deployment_version_matrix")
public class DeploymentVersionMatrix {
    @Id
    private String id;
    private String environmentId;
    private String componentName;
    private String version;
    private Instant deployedAt;
    private String commitId;
    private String executor;
    private String author;
}
