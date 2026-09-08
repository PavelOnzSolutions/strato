package solutions.onz.platform.strato.creator.provisioner.domain;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class ConfigProviderOutput {
    private String configurationName;
    private String environmentName;
    private Integer version;
    private Map<String, Object> data; // Merged, schema-conformant output
}
