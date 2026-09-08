package solutions.onz.platform.strato.creator.forge.services.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

/**
 * Deployment plan represents an ordered execution of environment nodes and the dependency edges.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeploymentPlan {
    /** Topologically sorted node keys representing the deployment order. */
    @Builder.Default
    private List<String> order = Collections.emptyList();

    /** Directed edges (from -> to) meaning from must be deployed before to. */
    @Builder.Default
    private List<PlanEdge> edges = Collections.emptyList();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanEdge {
        private String from;
        private String to;
        /** Explanation e.g. which attribute reference caused the dependency. */
        private String reason;
    }
}
