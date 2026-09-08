package solutions.onz.platform.strato.creator.workflow.handlers;

import solutions.onz.platform.strato.creator.workflow.domain.WorkflowDefinition.WorkflowStepDefinition;
import java.util.Map;

public interface ActionHandler {
    String getType();
    ActionResult execute(WorkflowStepDefinition step, Map<String, Object> variables);

    record ActionResult(Map<String, Object> outputs, boolean success, String errorMessage) {
        public static ActionResult success(Map<String, Object> outputs) {
            return new ActionResult(outputs, true, null);
        }
        public static ActionResult failure(String errorMessage) {
            return new ActionResult(null, false, errorMessage);
        }
    }
}
