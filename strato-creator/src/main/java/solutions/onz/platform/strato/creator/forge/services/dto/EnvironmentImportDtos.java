package solutions.onz.platform.strato.creator.forge.services.dto;

import solutions.onz.platform.strato.creator.forge.domain.EnvironmentConfig;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * DTOs used for importing an Environment from an Azure Resource Group.
 */
public class EnvironmentImportDtos {

    public enum ImportSource {
        ARM,
        GRAPH
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportRequest {
        private String subscriptionId;
        private String resourceGroup;
        private String region;
        private String azureCredentialId;
        private Map<String, Object> values;
        private ImportSource source; // optional; if null, service should suggest

        public EnvironmentConfig toEnvConfig() {
            return EnvironmentConfig.builder()
                    .subscriptionId(subscriptionId)
                    .azureCredentialId(azureCredentialId)
                    .resourceGroup(resourceGroup)
                    .region(region)
                    .values(values)
                    .build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportedItem {
        private String id;
        private String name;
        private String type; // ARM fully-qualified type, e.g., Microsoft.Storage/storageAccounts
        private String apiVersion; // ARM apiVersion if available
        private String kind; // ARM kind if available
        private String location;
        private Map<String, Object> template; // ARM template representation for this resource
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportMatch {
        private ImportedItem imported;
        private String matchedResourceId; // ResourceClass.id
        private String matchedResourceName; // ResourceClass.name
        private double confidence; // 1.0 exact (type+apiVersion), 0.7 type-only, 0.0 none
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetectedReference {
        private String fromImportedId;   // Azure resource ID of the provider (referenced resource)
        private String fromImportedName; // Display name of the provider resource
        private String toImportedId;     // Azure resource ID of the consumer (resource containing the reference)
        private String toImportedName;   // Display name of the consumer resource
        private String propertyPath;     // Property path where the reference was found (e.g., "serverFarmId")
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportResult {
        @Builder.Default
        private List<ImportedItem> items = new ArrayList<>();
        @Builder.Default
        private List<ImportMatch> matches = new ArrayList<>();
        @Builder.Default
        private List<ImportedItem> unmatched = new ArrayList<>();
        @Builder.Default
        private List<DetectedReference> detectedReferences = new ArrayList<>();
        private String message; // optional user guidance
        private ImportSource sourceUsed;
    }
}
