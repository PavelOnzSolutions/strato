package solutions.onz.platform.strato.creator.forge.domain;

import solutions.onz.platform.strato.creator.domain.Coordinates2D;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Map;

/**
 * A single node in an Environment graph representing a ResourceClass with
 * optional values.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "environment_nodes")
public class EnvironmentNode {
    @Id
    private String id;

    /** Unique node key within the environment (used by references). */
    private String key;

    /** User-defined label for display purposes. */
    private String label;

    private Coordinates2D position;

    /** The ID of the ResourceClass this node represents. */
    private String resourceClassId;

    /* Enable/disable naming rule application  */
    private boolean disableNamingRule;

    /** Optional overrides for the resource template defaults. */
    private Map<String, Object> values;
}
