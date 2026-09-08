package solutions.onz.platform.strato.creator.forge.services;

import com.azure.core.credential.TokenCredential;
import com.azure.core.management.profile.AzureProfile;
import com.azure.core.models.AzureCloud;
import com.azure.identity.DefaultAzureCredentialBuilder;
import com.azure.resourcemanager.resources.bicep.BicepProviderManager;
import com.azure.resourcemanager.resources.bicep.models.DecompileOperationRequest;
import com.azure.resourcemanager.resources.bicep.models.FileDefinition;
import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.forge.domain.Environment;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentNode;
import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import solutions.onz.platform.strato.creator.services.ResourceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class BicepLanguageService {

    private final ResourceService resourceService;
    private final ObjectMapper objectMapper;

    public List<FileDefinition> exportToBicep(Environment environment) {
        log.info("Exporting environment {} to Bicep", environment.getName());

        Map<String, Object> armTemplate = new HashMap<>();
        armTemplate.put("$schema", "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#");
        armTemplate.put("contentVersion", "1.0.0.0");
        armTemplate.put("parameters", new HashMap<>());
        armTemplate.put("variables", new HashMap<>());

        List<Map<String, Object>> resources = new ArrayList<>();

        for (EnvironmentNode node : environment.getNodes()) {
            resourceService.findResourceById(node.getResourceClassId()).ifPresent(rc -> {
                if (rc.getType() == ResourceType.AZURE_RESOURCE) {
                    Map<String, Object> resolvedTemplate = resolveTemplate(node, rc);
                    resources.add(resolvedTemplate);
                }
            });
        }

        armTemplate.put("resources", resources);
        armTemplate.put("outputs", new HashMap<>());

        try {
            String armJson = objectMapper.writeValueAsString(armTemplate);

            ResourceClass azCred =
                    resourceService
                            .findResourceById(
                                    environment
                                            .getConfig()
                                            .getAzureCredentialId()
                            ).orElseThrow(() -> new RuntimeException(
                                    "Azure Credential associated with Environment \""
                                    + environment.getId()
                                    + "\" not found"));

            // Making sure we have the correct RC type to prevent NPEs etc.
            if (azCred.getType() != ResourceType.AZURE_CREDENTIAL) throw new RuntimeException(
                    "Azure Credential associated with Environment \""
                            + environment.getId()
                            + "\" is not a RC with type AZURE_CREDENTIAL");

            String tenantId = (String) azCred.getTemplate().get("tenantId");

            AzureProfile profile = new AzureProfile(tenantId, environment.getConfig().getSubscriptionId(), AzureCloud.AZURE_PUBLIC_CLOUD);
            TokenCredential credential = new DefaultAzureCredentialBuilder().build();
            BicepProviderManager bpm = BicepProviderManager.authenticate(credential, profile);

            DecompileOperationRequest req = new DecompileOperationRequest().withTemplate(armJson);

            return bpm.decompileOperationGroups().bicep(req).files();
        } catch (Exception e) {
            log.error("Failed to export to Bicep", e);
            throw new RuntimeException("Failed to export to Bicep: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> resolveTemplate(EnvironmentNode node, ResourceClass rc) {
        Map<String, Object> template = new HashMap<>(rc.getTemplate());
        
        // Simple resolution: replace values from node
        if (node.getValues() != null) {
            template.putAll(node.getValues());
        }
        
        // Ensure name and type are present as per ARM resource structure
        if (!template.containsKey("name") && node.getLabel() != null) {
            template.put("name", node.getLabel());
        }
        
        // In our system, ResourceClass.template usually contains the body of the resource
        // But ARM resources in a template need 'type', 'apiVersion', 'name', 'location', 'properties' etc.
        // We assume the stored template is already in that format or we might need to wrap it.
        // Based on DeploymentsService, it seems it's used directly in deployTemplate.
        
        return template;
    }
}
