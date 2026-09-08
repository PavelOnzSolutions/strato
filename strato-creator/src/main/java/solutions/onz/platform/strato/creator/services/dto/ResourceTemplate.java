package solutions.onz.platform.strato.creator.services.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.Map;

/**
 * Describes a deployable Azure resource kind (a template) and the required
 * configuration keys.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceTemplate {
    /**
     * Logical type of the resource, e.g. "resource-group", "storage-account",
     * "function-app".
     */
    private String type;

    /**
     * Base name of the resource.
     */
    private String name;

    /**
     * ARM template JSON as a nested map. When provided, the service will deploy
     * this template.
     */
    @Builder.Default
    private Map<String, Object> template = Collections.emptyMap();

    /**
     * Default configuration values for this resource type. Environment can
     * override.
     */
    @Builder.Default
    private Map<String, Object> defaults = Collections.emptyMap();

    public String resolve(String key, Map<String, Object> overrides) {
        if (overrides != null && overrides.containsKey(key))
            return String.valueOf(overrides.get(key));
        return defaults != null && defaults.containsKey(key) ? String.valueOf(defaults.get(key)) : null;
    }
}
