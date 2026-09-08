package solutions.onz.platform.strato.creator.workflow.domain;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "workflow_definitions")
public class WorkflowDefinition {
    @Id
    private String id;
    private String name;
    private String description;
    private List<WorkflowStepDefinition> steps;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkflowStepDefinition {
        private String id;
        private String name;
        private String type; // e.g., REST_CALL, JAVA_DELEGATE, WAIT
        private boolean async; // Whether this step should be executed asynchronously
        private Map<String, Object> config;
        private String nextStepId;
        private String errorStepId;
    }
}
