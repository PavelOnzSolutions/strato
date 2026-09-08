package solutions.onz.platform.strato.creator.provisioner.domain;

import solutions.onz.platform.strato.creator.annotations.Auditable;
import solutions.onz.platform.strato.creator.annotations.Backupable;
import solutions.onz.platform.strato.creator.annotations.Observable;
import solutions.onz.platform.strato.creator.domain.AbstractAuditingEntity;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.Flavor;
import lombok.*;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
@Builder
@Getter
@Accessors(chain = true)
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Auditable
@Backupable
@Observable
@Document(collection = "configuration_schemas")
public class ConfigurationSchema extends AbstractAuditingEntity<String> {
    @Id
    private String id;

    @Indexed
    private String name;

    private String description;

    @Indexed
    private Flavor flavor;

    /** Selected sections (with overlays). Ordered; renderable as the schema tree. */
    private List<SchemaSection> sections;
}
