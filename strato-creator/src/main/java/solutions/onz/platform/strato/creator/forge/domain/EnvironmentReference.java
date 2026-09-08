package solutions.onz.platform.strato.creator.forge.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Describes a reference from one node's attribute to another node's attribute.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "environment_references")
public class EnvironmentReference {
    @Id
    private String id;

    /** Node key of the provider - the node that PROVIDES the value. */
    private String fromNode;
    /**
     * Attribute on the source node that contains a reference (e.g., id, name,
     * connectionString).
     */
    private String fromAttribute;

    /** Node key of the consumer - the node that DEPENDS on the provider. */
    private String toNode;
    /** Target attribute on the consumer node that receives the value. */
    private String toAttribute;

    /** ID of the source handle (e.g., "top", "bottom", "left", "right"). */
    private String fromHandle;
    /** ID of the target handle (e.g., "top", "bottom", "left", "right"). */
    private String toHandle;
}
