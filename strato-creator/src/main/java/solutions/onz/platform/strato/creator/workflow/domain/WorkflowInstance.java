package solutions.onz.platform.strato.creator.workflow.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "workflow_instances")
public class WorkflowInstance {
    @Id
    private String id;
    private String definitionId;
    private String status; // PENDING, RUNNING, COMPLETED, FAILED, SUSPENDED
    private String currentStepId;
    
    @Builder.Default
    private Map<String, Object> variables = new HashMap<>();
    
    @Builder.Default
    private List<StepExecution> history = new ArrayList<>();
    
    private String startedBy;
    
    private Instant startTime;
    private Instant endTime;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StepExecution {
        private String stepId;
        private String status; // RUNNING, COMPLETED, FAILED
        private Instant startTime;
        private Instant endTime;
        private Map<String, Object> outputs;
        private String errorMessage;
    }
}
