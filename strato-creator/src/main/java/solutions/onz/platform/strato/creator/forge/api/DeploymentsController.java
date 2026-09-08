package solutions.onz.platform.strato.creator.forge.api;

import solutions.onz.platform.strato.creator.forge.domain.Environment;
import solutions.onz.platform.strato.creator.forge.services.DeploymentsService;
import solutions.onz.platform.strato.creator.forge.services.EnvironmentsService;
import solutions.onz.platform.strato.creator.forge.services.dto.DeploymentPlan;
import solutions.onz.platform.strato.creator.forge.services.dto.DeploymentStatus;

import solutions.onz.platform.strato.creator.utils.SecurityUtils;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/deployments")
@Tag(name = "Deployments", description = "Execute and manage deployments, list history")
public class DeploymentsController {

    private final DeploymentsService deploymentsService;
    private final EnvironmentsService environmentsService;

    @PostMapping("/{id}")
    public ResponseEntity<Map<String, String>> deploy(@PathVariable String id, @RequestBody(required = false) DeploymentPlan plan) {
        log.info("Request to deploy environment: {}", id);

        Environment env = environmentsService.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Environment not found: " + id));

        DeploymentPlan deploymentPlan = plan;
        if (deploymentPlan == null) {
            log.info("No plan provided in request, generating one for environment: {}", id);
            deploymentPlan = environmentsService.createPlan(env);
        }

        String taskId = UUID.randomUUID().toString();
        String operatorLogin = SecurityUtils.getCurrentUserLogin();
        deploymentsService.deploy(env, deploymentPlan, taskId, operatorLogin);

        return ResponseEntity.ok(Map.of("taskId", taskId));
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<DeploymentStatus>> getAllTasks() {
        return ResponseEntity.ok(deploymentsService.getAllTasks());
    }

    @GetMapping("/status/{taskId}")
    public ResponseEntity<DeploymentStatus> getStatus(@PathVariable String taskId) {
        DeploymentStatus status = deploymentsService.getStatus(taskId);
        if (status == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(status);
    }
}
