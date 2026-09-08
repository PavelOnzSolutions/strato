package solutions.onz.platform.strato.creator.workflow.api;

import solutions.onz.platform.strato.creator.workflow.WorkflowService;
import solutions.onz.platform.strato.creator.workflow.domain.WorkflowDefinition;
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
@RequestMapping(path = "/api/workflow-definitions", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
@Tag(name = "Workflow Definitions", description = "CRUD operations for workflow definitions")
public class WorkflowDefinitionController {

    private final WorkflowService workflowService;

    @GetMapping
    @Operation(summary = "Get all workflow definitions", description = "Retrieves a list of all defined workflows")
    public List<WorkflowDefinition> getAllDefinitions() {
        return workflowService.getAllDefinitions();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get workflow definition by ID", description = "Retrieves a specific workflow definition")
    public ResponseEntity<WorkflowDefinition> getDefinitionById(@PathVariable String id) {
        return workflowService.getDefinitionById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create workflow definition", description = "Creates a new workflow definition")
    public WorkflowDefinition createDefinition(@RequestBody WorkflowDefinition definition) {
        return workflowService.createDefinition(definition);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update workflow definition", description = "Updates an existing workflow definition")
    public WorkflowDefinition updateDefinition(@PathVariable String id, @RequestBody WorkflowDefinition definition) {
        return workflowService.updateDefinition(id, definition);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Partial update workflow definition", description = "Partially updates an existing workflow definition")
    public WorkflowDefinition patchDefinition(@PathVariable String id, @RequestBody Map<String, Object> updates) {
        return workflowService.patchDefinition(id, updates);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete workflow definition", description = "Deletes a workflow definition")
    public void deleteDefinition(@PathVariable String id) {
        workflowService.deleteDefinition(id);
    }
}
