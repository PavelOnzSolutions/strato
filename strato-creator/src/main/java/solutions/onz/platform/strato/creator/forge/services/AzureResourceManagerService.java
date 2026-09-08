package solutions.onz.platform.strato.creator.forge.services;

import com.azure.core.credential.TokenCredential;
import com.azure.core.management.AzureEnvironment;
import com.azure.core.management.profile.AzureProfile;
import com.azure.identity.DefaultAzureCredentialBuilder;
import com.azure.resourcemanager.AzureResourceManager;
import com.azure.resourcemanager.appservice.models.FunctionApp;
import com.azure.core.management.Region;
import com.azure.resourcemanager.resources.fluentcore.model.Accepted;
import com.azure.resourcemanager.resources.models.Deployment;
import com.azure.resourcemanager.resources.models.DeploymentMode;
import com.azure.resourcemanager.resources.models.ResourceGroup;
import com.azure.resourcemanager.storage.models.StorageAccount;
import com.azure.resourcemanager.storage.models.StorageAccountSkuType;
import com.azure.resourcemanager.storage.models.SkuName;
import solutions.onz.platform.strato.creator.configuration.ApplicationProperties;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentConfig;
import solutions.onz.platform.strato.creator.services.AzureIdentityService;
import solutions.onz.platform.strato.creator.forge.services.dto.EnvironmentImportDtos;
import solutions.onz.platform.strato.creator.services.dto.ResourceTemplate;
import com.microsoft.semantickernel.semanticfunctions.annotations.DefineKernelFunction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AzureResourceManagerService {

    private final ApplicationProperties properties;
    private final AzureIdentityService azureIdentityService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final java.util.Random random = new java.util.Random();

    AzureResourceManager buildClient(String subscriptionId, String azureCredentialId) {
        String sub = StringUtils.defaultIfBlank(subscriptionId, properties.getAzureArm().getSubscriptionId());
        TokenCredential credential;

        if (StringUtils.isNotBlank(azureCredentialId)) {
            credential = azureIdentityService.getTokenCredential(azureCredentialId);
        } else {
            credential = new DefaultAzureCredentialBuilder().build();
        }

        AzureProfile profile = new AzureProfile(AzureEnvironment.AZURE);
        return AzureResourceManager
                .authenticate(credential, profile)
                .withSubscription(sub);
    }

    @PreAuthorize("hasAuthority(@permissions.DEPLOYMENT_EXECUTE)")
    @DefineKernelFunction(name = "create_azure_resource_group", description = "Creates or updates an Azure Resource Group with tags")
    public ResourceGroup createOrUpdateResourceGroup(EnvironmentConfig env, Map<String, String> tags) {
        AzureResourceManager arm = buildClient(env.getSubscriptionId(), env.getAzureCredentialId());
        String region = StringUtils.defaultIfBlank(String.valueOf(env.value("regionId")), env.getRegion());
        region = StringUtils.defaultIfBlank(region, properties.getAzureArm().getDefaultRegion());
        
        if (arm.resourceGroups().contain(env.getResourceGroup())) {
            return arm.resourceGroups()
                    .getByName(env.getResourceGroup())
                    .update()
                    .withTags(tags)
                    .apply();
        } else {
            return arm.resourceGroups()
                    .define(env.getResourceGroup())
                    .withRegion(Region.fromName(region))
                    .withTags(tags)
                    .create();
        }
    }

    public boolean resourceGroupExists(EnvironmentConfig env) {
        AzureResourceManager arm = buildClient(env.getSubscriptionId(), env.getAzureCredentialId());
        return arm.resourceGroups().contain(env.getResourceGroup());
    }

    @PreAuthorize("hasAuthority(@permissions.DEPLOYMENT_EXECUTE)")
    @DefineKernelFunction(name = "create_azure_storage_account", description = "Creates an Azure Storage Account")
    public StorageAccount createStorageAccount(ResourceTemplate tpl, EnvironmentConfig env) {
        AzureResourceManager arm = buildClient(env.getSubscriptionId(), env.getAzureCredentialId());
        String region = StringUtils.defaultIfBlank(String.valueOf(env.value("regionId")), env.getRegion());
        region = StringUtils.defaultIfBlank(region, properties.getAzureArm().getDefaultRegion());
        String name = StringUtils.defaultIfBlank((String) env.value("storageName"), tpl.getName());
        String skuValue = StringUtils.defaultIfBlank(tpl.resolve("sku", env.getValues()),
                StorageAccountSkuType.STANDARD_LRS.toString());
        SkuName skuName = SkuName.fromString(skuValue);
        return arm.storageAccounts()
                .define(name)
                .withRegion(Region.fromName(region))
                .withExistingResourceGroup(env.getResourceGroup())
                .withGeneralPurposeAccountKindV2()
                .withSku(StorageAccountSkuType.fromSkuName(skuName))
                .create();
    }

    /**
     * Deploys a generic ARM template contained in ResourceTemplate.template with
     * parameters from env.values + tpl.defaults.
     * Returns the Deployment after completion.
     */
    @PreAuthorize("hasAuthority(@permissions.DEPLOYMENT_EXECUTE)")
    @DefineKernelFunction(name = "deploy_azure_template", description = "Deploys a generic ARM template to an Azure Resource Group")
    public Deployment deployTemplate(ResourceTemplate tpl, EnvironmentConfig env) {
        AzureResourceManager arm = buildClient(env.getSubscriptionId(), env.getAzureCredentialId());
        
        String randomSuffix = Integer.toHexString(random.nextInt(0x10000));
        while (randomSuffix.length() < 4) {
            randomSuffix = "0" + randomSuffix;
        }

        String baseName = tpl.getName();
        // Limit baseName so that baseName + "-" + randomSuffix + "-dep" fits in 64
        // "-xxxx-dep" is 9 chars.
        if (baseName.length() > 55) {
            baseName = baseName.substring(0, 55);
        }
        String deploymentName = baseName + "-" + randomSuffix + "-dep";
        
        Map<String, Object> params = new HashMap<>();

        log.info("Deploying template {} to resource group {} with empty parameters", tpl.getName(), env.getResourceGroup());
        
        Map<String, Object> armTemplate = tpl.getTemplate();
        if (armTemplate.containsKey("apiVersion") && armTemplate.containsKey("type")) {
            log.info("Detected single resource template, wrapping into deployment template");
            Map<String, Object> wrapper = new HashMap<>();
            wrapper.put("$schema", "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#");
            wrapper.put("contentVersion", "1.0.0.0");
            wrapper.put("parameters", new HashMap<>());
            wrapper.put("variables", new HashMap<>());
            
            Map<String, Object> resource = new HashMap<>(armTemplate);
            
            wrapper.put("resources", List.of(resource));
            armTemplate = wrapper;
        }

        log.info("Template: {}", armTemplate);
        Accepted<Deployment> deployment = arm.deployments()
                .define(deploymentName)
                .withExistingResourceGroup(env.getResourceGroup())
                .withTemplate(armTemplate)
                .withParameters(params)
                .withMode(DeploymentMode.INCREMENTAL)
                .beginCreate();
        return deployment.getFinalResult();
    }

    @PreAuthorize("hasAuthority(@permissions.DEPLOYMENT_EXECUTE)")
    @DefineKernelFunction(name = "create_azure_function_app", description = "Creates an Azure Function App")
    public FunctionApp createFunctionApp(ResourceTemplate tpl, EnvironmentConfig env) {
        // Use template-based deployment for Function App where SDK composition differs
        // across versions.
        Deployment result = deployTemplate(tpl, env);
        // After deployment, try to fetch the function app by name
        AzureResourceManager arm = buildClient(env.getSubscriptionId(), env.getAzureCredentialId());
        return arm.functionApps().getByResourceGroup(env.getResourceGroup(), tpl.getName());
    }

    /**
     * Lists resources present in a resource group and maps them to ImportedItem
     * structures.
     */
    @PreAuthorize("hasAnyAuthority(@permissions.ENVIRONMENT_READ, @permissions.ENVIRONMENT_WRITE)")
    @DefineKernelFunction(name = "list_azure_resources", description = "Lists all resources in an Azure Resource Group")
    public List<EnvironmentImportDtos.ImportedItem> listResourceGroupResources(EnvironmentConfig env) {
        AzureResourceManager arm = buildClient(env.getSubscriptionId(), env.getAzureCredentialId());
        List<EnvironmentImportDtos.ImportedItem> result = new ArrayList<>();
        try {
            arm.genericResources().listByResourceGroup(env.getResourceGroup()).forEach(r -> {
                String type = null;
                try {
                    type = r.type();
                } catch (Throwable ignore) {
                }
                String id = null;
                try {
                    id = r.id();
                } catch (Throwable ignore) {
                }
                String name = null;
                try {
                    name = r.name();
                } catch (Throwable ignore) {
                }
                String apiVersion = null;
                try {
                    apiVersion = r.apiVersion();
                } catch (Throwable ignore) {
                }
                String kind = null;
                try {
                    kind = r.kind();
                } catch (Throwable ignore) {
                }
                String location = null;
                try {
                    location = r.regionName();
                } catch (Throwable ignore) {
                }

                Map<String, Object> template = new HashMap<>();
                template.put("type", type);
                template.put("name", name);
                template.put("apiVersion", apiVersion);
                template.put("kind", kind);
                template.put("location", location);
                try {
                    if (r.sku() != null) {
                        Map<String, Object> sku = new HashMap<>();
                        sku.put("name", r.sku().name() != null ? r.sku().name().toString() : null);
                        sku.put("tier", r.sku().tier() != null ? r.sku().tier().toString() : null);
                        sku.put("size", r.sku().size());
                        sku.put("family", r.sku().family());
                        sku.put("capacity", r.sku().capacity());
                        template.put("sku", sku);
                    }
                } catch (Throwable ignore) {
                }
                try {
                    if (r.plan() != null) {
                        Map<String, Object> plan = new HashMap<>();
                        plan.put("name", r.plan().name());
                        plan.put("publisher", r.plan().publisher());
                        plan.put("product", r.plan().product());
                        plan.put("promotionCode", r.plan().promotionCode());
                        plan.put("version", r.plan().version());
                        template.put("plan", plan);
                    }
                } catch (Throwable ignore) {
                }
                try {
                    // Try to get some properties if possible, though GenericResource might have them limited
                    if (r.properties() != null) {
                        template.put("properties", r.properties());
                    }
                } catch (Throwable ignore) {
                }

                // apiVersion is typically not returned from list calls; keep null
                result.add(EnvironmentImportDtos.ImportedItem.builder()
                        .id(id)
                        .name(name)
                        .type(type)
                        .apiVersion(apiVersion)
                        .kind(kind)
                        .location(location)
                        .template(template)
                        .build());
            });
        } catch (Exception ex) {
            log.warn("Failed to list resources in RG {}: {}", env.getResourceGroup(), ex.getMessage());
        }
        return result;
    }
}
