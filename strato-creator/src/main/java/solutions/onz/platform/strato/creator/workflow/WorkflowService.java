package solutions.onz.platform.strato.creator.workflow;

import solutions.onz.platform.strato.creator.workflow.domain.WorkflowDefinition;
import solutions.onz.platform.strato.creator.workflow.domain.WorkflowInstance;
import solutions.onz.platform.strato.creator.workflow.repositories.WorkflowDefinitionRepository;
import solutions.onz.platform.strato.creator.workflow.repositories.WorkflowInstanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service for managing workflow definitions and instances.
 * Acts as a facade over repositories and the workflow engine.
 */
@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowInstanceRepository instanceRepository;
    private final WorkflowEngine workflowEngine;

    /**
     * Retrieves all workflow definitions.
     *
     * @return List of all workflow definitions
     */
    public List<WorkflowDefinition> getAllDefinitions() {
        return definitionRepository.findAll();
    }

    /**
     * Retrieves a workflow definition by its unique identifier.
     *
     * @param id The ID of the workflow definition
     * @return Optional containing the found definition, or empty if not found
     */
    public Optional<WorkflowDefinition> getDefinitionById(String id) {
        return definitionRepository.findById(id);
    }

    /**
     * Creates a new workflow definition.
     *
     * @param definition The workflow definition to create
     * @return The saved workflow definition
     */
    public WorkflowDefinition createDefinition(WorkflowDefinition definition) {
        return definitionRepository.save(definition);
    }

    /**
     * Updates an existing workflow definition.
     *
     * @param id The ID of the definition to update
     * @param definition The updated definition data
     * @return The updated workflow definition
     */
    public WorkflowDefinition updateDefinition(String id, WorkflowDefinition definition) {
        definition.setId(id);
        return definitionRepository.save(definition);
    }

    /**
     * Partially updates an existing workflow definition.
     *
     * @param id The ID of the definition to update
     * @param updates A map containing the fields to update
     * @return The updated workflow definition
     * @throws IllegalArgumentException if the definition is not found
     */
    public WorkflowDefinition patchDefinition(String id, Map<String, Object> updates) {
        WorkflowDefinition existing = definitionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Workflow definition not found: " + id));

        updates.forEach((key, value) -> {
            switch (key) {
                case "name" -> existing.setName((String) value);
                case "description" -> existing.setDescription((String) value);
                case "steps" -> {
                    // This is a bit simplified, usually you'd want better mapping for complex types
                    // but for a generic patch, we'll assume the caller sends the correct structure
                    existing.setSteps((List<WorkflowDefinition.WorkflowStepDefinition>) value);
                }
            }
        });

        return definitionRepository.save(existing);
    }

    /**
     * Deletes a workflow definition by its unique identifier.
     *
     * @param id The ID of the definition to delete
     */
    public void deleteDefinition(String id) {
        definitionRepository.deleteById(id);
    }

    /**
     * Retrieves all workflow instances.
     *
     * @return List of all workflow instances
     */
    public List<WorkflowInstance> getAllInstances() {
        return instanceRepository.findAll();
    }

    /**
     * Retrieves a workflow instance by its unique identifier.
     *
     * @param id The ID of the workflow instance
     * @return Optional containing the found instance, or empty if not found
     */
    public Optional<WorkflowInstance> getInstanceById(String id) {
        return instanceRepository.findById(id);
    }

    /**
     * Starts a new workflow execution.
     *
     * @param definitionId The ID of the workflow definition to instantiate
     * @param initialVariables Initial variables for the workflow instance
     * @return The newly created and started workflow instance
     */
    public WorkflowInstance startWorkflow(String definitionId, Map<String, Object> initialVariables) {
        return workflowEngine.startWorkflow(definitionId, initialVariables);
    }
}
