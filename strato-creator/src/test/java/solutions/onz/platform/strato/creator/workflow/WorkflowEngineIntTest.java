package solutions.onz.platform.strato.creator.workflow;

import solutions.onz.platform.strato.creator.workflow.domain.WorkflowDefinition;
import solutions.onz.platform.strato.creator.workflow.domain.WorkflowDefinition.WorkflowStepDefinition;
import solutions.onz.platform.strato.creator.workflow.domain.WorkflowInstance;
import solutions.onz.platform.strato.creator.workflow.handlers.ActionHandler;
import solutions.onz.platform.strato.creator.workflow.repositories.WorkflowDefinitionRepository;
import solutions.onz.platform.strato.creator.workflow.repositories.WorkflowInstanceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.stereotype.Component;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

@SpringBootTest
@ActiveProfiles("local")
class WorkflowEngineIntTest {

    @Autowired
    private WorkflowEngine workflowEngine;

    @Autowired
    private WorkflowDefinitionRepository definitionRepository;

    @Autowired
    private WorkflowInstanceRepository instanceRepository;

    @BeforeEach
    void setUp() {
        instanceRepository.deleteAll();
        definitionRepository.deleteAll();
    }

    @Test
    void testSyncWorkflow() {
        WorkflowDefinition definition = WorkflowDefinition.builder()
                .name("Sync Test")
                .steps(List.of(
                        WorkflowStepDefinition.builder()
                                .id("step1")
                                .name("First Step")
                                .type("TEST")
                                .config(Map.of("value", "output1"))
                                .nextStepId("step2")
                                .build(),
                        WorkflowStepDefinition.builder()
                                .id("step2")
                                .name("Second Step")
                                .type("TEST")
                                .config(Map.of("value", "output2"))
                                .build()
                ))
                .build();
        definition = definitionRepository.save(definition);

        WorkflowInstance instance = workflowEngine.startWorkflow(definition.getId(), Map.of("input", "start"));

        assertThat(instance.getStatus()).isEqualTo("COMPLETED");
        assertThat(instance.getVariables()).containsEntry("step1_result", "output1");
        assertThat(instance.getVariables()).containsEntry("step2_result", "output2");
        assertThat(instance.getHistory()).hasSize(2);
    }

    @Test
    void testAsyncWorkflow() {
        WorkflowDefinition definition = WorkflowDefinition.builder()
                .name("Async Test")
                .steps(List.of(
                        WorkflowStepDefinition.builder()
                                .id("step1")
                                .name("Async Step")
                                .type("TEST")
                                .async(true)
                                .config(Map.of("value", "async_output"))
                                .build()
                ))
                .build();
        definition = definitionRepository.save(definition);

        WorkflowInstance instance = workflowEngine.startWorkflow(definition.getId(), Map.of());

        // Since it's async, it might still be RUNNING or already COMPLETED depending on timing
        // but it will definitely be COMPLETED after some time
        await().atMost(5, TimeUnit.SECONDS).untilAsserted(() -> {
            WorkflowInstance updated = instanceRepository.findById(instance.getId()).orElseThrow();
            assertThat(updated.getStatus()).isEqualTo("COMPLETED");
            assertThat(updated.getVariables()).containsEntry("step1_result", "async_output");
        });
    }

    @Component
    static class TestActionHandler implements ActionHandler {
        @Override
        public String getType() {
            return "TEST";
        }

        @Override
        public ActionResult execute(WorkflowStepDefinition step, Map<String, Object> variables) {
            String value = (String) step.getConfig().get("value");
            return ActionResult.success(Map.of(step.getId() + "_result", value));
        }
    }
}
