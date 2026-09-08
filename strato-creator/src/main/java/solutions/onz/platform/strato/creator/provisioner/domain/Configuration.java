package solutions.onz.platform.strato.creator.provisioner.domain;

import solutions.onz.platform.strato.creator.annotations.Backupable;
import solutions.onz.platform.strato.creator.annotations.Observable;
import solutions.onz.platform.strato.creator.domain.AbstractVersioningEntity;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.Flavor;
import lombok.*;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
@Builder
@Getter
@Accessors(chain = true)
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Backupable
@Observable
@Document(collection = "configurations")
public class Configuration extends AbstractVersioningEntity<String> {
    @Id
    private String id;

    @Indexed
    private String name;

    @Indexed
    private String schemaId;

    /** Cached from the bound schema at create time; immutable. */
    @Indexed
    private Flavor flavor;

    /** Optional environment binding. */
    private String environmentId;

    /** sectionKey → itemName → itemData. */
    private Map<String, Map<String, Map<String, Object>>> data;

    @Transient
    private boolean locked;

    /** Request-only: version the client edited against. Not persisted. */
    @Transient
    private Integer baseVersion;
}
