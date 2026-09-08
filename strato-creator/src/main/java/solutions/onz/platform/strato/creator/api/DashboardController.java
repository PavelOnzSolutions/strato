package solutions.onz.platform.strato.creator.api;

import solutions.onz.platform.strato.creator.domain.AuditLog;
import solutions.onz.platform.strato.creator.services.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RequiredArgsConstructor
@RestController
@RequestMapping(path = "/api/dashboard", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Dashboard", description = "Dashboard statistics and activity")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @Operation(summary = "Get dashboard stats", description = "Returns environment, resource, and deployment statistics")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(dashboardService.getStats());
    }

    @GetMapping("/deployments")
    @Operation(summary = "Get recent deployments", description = "Returns the latest 10 deployment audit logs")
    public ResponseEntity<Iterable<AuditLog>> getRecentDeployments() {
        return ResponseEntity.ok(dashboardService.getRecentDeployments(12));
    }

    @GetMapping("/distribution")
    @Operation(summary = "Get resource distribution", description = "Returns resource counts per category")
    public ResponseEntity<Map<String, Long>> getDistribution() {
        return ResponseEntity.ok(dashboardService.getResourceDistribution());
    }

    @GetMapping("/summary")
    @Operation(summary = "Get system summary", description = "Returns a summary of the system status")
    public ResponseEntity<String> getSummary() {
        return ResponseEntity.ok(dashboardService.getSystemSummary());
    }
}
