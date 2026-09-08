package solutions.onz.platform.strato.creator.forge.services.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeploymentStatus {
    private String taskId;
    private String environmentId;
    private String status;
    private String message;
    private Instant timestamp;
}
