package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.AuditLog;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogType;
import solutions.onz.platform.strato.creator.forge.services.EnvironmentsService;
import solutions.onz.platform.strato.creator.repositories.AuditLogRepository;
import solutions.onz.platform.strato.creator.repositories.ResourceRepository;
import solutions.onz.platform.strato.creator.services.dto.llm.PromptRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

        private final EnvironmentsService environmentsService;
        private final ResourceRepository resourceRepository;
        private final AuditLogRepository auditLogRepository;
        private final LlmService llmService;

        public Map<String, Object> getStats() {
                Map<String, Object> stats = new HashMap<>();
                stats.put("totalEnvironments", environmentsService.findAllLatestVersions().size());
                stats.put("totalResources", resourceRepository.count());

                List<AuditLog> deployments = auditLogRepository.findAllByType(AuditLogType.DEPLOYMENT);
                long successful = deployments.stream()
                                .filter(log -> log.getData() instanceof Map
                                                && "SUCCESS".equals(((Map<?, ?>) log.getData()).get("status")))
                                .count();
                long failed = deployments.stream()
                                .filter(log -> log.getData() instanceof Map
                                                && "FAILURE".equals(((Map<?, ?>) log.getData()).get("status")))
                                .count();
                long total = successful + failed;

                stats.put("successRate", total > 0 ? (double) successful / total * 100 : 100.0);
                stats.put("activeDeployments", deployments.stream()
                                .filter(log -> log.getData() instanceof Map
                                                && "START".equals(((Map<?, ?>) log.getData()).get("status")))
                                .count());

                stats.put("distribution", getResourceDistribution());

                return stats;
        }

        public Map<String, Long> getResourceDistribution() {
                return resourceRepository.findAll().stream()
                                .filter(rc -> rc.getResourceCategory() != null)
                                .collect(Collectors.groupingBy(
                                                rc -> rc.getResourceCategory().getName(),
                                                Collectors.counting()));
        }

        public List<AuditLog> getRecentDeployments(int pageSize) {
                return auditLogRepository.findAllByType(
                                AuditLogType.DEPLOYMENT,
                                PageRequest.of(0, pageSize, Sort.by(Sort.Direction.DESC, "timestamp")));
        }

        @Cacheable("systemSummary")
        public String getSystemSummary() {
                var request1 = new PromptRequest();
                request1.setPrompt(
                                "Provide a concise, but short system summary based on the current system health and metrics. "
                                                + "Use the SystemMonitoring plugin to gather data."
                                                + "Use the get_system_log_recent function to get and analyze last 100kB od logs. Make this log analysis report short and attach it to the summary");
                var response = llmService.processPrompt(request1);

                if (!response.getActions().isEmpty()) {
                        String executionResults = llmService.executeConfirmedActions(response.getActions());
                        var request2 = new PromptRequest();
                        request2.setPrompt("Here are the gathered monitoring details:\n" + executionResults +
                                        "\n\nPlease provide a final concise system summary based on this data.");
                        response = llmService.processPrompt(request2);
                }

                return response.getAnswer();
        }
}
