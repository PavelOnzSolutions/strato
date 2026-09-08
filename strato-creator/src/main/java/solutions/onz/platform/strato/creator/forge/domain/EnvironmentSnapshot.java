package solutions.onz.platform.strato.creator.forge.domain;

import solutions.onz.platform.strato.creator.annotations.Backupable;
import solutions.onz.platform.strato.creator.domain.AbstractAuditingEntity;
import lombok.*;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;


@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
@Builder
@Getter
@Accessors(chain = true)
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Backupable
@Document(collection = "environment_snapshots")
public class EnvironmentSnapshot extends AbstractAuditingEntity<String> {
    @Id
    private String id;
    @Indexed
    private String environmentDocumentId;
    private Integer environmentVersion;

}
