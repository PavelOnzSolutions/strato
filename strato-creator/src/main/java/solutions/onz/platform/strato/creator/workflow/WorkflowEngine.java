package solutions.onz.platform.strato.creator.workflow;

import solutions.onz.platform.strato.creator.workflow.domain.WorkflowDefinition;
import solutions.onz.platform.strato.creator.workflow.domain.WorkflowDefinition.WorkflowStepDefinition;
import solutions.onz.platform.strato.creator.workflow.domain.WorkflowInstance;
import solutions.onz.platform.strato.creator.workflow.domain.WorkflowInstance.StepExecution;
import solutions.onz.platform.strato.creator.workflow.handlers.ActionHandler;
import solutions.onz.platform.strato.creator.workflow.handlers.ActionHandler.ActionResult;
import solutions.onz.platform.strato.creator.workflow.repositories.WorkflowDefinitionRepository;
import solutions.onz.platform.strato.creator.workflow.repositories.WorkflowInstanceRepository;
import solutions.onz.platform.strato.creator.api.websocket.ObservableChangePublisher;
import solutions.onz.platform.strato.creator.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class WorkflowEngine {

    private final WorkflowDefinitionRepository definitionRepository;
    private final WorkflowInstanceRepository instanceRepository;
    private final List<ActionHandler> actionHandlers;
    private final ObservableChangePublisher changePublisher;

    private Map<String, ActionHandler> handlerMap;

    private synchronized ActionHandler getHandler(String type) {
        if (handlerMap == null) {
            handlerMap = actionHandlers.stream()
                    .collect(Collectors.toMap(ActionHandler::getType, h -> h));
        }
        return handlerMap.get(type);
    }

    public WorkflowInstance startWorkflow(String definitionId, Map<String, Object> initialVariables) {
        WorkflowDefinition definition = definitionRepository.findById(definitionId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow definition not found: " + definitionId));

        WorkflowInstance instance = WorkflowInstance.builder()
                .definitionId(definitionId)
                .status("RUNNING")
                .variables(new HashMap<>(initialVariables))
                .startTime(Instant.now())
                .startedBy(SecurityUtils.getCurrentUserLogin())
                .currentStepId(definition.getSteps().get(0).getId())
                .build();

        instance = instanceRepository.save(instance);
        log.info("Started workflow instance: {} (definition: {})", instance.getId(), definition.getName());
        broadcastStatusUpdate(instance);
        
        executeStep(instance.getId());
        return instance;
    }

    @Async
    public void resumeAsync(String instanceId) {
        executeStep(instanceId);
    }

    public void executeStep(String instanceId) {
        WorkflowInstance instance = instanceRepository.findById(instanceId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow instance not found: " + instanceId));

        if (!"RUNNING".equals(instance.getStatus())) {
            log.warn("Workflow instance {} is not in RUNNING state (status: {}). Skipping step execution.", instanceId, instance.getStatus());
            return;
        }

        WorkflowDefinition definition = definitionRepository.findById(instance.getDefinitionId())
                .orElseThrow(() -> new IllegalStateException("Workflow definition not found: " + instance.getDefinitionId()));

        String currentStepId = instance.getCurrentStepId();
        WorkflowStepDefinition stepDef = definition.getSteps().stream()
                .filter(s -> s.getId().equals(currentStepId))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Step definition not found: " + currentStepId));

        if (stepDef.isAsync()) {
            log.info("Step {} is async, triggering async execution for instance {}", currentStepId, instanceId);
            executeStepInternalAsync(instanceId, stepDef);
        } else {
            executeStepInternalSync(instance, stepDef, definition);
        }
    }

    @Async
    protected void executeStepInternalAsync(String instanceId, WorkflowStepDefinition stepDef) {
        WorkflowInstance instance = instanceRepository.findById(instanceId).orElseThrow();
        WorkflowDefinition definition = definitionRepository.findById(instance.getDefinitionId()).orElseThrow();
        executeStepInternalSync(instance, stepDef, definition);
    }

    private void executeStepInternalSync(WorkflowInstance instance, WorkflowStepDefinition stepDef, WorkflowDefinition definition) {
        log.info("Executing step: {} ({}) for instance: {}", stepDef.getName(), stepDef.getId(), instance.getId());

        StepExecution execution = StepExecution.builder()
                .stepId(stepDef.getId())
                .status("RUNNING")
                .startTime(Instant.now())
                .build();
        instance.getHistory().add(execution);
        instanceRepository.save(instance);

        ActionHandler handler = getHandler(stepDef.getType());
        if (handler == null) {
            handleFailure(instance, execution, "No handler found for type: " + stepDef.getType());
            return;
        }

        try {
            ActionResult result = handler.execute(stepDef, instance.getVariables());
            execution.setEndTime(Instant.now());
            
            if (result.success()) {
                execution.setStatus("COMPLETED");
                execution.setOutputs(result.outputs());
                if (result.outputs() != null) {
                    instance.getVariables().putAll(result.outputs());
                }
                
                String nextStepId = stepDef.getNextStepId();
                if (nextStepId == null) {
                    instance.setStatus("COMPLETED");
                    instance.setEndTime(Instant.now());
                    log.info("Workflow instance {} completed successfully", instance.getId());
                } else {
                    instance.setCurrentStepId(nextStepId);
                }
                instanceRepository.save(instance);
                broadcastStatusUpdate(instance);
                
                if (nextStepId != null) {
                    executeStep(instance.getId());
                }
            } else {
                handleFailure(instance, execution, result.errorMessage());
            }
        } catch (Exception e) {
            log.error("Error executing step {}: {}", stepDef.getId(), e.getMessage(), e);
            handleFailure(instance, execution, e.getMessage());
        }
    }

    private void handleFailure(WorkflowInstance instance, StepExecution execution, String errorMessage) {
        execution.setStatus("FAILED");
        execution.setEndTime(Instant.now());
        execution.setErrorMessage(errorMessage);
        instance.setStatus("FAILED");
        instance.setEndTime(Instant.now());
        instanceRepository.save(instance);
        broadcastStatusUpdate(instance);
        log.error("Workflow instance {} failed at step {}: {}", instance.getId(), execution.getStepId(), errorMessage);
    }

    private void broadcastStatusUpdate(WorkflowInstance instance) {
        changePublisher.publishSingle("workflow_instances", 
                WorkflowInstance.class, 
                "UPDATE", 
                Instant.now(), 
                instance.getStartedBy() != null ? instance.getStartedBy() : "system", 
                instance.getId(), 
                Map.of("status", instance.getStatus(), "currentStepId", Optional.ofNullable(instance.getCurrentStepId()).orElse("")));
    }
}
