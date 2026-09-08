package solutions.onz.platform.strato.creator.forge.domain;

import solutions.onz.platform.strato.creator.annotations.Backupable;
import solutions.onz.platform.strato.creator.domain.AbstractVersioningEntity;
import lombok.*;
import lombok.experimental.Accessors;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Collections;
import java.util.List;

/**
 * Describes an Environment consisting of resource nodes and references between
 * them.
 */
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
@Builder
@Getter
@Accessors(chain = true)
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Backupable
@Document(collection = "environments")
public class Environment extends AbstractVersioningEntity<String> {
    @Id
    private String id;

    /** Human-readable symbolic name. */
    @Indexed
    private String name;

    /** Optional global environment configuration (subscription, region, etc.). */
    @DBRef
    private EnvironmentConfig config;

    /** Resource nodes that compose this environment. */
    @DBRef
    @Builder.Default
    private List<EnvironmentNode> nodes = Collections.emptyList();

    /** References between node attributes creating dependencies. */
    @DBRef
    @Builder.Default
    private List<EnvironmentReference> references = Collections.emptyList();
}
