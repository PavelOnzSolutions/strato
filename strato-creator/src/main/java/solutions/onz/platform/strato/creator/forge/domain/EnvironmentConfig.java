package solutions.onz.platform.strato.creator.forge.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Collections;
import java.util.Map;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "environment_configs")
public class EnvironmentConfig {
    @Id
    private String id;

    /** Azure subscription ID to target. */
    private String subscriptionId;
    /** Azure credential resource ID. */
    private String azureCredentialId;
    /** Azure region (e.g., "westeurope"). */
    private String region;
    /** Resource group name. */
    private String resourceGroup;
    /** Enable RG creation */
    private Boolean createResourceGroup;

    /**
     * Values that can override template defaults (e.g., sku, storageName, planName,
     * etc.).
     */
    @Builder.Default
    private Map<String, Object> values = Collections.emptyMap();

    public Object value(String key) {
        return values != null ? values.get(key) : null;
    }
}
