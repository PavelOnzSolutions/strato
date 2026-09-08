package solutions.onz.platform.strato.creator.workflow.api;

import solutions.onz.platform.strato.creator.workflow.WorkflowService;
import solutions.onz.platform.strato.creator.workflow.domain.WorkflowInstance;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(path = "/api/workflow-instances", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Workflow Instances", description = "Operations to monitor and start workflow instances")
public class WorkflowInstanceController {

    private final WorkflowService workflowService;

    @GetMapping
    @Operation(summary = "Get all workflow instances", description = "Retrieves a list of all workflow executions")
    public List<WorkflowInstance> getAllInstances() {
        return workflowService.getAllInstances();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get workflow instance by ID", description = "Retrieves information about a specific workflow execution")
    public ResponseEntity<WorkflowInstance> getInstanceById(@PathVariable String id) {
        return workflowService.getInstanceById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/start/{definitionId}")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Start workflow execution", description = "Triggers the start of a new workflow instance")
    public WorkflowInstance startWorkflow(@PathVariable String definitionId, @RequestBody(required = false) Map<String, Object> variables) {
        return workflowService.startWorkflow(definitionId, variables != null ? variables : Map.of());
    }
}
