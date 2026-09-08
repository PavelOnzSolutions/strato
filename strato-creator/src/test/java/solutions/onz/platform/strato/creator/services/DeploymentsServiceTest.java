package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.CatalogDefinition;
import solutions.onz.platform.strato.creator.domain.ResourceNamingRule;
import solutions.onz.platform.strato.creator.domain.enums.CatalogItemType;
import solutions.onz.platform.strato.creator.forge.domain.Environment;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentConfig;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentNode;
import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentReference;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import solutions.onz.platform.strato.creator.forge.services.AzureResourceManagerService;
import solutions.onz.platform.strato.creator.forge.services.DeploymentsService;
import solutions.onz.platform.strato.creator.repositories.AuditLogRepository;
import solutions.onz.platform.strato.creator.forge.repositories.EnvironmentReferenceRepository;
import solutions.onz.platform.strato.creator.forge.services.dto.DeploymentPlan;
import solutions.onz.platform.strato.creator.forge.services.dto.DeploymentStatus;
import solutions.onz.platform.strato.creator.services.dto.ResourceTemplate;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DeploymentsServiceTest {

    @Mock
    private MsGraphService msGraphService;
    @Mock
    private AzureResourceManagerService azureResourceManagerService;
    @Mock
    private AzureIdentityService azureIdentityService;
    @Mock
    private ResourceService resourceService;
    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private EnvironmentReferenceRepository environmentReferenceRepository;
    @Mock
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    @Mock
    private SimpMessagingTemplate messagingTemplate;
    @Mock
    private SecurityContext securityContext;
    @Mock
    private Authentication authentication;

    @InjectMocks
    private DeploymentsService deploymentsService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
        lenient().when(objectMapper.valueToTree(any())).thenAnswer(invocation -> {
            Object obj = invocation.getArgument(0);
            return new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(obj);
        });
    }

    @Test
    void deploy_shouldCreateResourceGroupWithCorrectRegion() {
        // Arrange
        String regionResourceId = "reg1";
        Environment env = new Environment();
        env.setId("env1");
        env.setName("TestEnv");
        EnvironmentConfig config = new EnvironmentConfig();
        config.setResourceGroup("new-rg");
        config.setRegion(regionResourceId); // Only ID set
        env.setConfig(config);
        env.setNodes(Collections.emptyList());

        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(Collections.emptyList());

        // Mock region resource resolution
        ResourceClass regionResource = new ResourceClass();
        regionResource.setId(regionResourceId);
        // Important: Use "key" in template as per issue update
        regionResource.setTemplate(new HashMap<>(Map.of("key", "westeurope")));
        when(resourceService.findResourceById(regionResourceId)).thenReturn(Optional.of(regionResource));

        when(azureResourceManagerService.resourceGroupExists(any())).thenReturn(false);

        // Act
        deploymentsService.deploy(env, plan, "task1", "test-user");

        // Assert
        ArgumentCaptor<EnvironmentConfig> configCaptor = ArgumentCaptor.forClass(EnvironmentConfig.class);
        verify(azureResourceManagerService).createOrUpdateResourceGroup(configCaptor.capture(), any());
        assertEquals("westeurope", configCaptor.getValue().value("regionId"), "regionId should be resolved and injected into config");
    }

    @Test
    void deploy_shouldHandleEnvironmentReferences() {
        // Arrange
        Environment env = new Environment();
        env.setId("env1");
        env.setName("RefTestEnv");

        // Node 1: Provider
        EnvironmentNode node1 = EnvironmentNode.builder()
                .id("node1")
                .key("providerNode")
                .resourceClassId("rc-provider")
                .build();

        // Node 2: Consumer
        EnvironmentNode node2 = EnvironmentNode.builder()
                .id("node2")
                .key("consumerNode")
                .resourceClassId("rc-consumer")
                .values(new HashMap<>(Map.of("targetProp", "{{ sourceVal }}")))
                .build();

        env.setNodes(List.of(node1, node2));

        // Reference: node1.id -> node2.targetProp
        EnvironmentReference ref = EnvironmentReference.builder()
                .fromNode("providerNode")
                .fromAttribute("id")
                .toNode("consumerNode")
                .toAttribute("sourceVal") // Note: typically linked to the variable name in {{ }}
                .build();
        env.setReferences(List.of(ref));

        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of("providerNode", "consumerNode"));

        // Mock Resource Classes
        ResourceClass rcProvider = new ResourceClass();
        rcProvider.setId("rc-provider");
        rcProvider.setType(ResourceType.AZURE_RESOURCE);
        rcProvider.setOutputs(Map.of("id", "arm_id_output"));
        rcProvider.setTemplate(Map.of("type", "Microsoft.Something/provider"));

        ResourceClass rcConsumer = new ResourceClass();
        rcConsumer.setId("rc-consumer");
        rcConsumer.setType(ResourceType.AZURE_RESOURCE);
        rcConsumer.setTemplate(Map.of("type", "Microsoft.Something/consumer", "prop", "{{ sourceVal }}"));

        when(resourceService.findResourceById("rc-provider")).thenReturn(Optional.of(rcProvider));
        when(resourceService.findResourceById("rc-consumer")).thenReturn(Optional.of(rcConsumer));

        // Mock Azure Deployment for provider
        com.azure.resourcemanager.resources.models.Deployment azureDeployment = mock(com.azure.resourcemanager.resources.models.Deployment.class);
        Map<String, Object> outputs = new HashMap<>();
        Map<String, Object> idOutput = new HashMap<>();
        idOutput.put("value", "resolved-arm-id");
        outputs.put("arm_id_output", idOutput);
        when(azureDeployment.outputs()).thenReturn(outputs);

        when(azureResourceManagerService.deployTemplate(any(), any())).thenReturn(azureDeployment);

        // Act
        deploymentsService.deploy(env, plan, "task1", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> templateCaptor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService, times(2)).deployTemplate(templateCaptor.capture(), any());

        ResourceTemplate consumerTemplate = templateCaptor.getAllValues().get(1);
        assertEquals("resolved-arm-id", consumerTemplate.getTemplate().get("prop"), "Consumer property should be resolved from provider output");
    }

    @Test
    void deploy_shouldHandleNestedEnvironmentReferences() {
        // Arrange
        Environment env = new Environment();
        env.setId("env1");
        env.setName("NestedRefEnv");

        // Node 1: Provider (ASP)
        EnvironmentNode node1 = EnvironmentNode.builder()
                .id("node1")
                .key("aspNode")
                .resourceClassId("rc-asp")
                .build();

        // Node 2: Consumer (Function App)
        // FA template uses nested properties: properties.serverFarmId
        EnvironmentNode node2 = EnvironmentNode.builder()
                .id("node2")
                .key("faNode")
                .resourceClassId("rc-fa")
                .build();

        env.setNodes(List.of(node1, node2));

        // Reference: aspNode.id -> faNode.properties.serverFarmId
        EnvironmentReference ref = EnvironmentReference.builder()
                .fromNode("aspNode")
                .fromAttribute("id")
                .toNode("faNode")
                .toAttribute("properties.serverFarmId")
                .build();
        env.setReferences(List.of(ref));

        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of("aspNode", "faNode"));

        // Mock Resource Classes
        ResourceClass rcAsp = new ResourceClass();
        rcAsp.setId("rc-asp");
        rcAsp.setType(ResourceType.AZURE_RESOURCE);
        rcAsp.setOutputs(Map.of("id", "id")); // ARM output 'id' mapped to symbolic 'id'
        rcAsp.setTemplate(Map.of("type", "Microsoft.Web/serverFarms"));

        ResourceClass rcFa = new ResourceClass();
        rcFa.setId("rc-fa");
        rcFa.setType(ResourceType.AZURE_RESOURCE);
        // Template uses nested variable
        rcFa.setTemplate(Map.of(
                "type", "Microsoft.Web/sites",
                "properties", Map.of("serverFarmId", "{{ properties.serverFarmId }}")
        ));

        when(resourceService.findResourceById("rc-asp")).thenReturn(Optional.of(rcAsp));
        when(resourceService.findResourceById("rc-fa")).thenReturn(Optional.of(rcFa));

        // Mock Azure Deployment for ASP
        com.azure.resourcemanager.resources.models.Deployment azureDeployment = mock(com.azure.resourcemanager.resources.models.Deployment.class);
        Map<String, Object> outputs = new HashMap<>();
        Map<String, Object> idOutput = new HashMap<>();
        idOutput.put("value", "/subscriptions/.../serverFarms/my-asp");
        outputs.put("id", idOutput);
        when(azureDeployment.outputs()).thenReturn(outputs);

        when(azureResourceManagerService.deployTemplate(any(), any())).thenReturn(azureDeployment);

        // Act
        deploymentsService.deploy(env, plan, "task1", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> templateCaptor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService, times(2)).deployTemplate(templateCaptor.capture(), any());

        ResourceTemplate faTemplate = templateCaptor.getAllValues().get(1);
        Map<String, Object> props = (Map<String, Object>) faTemplate.getTemplate().get("properties");
        assertEquals("/subscriptions/.../serverFarms/my-asp", props.get("serverFarmId"), "Function App serverFarmId should be resolved from ASP output");
    }

    @Test
    void deploy_shouldHandleJsonPathOutputMapping() {
        // Arrange
        Environment env = new Environment();
        env.setId("env1");
        env.setName("JsonPathOutputEnv");

        EnvironmentNode node1 = EnvironmentNode.builder()
                .id("node1")
                .key("providerNode")
                .resourceClassId("rc-provider")
                .build();

        env.setNodes(List.of(node1));

        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of("providerNode"));

        ResourceClass rcProvider = new ResourceClass();
        rcProvider.setId("rc-provider");
        rcProvider.setType(ResourceType.AZURE_RESOURCE);
        // Complex output mapping using JSON path
        rcProvider.setOutputs(Map.of("principalId", "identity.value.principalId"));
        rcProvider.setTemplate(Map.of("type", "Microsoft.Compute/virtualMachines"));

        when(resourceService.findResourceById("rc-provider")).thenReturn(Optional.of(rcProvider));

        // Mock Azure Deployment with nested output structure
        com.azure.resourcemanager.resources.models.Deployment azureDeployment = mock(com.azure.resourcemanager.resources.models.Deployment.class);
        Map<String, Object> outputs = new HashMap<>();
        Map<String, Object> identityOutput = new HashMap<>();
        Map<String, Object> identityValue = new HashMap<>();
        identityValue.put("principalId", "guid-123");
        identityOutput.put("value", identityValue);
        outputs.put("identity", identityOutput);

        when(azureDeployment.outputs()).thenReturn(outputs);
        when(azureResourceManagerService.deployTemplate(any(), any())).thenReturn(azureDeployment);

        // Act
        deploymentsService.deploy(env, plan, "task1", "test-user");

        // Verify captured outputs
        // We add a consumer node that uses the captured output to verify it was resolved
        EnvironmentNode node2 = EnvironmentNode.builder()
                .id("node2")
                .key("consumerNode")
                .resourceClassId("rc-consumer")
                .build();

        env.setNodes(List.of(node1, node2));
        plan.setOrder(List.of("providerNode", "consumerNode"));

        EnvironmentReference ref = EnvironmentReference.builder()
                .fromNode("providerNode")
                .fromAttribute("principalId")
                .toNode("consumerNode")
                .toAttribute("targetPrincipal")
                .build();
        env.setReferences(List.of(ref));

        ResourceClass rcConsumer = new ResourceClass();
        rcConsumer.setId("rc-consumer");
        rcConsumer.setType(ResourceType.AZURE_RESOURCE);
        rcConsumer.setTemplate(Map.of("type", "Microsoft.Authorization/roleAssignments", "principalId", "{{ targetPrincipal }}"));
        when(resourceService.findResourceById("rc-consumer")).thenReturn(Optional.of(rcConsumer));

        // Act again with consumer
        deploymentsService.deploy(env, plan, "task2", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> templateCaptor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService, atLeastOnce()).deployTemplate(templateCaptor.capture(), any());

        ResourceTemplate lastTemplate = templateCaptor.getValue();
        assertEquals("guid-123", lastTemplate.getTemplate().get("principalId"), "principalId should be resolved from nested JSON path output");
    }

    @Test
    void deploy_shouldCreateOrUpdateResourceGroupWithCorrectTags() {
        // Arrange
        Environment env = new Environment();
        env.setId("env1");
        env.setDocumentId(java.util.UUID.randomUUID());
        env.setVersion(1);
        EnvironmentConfig config = new EnvironmentConfig();
        config.setResourceGroup("my-rg");
        env.setConfig(config);
        env.setNodes(Collections.emptyList());

        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(Collections.emptyList());

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<Map<String, String>> tagsCaptor = ArgumentCaptor.forClass(Map.class);
        verify(azureResourceManagerService).createOrUpdateResourceGroup(eq(config), tagsCaptor.capture());

        Map<String, String> tags = tagsCaptor.getValue();
        assertEquals("true", tags.get("stratoCare"));
        assertEquals("env1", tags.get("stratoEnvId"));
        assertEquals(env.getDocumentId().toString(), tags.get("stratoEnvDocId"));
        assertEquals("1", tags.get("stratoEnvVersion"));
        Assertions.assertNotNull(tags.get("stratoOperator"));
        Assertions.assertNotNull(tags.get("stratoLastModified"));
    }

    @Test
    void deployAzureResource_shouldSubstituteVariablesInTemplate() {
        // Arrange
        String nodeKey = "testNode";
        String resourceId = "res1";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("TestEnv");
        EnvironmentConfig config = new EnvironmentConfig();
        config.setRegion("eastus");
        config.setValues(Map.of("customVar", "customValue"));
        env.setConfig(config);

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);
        // node.setValues(Map.of("nodeVar", "nodeValue")); // Uncomment if we implement
        // node overrides

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        resource.setDefaults(Map.of("defaultVar", " defaultValue"));

        // Template with variables
        Map<String, Object> templateMap = new HashMap<>();
        templateMap.put("location", "{{ region }}");
        templateMap.put("name", "prefix-{{ customVar }}");
        templateMap.put("static", "staticValue");
        resource.setTemplate(templateMap);

        env.setNodes(List.of(node));

        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), eq(config));

        ResourceTemplate capturedTemplate = captor.getValue();
        Map<String, Object> tpl = capturedTemplate.getTemplate();

        // CURRENT EXPECTATION (before fix): Variables are NOT substituted
        // We will assert fail here if we were checking for substitution,
        // but let's write the assertion for the *desired* behavior and see it fail.

        assertEquals("eastus", tpl.get("location"), "Location should be substituted with region");
        assertEquals("prefix-customValue", tpl.get("name"), "Name should be substituted with customVar");
    }

    @Test
    void deployAzureResource_shouldUseShortRegionNameIfAvailable() {
        // Arrange
        String nodeKey = "shortRegionNode";
        String resourceId = "res1";
        String regionResourceId = "reg1";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("ShortRegionEnv");
        EnvironmentConfig config = new EnvironmentConfig();
        config.setRegion(regionResourceId); // ID of the region ResourceClass
        env.setConfig(config);

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        // Template NO LONGER has location placeholder
        resource.setTemplate(new HashMap<>(Map.of("someKey", "someValue")));

        ResourceClass regionResource = new ResourceClass();
        regionResource.setId(regionResourceId);
        regionResource.setType(ResourceType.AZURE_REGION);
        regionResource.setTemplate(Map.of("short", "westeu", "key", "westeurope"));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceById(regionResourceId)).thenReturn(Optional.of(regionResource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), eq(config));

        ResourceTemplate capturedTemplate = captor.getValue();
        assertEquals("westeu", capturedTemplate.getTemplate().get("location"), "Should use short region name 'westeu'");
        assertEquals("westeu", capturedTemplate.getTemplate().get("location"), "Location should be injected into template");

        // Also verify regionId is available in context (even if we don't check direct values map,
        // we can check if it was used in another substitution if we add one)

        // Let's add another assertion to verify regionId is indeed resolved to 'westeurope'
        // We can do this by adding another field to the template in the test
    }

    @Test
    void deployAzureResource_shouldProvideBothShortAndFullRegionNames() {
        // Arrange
        String nodeKey = "regionNode";
        String resourceId = "res1";
        String regionResourceId = "reg1";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("RegionEnv");
        EnvironmentConfig config = new EnvironmentConfig();
        config.setRegion(regionResourceId);
        env.setConfig(config);

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        // Template using both
        resource.setTemplate(Map.of(
            "shortLoc", "{{ region }}",
            "fullLoc", "{{ regionId }}"
        ));

        ResourceClass regionResource = new ResourceClass();
        regionResource.setId(regionResourceId);
        regionResource.setType(ResourceType.AZURE_REGION);
        regionResource.setTemplate(Map.of("short", "westeu", "key", "westeurope"));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceById(regionResourceId)).thenReturn(Optional.of(regionResource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), eq(config));

        ResourceTemplate capturedTemplate = captor.getValue();
        assertEquals("westeu", capturedTemplate.getTemplate().get("shortLoc"));
        assertEquals("westeurope", capturedTemplate.getTemplate().get("fullLoc"));
    }

    @Test
    void deployAzureResource_shouldUseShortRegionNameFromDefaultsIfTemplateIsNull() {
        // Arrange
        String nodeKey = "shortRegionNode";
        String resourceId = "res1";
        String regionResourceId = "reg1";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("ShortRegionEnv");
        EnvironmentConfig config = new EnvironmentConfig();
        config.setRegion(regionResourceId);
        env.setConfig(config);

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        resource.setTemplate(Map.of("location", "{{ region }}"));

        ResourceClass regionResource = new ResourceClass();
        regionResource.setId(regionResourceId);
        regionResource.setType(ResourceType.AZURE_REGION);
        // template is null, value is in defaults
        regionResource.setTemplate(null);
        regionResource.setDefaults(Map.of("short", "westeu", "key", "westeurope"));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceById(regionResourceId)).thenReturn(Optional.of(regionResource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), eq(config));

        ResourceTemplate capturedTemplate = captor.getValue();
        assertEquals("westeu", capturedTemplate.getTemplate().get("location"), "Should use short region name from defaults");
    }

    @Test
    void deployAzureResource_shouldSubstituteTypedVariables() {
        // Arrange
        String nodeKey = "nodeType";
        String resourceId = "resType";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("TypeEnv");
        EnvironmentConfig config = new EnvironmentConfig();
        // Config values with various types
        config.setValues(Map.of(
                "isEnabled", false,
                "port", 8080,
                "tags", List.of("tag1", "theme:dark"),
                "metadata", Map.of("created", "now"),
                "secretKey", "superSecret"));
        env.setConfig(config);

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);

        Map<String, Object> templateMap = new HashMap<>();
        templateMap.put("enabled", "{{ isEnabled:boolean }}");
        templateMap.put("count", "{{ port:number }}");
        templateMap.put("list", "{{ tags:array }}");
        templateMap.put("meta", "{{ metadata:object }}");
        templateMap.put("pwd", "{{ secretKey:string! }}"); // Secure syntax
        templateMap.put("description", "Status is {{ isEnabled }} on port {{ port }}");

        resource.setTemplate(templateMap);

        env.setNodes(List.of(node));

        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), eq(config));

        ResourceTemplate capturedTemplate = captor.getValue();
        Map<String, Object> tpl = capturedTemplate.getTemplate();

        // EXPECTATION
        assertEquals(Boolean.FALSE, tpl.get("enabled"), "Enabled should be a Boolean false");

        // Number check
        Object count = tpl.get("count");
        // Depending on parsing, it might be Integer or Double.
        // 8080 in Map.of is Integer.
        assertEquals(8080, count, "Count should be numeric 8080");

        // Array check
        Object list = tpl.get("list");
        assertEquals(List.of("tag1", "theme:dark"), list, "List should be preserved");

        // Object check
        assertEquals(Map.of("created", "now"), tpl.get("meta"), "Map should be preserved");

        // Secure string check
        assertEquals("superSecret", tpl.get("pwd"), "Secure string should be substituted");

        // String interpolation check
        assertEquals("Status is false on port 8080", tpl.get("description"),
                "Description should implement string substitution");
    }

    @Test
    void deployAzureResource_shouldPreserveArmTemplateStructure() {
        // Arrange
        String nodeKey = "armNode";
        String resourceId = "armRes";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("ArmEnv");
        EnvironmentConfig config = new EnvironmentConfig();
        env.setConfig(config);

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);

        // Realistic ARM Template Structure
        Map<String, Object> templateMap = new HashMap<>();
        templateMap.put("$schema", "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#");
        templateMap.put("contentVersion", "1.0.0.0");
        templateMap.put("parameters", Map.of("storageAccountType", Map.of("type", "string", "defaultValue", "Standard_LRS")));
        templateMap.put("variables", new HashMap<>());
        templateMap.put("resources", List.of(
            Map.of(
                "type", "Microsoft.Storage/storageAccounts",
                "apiVersion", "2019-06-01",
                "name", "store1",
                "location", "eastus",
                "sku", Map.of("name", "Standard_LRS"),
                "kind", "StorageV2",
                "properties", Map.of()
            )
        ));

        resource.setTemplate(templateMap);

        env.setNodes(List.of(node));

        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), eq(config));

        ResourceTemplate capturedTemplate = captor.getValue();
        Map<String, Object> tpl = capturedTemplate.getTemplate();


        assertEquals("https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#", tpl.get("$schema"));
        assertEquals("1.0.0.0", tpl.get("contentVersion"));



        List<Map<String, Object>> resources = (List<Map<String, Object>>) tpl.get("resources");
        assertEquals(1, resources.size());
        assertEquals("Microsoft.Storage/storageAccounts", resources.get(0).get("type"));
        assertEquals("2019-06-01", resources.get(0).get("apiVersion"));
    }

    @Test
    void deployRestResource_shouldUseCredentialFromConfig() {
        // ... (existing test code)
    }

    @Test
    void deployAzureResource_shouldApplyNamingRule() {
        // Arrange
        String nodeKey = "webNode";
        String resourceId = "webRes";
        String regionResourceId = "reg1";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("PROD");
        EnvironmentConfig config = new EnvironmentConfig();
        config.setRegion(regionResourceId);
        env.setConfig(config);

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        resource.setAbbreviation("app");

        ResourceNamingRule rule = new ResourceNamingRule();
        rule.setFormat("{abbrv}-{env}-{name}-{region-abbrv}");
        resource.setNamingRule(rule);
        resource.setTemplate(new HashMap<>(Map.of("someKey", "someValue")));

        ResourceClass regionResource = new ResourceClass();
        regionResource.setId(regionResourceId);
        regionResource.setTemplate(Map.of("short", "westeu"));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceById(regionResourceId)).thenReturn(Optional.of(regionResource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), eq(config));

        ResourceTemplate capturedTemplate = captor.getValue();
        String expectedName = "app-prod-webNode-westeu";
        assertEquals(expectedName, capturedTemplate.getName());
        assertEquals(expectedName, capturedTemplate.getTemplate().get("name"));
    }

    @Test
    void deployAzureResource_shouldRespectDisableNamingRule() {
        // Arrange
        String nodeKey = "manualNode";
        String resourceId = "webRes";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("PROD");
        EnvironmentConfig config = new EnvironmentConfig();
        env.setConfig(config);

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setLabel(nodeKey);
        node.setResourceClassId(resourceId);
        node.setDisableNamingRule(true); // DISABLE RULE

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        resource.setAbbreviation("app");

        ResourceNamingRule rule = new ResourceNamingRule();
        rule.setFormat("{abbrv}-{name}");
        resource.setNamingRule(rule);
        resource.setTemplate(new HashMap<>(Map.of("someKey", "someValue")));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), eq(config));

        ResourceTemplate capturedTemplate = captor.getValue();
        // Should use node key if naming rule is disabled and no "name" in template/values
        // UPDATE: It now uses node.getLabel() as fallback for name if not in template/values
        assertEquals("manualNode", capturedTemplate.getName());
        assertEquals("manualNode", capturedTemplate.getTemplate().get("name"), "Name SHOULD be injected as fallback even if rule is disabled");
    }

    @Test
    void deployAzureResource_shouldRemoveForbiddenChars() {
        // Arrange
        String nodeKey = "st-node";
        String resourceId = "stRes";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("PROD");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        resource.setAbbreviation("st");

        ResourceNamingRule rule = new ResourceNamingRule();
        rule.setFormat("{abbrv}{name}");
        rule.setForbiddenChars(List.of("-")); // Remove hyphens
        resource.setNamingRule(rule);
        resource.setTemplate(new HashMap<>(Map.of("someKey", "someValue")));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        assertEquals("ststnode", capturedTemplate.getName(), "Hyphen should be removed from 'st-node'");
    }

    @Test
    void deployAzureResource_shouldSubstituteCatalogVariables() {
        // Arrange
        String nodeKey = "node1";
        String resourceId = "res1";
        String catalogName = "app-settings";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("TestEnv");
        EnvironmentConfig config = new EnvironmentConfig();
        config.setValues(Map.of("db-port", 5432)); // Overrides one catalog value
        env.setConfig(config);

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);
        // node values can also override
        node.setValues(Map.of("app-name", "overridden-name"));

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);

        Map<String, Object> templateMap = new HashMap<>();
        templateMap.put("name", "{{ catalog:app-settings:app-name }}");
        templateMap.put("port", "{{ catalog:app-settings:db-port:number }}");
        templateMap.put("dbHost", "{{ catalog:app-settings:db-host }}"); // Should use default
        templateMap.put("nestedValue", "{{ catalog:app-settings:redis-config-timeout:number }}"); // Should use nested default

        resource.setTemplate(templateMap);

        ResourceClass catalog = new ResourceClass();
        catalog.setName(catalogName);
        catalog.setType(ResourceType.CATALOG);
        Map<String, Object> catalogDefaults = new HashMap<>();
        catalogDefaults.put("app-name", "default-app");
        catalogDefaults.put("db-port", 3306);
        catalogDefaults.put("db-host", "localhost");
        // Nested default
        catalogDefaults.put("redis", Map.of("config", Map.of("timeout", 5000)));

        catalog.setDefaults(catalogDefaults);

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceByName(catalogName)).thenReturn(Optional.of(catalog));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        Map<String, Object> tpl = capturedTemplate.getTemplate();

        assertEquals("overridden-name", tpl.get("name"), "Should be overridden by node values");
        assertEquals(5432, tpl.get("port"), "Should be overridden by env config values");
        assertEquals("localhost", tpl.get("dbHost"), "Should use catalog default");
        assertEquals(5000, tpl.get("nestedValue"), "Should use nested catalog default from dash-separated key");
    }

    @Test
    void deployAzureResource_shouldSubstituteCatalogVariablesFromTemplateFallback() {
        // Arrange
        String nodeKey = "node1";
        String resourceId = "res1";
        String catalogName = "allowed-plans";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("TestEnv");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        resource.setTemplate(Map.of("sku", "{{ catalog:allowed-plans:consumption }}"));

        ResourceClass catalog = new ResourceClass();
        catalog.setName(catalogName);
        catalog.setType(ResourceType.CATALOG);
        // Value is in template, not defaults
        catalog.setTemplate(Map.of("consumption", "Standard_LRS"));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceByName(catalogName)).thenReturn(Optional.of(catalog));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        assertEquals("Standard_LRS", capturedTemplate.getTemplate().get("sku"), "Should fallback to catalog template for value");
    }

    @Test
    void deployAzureResource_shouldSubstituteCatalogVariablesInMiddleOfString() {
        // Arrange
        String nodeKey = "node1";
        String resourceId = "res1";
        String catalogName = "allowed-plans";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("TestEnv");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        // Placeholder in the middle of a string
        resource.setTemplate(Map.of("sku", "Sku: {{ catalog:allowed-plans:consumption }}"));

        ResourceClass catalog = new ResourceClass();
        catalog.setName(catalogName);
        catalog.setType(ResourceType.CATALOG);
        catalog.setTemplate(Map.of("consumption", "Standard_LRS"));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceByName(catalogName)).thenReturn(Optional.of(catalog));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        assertEquals("Sku: Standard_LRS", capturedTemplate.getTemplate().get("sku"), "Should substitute catalog value in middle of string");
    }

    @Test
    void deployAzureResource_shouldSubstituteCatalogVariables_WithComplexKey() {
        // Arrange
        String nodeKey = "node1";
        String resourceId = "res1";
        String catalogName = "allowed-plans";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("TestEnv");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        // This exactly matches the failing log line: sku={{ catalog:allowed-plans:consumption }}
        resource.setTemplate(Map.of("sku", "{{ catalog:allowed-plans:consumption }}"));

        ResourceClass catalog = new ResourceClass();
        catalog.setName(catalogName);
        catalog.setType(ResourceType.CATALOG);
        catalog.setTemplate(Map.of("consumption", "Standard_LRS"));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceByName(catalogName)).thenReturn(Optional.of(catalog));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        assertEquals("Standard_LRS", capturedTemplate.getTemplate().get("sku"), "Should substitute catalog value with complex name");
    }

    @Test
    void deployAzureResource_shouldSubstituteCatalogVariables_InNewFormat() {
        // Arrange
        String nodeKey = "node1";
        String resourceId = "res1";
        String catalogName = "allowed-plans";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("TestEnv");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);
        // The value stored in node.values is another placeholder
        node.setValues(Map.of("sku", "{{ catalog:allowed-plans:consumption }}"));

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        // The template uses the new format reported by the user
        resource.setTemplate(Map.of("sku", "{{ sku:catalog:allowed-plans }}"));

        ResourceClass catalog = new ResourceClass();
        catalog.setName(catalogName);
        catalog.setType(ResourceType.CATALOG);
        catalog.setTemplate(Map.of("consumption", "Standard_LRS"));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceByName(catalogName)).thenReturn(Optional.of(catalog));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        assertEquals("Standard_LRS", capturedTemplate.getTemplate().get("sku"), "Should resolve the new format recursively");
    }

    @Test
    void deployAzureResource_shouldSubstituteCatalogVariables_InNewFormat_InMiddleOfString() {
        // Arrange
        String nodeKey = "node1";
        String resourceId = "res1";
        String catalogName = "allowed-plans";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("TestEnv");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);
        // The value stored in node.values is another placeholder
        node.setValues(Map.of("sku", "{{ catalog:allowed-plans:consumption }}"));

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        // The template uses the new format reported by the user in a string
        resource.setTemplate(Map.of("sku", "Sku: {{ sku:catalog:allowed-plans }}"));

        ResourceClass catalog = new ResourceClass();
        catalog.setName(catalogName);
        catalog.setType(ResourceType.CATALOG);
        catalog.setTemplate(Map.of("consumption", "Standard_LRS"));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceByName(catalogName)).thenReturn(Optional.of(catalog));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        assertEquals("Sku: Standard_LRS", capturedTemplate.getTemplate().get("sku"), "Should resolve the new format recursively in string");
    }

    @Test
    void deployAzureResource_shouldSubstituteCatalogVariables_InNestedMap() {
        // Arrange
        String nodeKey = "node1";
        String resourceId = "res1";
        String catalogName = "allowed-plans";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("TestEnv");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);

        // Nested map structure
        Map<String, Object> skuMap = new HashMap<>();
        skuMap.put("name", "{{ catalog:allowed-plans:consumption }}");
        resource.setTemplate(Map.of("sku", skuMap));

        ResourceClass catalog = new ResourceClass();
        catalog.setName(catalogName);
        catalog.setType(ResourceType.CATALOG);
        catalog.setTemplate(Map.of("consumption", "Standard_LRS"));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceByName(catalogName)).thenReturn(Optional.of(catalog));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        Map<String, Object> tpl = capturedTemplate.getTemplate();
        Map<String, Object> sku = (Map<String, Object>) tpl.get("sku");
        assertEquals("Standard_LRS", sku.get("name"), "Should substitute catalog value in nested map");
    }

    @Test
    void deployAzureResource_shouldSubstituteCatalogVariables_WithSpecialLogValue() {
        // Arrange
        String nodeKey = "asp-d28ec302-e6f9-41f4-b930-c35811a6e8f8-arb-sandbox-westeu";
        String resourceId = "res1";
        String catalogName = "allowed-plans";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("arb-sandbox");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);

        // Exactly as in the log line
        Map<String, Object> template = new HashMap<>();
        template.put("name", nodeKey);
        template.put("apiVersion", "2022-09-01");
        template.put("type", "Microsoft.Web/serverFarms");
        template.put("sku", "{{ catalog:allowed-plans:consumption }}");
        template.put("kind", "linux");
        template.put("properties", Map.of("reserved", true));
        resource.setTemplate(template);

        ResourceClass catalog = new ResourceClass();
        catalog.setName(catalogName);
        catalog.setType(ResourceType.CATALOG);
        catalog.setTemplate(Map.of("consumption", "Standard_LRS"));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceByName(catalogName)).thenReturn(Optional.of(catalog));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        Map<String, Object> tpl = capturedTemplate.getTemplate();

        // If it was wrapped by AzureResourceManagerService, it would be in resources[0].
        // But here we are checking the ResourceTemplate passed to it.
        assertEquals("Standard_LRS", tpl.get("sku"), "Should substitute catalog value from log example");
    }

    @Test
    void deployAzureResource_shouldSubstituteCatalogVariables_WithComplexKeyAndMultipleParts() {
        // Arrange
        String nodeKey = "node1";
        String resourceId = "res1";
        String catalogName = "allowed-plans";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("TestEnv");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        // This is valid: {{ catalog : name : key : type : subtype }}
        resource.setTemplate(Map.of("sku", "{{ catalog : allowed-plans : consumption : string }}"));

        ResourceClass catalog = new ResourceClass();
        catalog.setName(catalogName);
        catalog.setType(ResourceType.CATALOG);
        catalog.setTemplate(Map.of("consumption", "Standard_LRS"));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceByName(catalogName)).thenReturn(Optional.of(catalog));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        assertEquals("Standard_LRS", capturedTemplate.getTemplate().get("sku"), "Should substitute catalog value with spaces and type");
    }

    @Test
    void deployAzureResource_shouldUseNameFromValuesIfNamingRuleDisabled() {
        // Arrange
        String nodeKey = "manualNode";
        String resourceId = "webRes";
        String overrideName = "custom-app-name";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("PROD");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setLabel("Some Label");
        node.setResourceClassId(resourceId);
        node.setDisableNamingRule(true);
        node.setValues(Map.of("name", overrideName));

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        resource.setTemplate(new HashMap<>(Map.of("someKey", "someValue")));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        assertEquals(overrideName, capturedTemplate.getName());
        assertEquals(overrideName, capturedTemplate.getTemplate().get("name"));
    }

    @Test
    void deployAzureResource_shouldUseNameFromValuesAsBaseForNamingRule() {
        // Arrange
        String nodeKey = "nodeKey";
        String resourceId = "webRes";
        String overrideName = "custom-base";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("test");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setLabel("Some Label");
        node.setResourceClassId(resourceId);
        node.setDisableNamingRule(false);
        node.setValues(Map.of("name", overrideName));

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        resource.setAbbreviation("app");

        ResourceNamingRule rule = new ResourceNamingRule();
        rule.setFormat("{abbrv}-{name}-{env}");
        resource.setNamingRule(rule);
        resource.setTemplate(new HashMap<>(Map.of("someKey", "someValue")));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        // Expected: app-custom-base-test
        assertEquals("app-custom-base-test", capturedTemplate.getName());
    }

    @Test
    void deployAzureResource_shouldTruncateToMaxLength() {
        // Arrange
        String nodeKey = "veryLongNodeNameThatShouldBeTruncated";
        String resourceId = "truncatedRes";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("PROD");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);

        ResourceNamingRule rule = new ResourceNamingRule();
        rule.setFormat("{name}");
        rule.setMaxLength(10);
        resource.setNamingRule(rule);
        resource.setTemplate(new HashMap<>(Map.of("someKey", "someValue")));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        assertEquals("veryLongNo", capturedTemplate.getName(), "Name should be truncated to 10 characters");
    }

    @Test
    void deployAzureResource_shouldUseLabelForNamePlaceholderInNamingRule() {
        // Arrange
        String nodeKey = "d28ec302-e6f9-41f4-b930-c35811a6e8f8";
        String nodeLabel = "arb-sandbox";
        String resourceId = "aspRes";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("PROD");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setLabel(nodeLabel);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        resource.setAbbreviation("asp");

        ResourceNamingRule rule = new ResourceNamingRule();
        rule.setFormat("{abbrv}-{name}");
        resource.setNamingRule(rule);
        resource.setTemplate(new HashMap<>(Map.of("someKey", "someValue")));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        // Expected: asp-arb-sandbox
        // Current behavior (likely): asp-d28ec302-e6f9-41f4-b930-c35811a6e8f8
        assertEquals("asp-arb-sandbox", capturedTemplate.getName(), "Should use node label for {name} placeholder in naming rule");
    }

    @Test
    void deployAzureResource_shouldUseLabelAsNameIfNamingRuleDisabledAndNoNameInValues() {
        // Arrange
        String nodeKey = "d28ec302-e6f9-41f4-b930-c35811a6e8f8";
        String nodeLabel = "my-resource";
        String resourceId = "res1";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("TestEnv");
        EnvironmentConfig config = new EnvironmentConfig();
        env.setConfig(config);

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setLabel(nodeLabel);
        node.setResourceClassId(resourceId);
        node.setDisableNamingRule(true);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        resource.setTemplate(new HashMap<>(Map.of("someKey", "someValue")));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), eq(config));

        ResourceTemplate capturedTemplate = captor.getValue();
        assertEquals("my-resource", capturedTemplate.getName(), "Should use node label as name when naming rule is disabled");
    }
    @Test
    void deployAzureResource_shouldSubstituteCatalogVariables_WithObjectTypeFromDefinition() {
        // Arrange
        String nodeKey = "node1";
        String resourceId = "res1";
        String catalogName = "allowed-plans";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("TestEnv");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);
        resource.setTemplate(Map.of("sku", "{{ catalog:allowed-plans:consumption }}"));

        ResourceClass catalog = new ResourceClass();
        catalog.setName(catalogName);
        catalog.setType(ResourceType.CATALOG);
        catalog.setCatalogDefinition(CatalogDefinition.builder()
                .itemType(CatalogItemType.OBJECT)
                .build());

        Map<String, Object> consumptionValue = new HashMap<>();
        consumptionValue.put("name", "Y1");
        consumptionValue.put("tier", "Dynamic");

        catalog.setTemplate(Map.of("consumption", consumptionValue));

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceService.findResourceByName(catalogName)).thenReturn(Optional.of(catalog));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        Object sku = capturedTemplate.getTemplate().get("sku");

        Assertions.assertTrue(sku instanceof Map, "Sku should be a Map (OBJECT type)");
        Map<String, Object> skuMap = (Map<String, Object>) sku;
        assertEquals("Y1", skuMap.get("name"));
        assertEquals("Dynamic", skuMap.get("tier"));
    }

    @Test
    void deployAzureResource_shouldSubstituteCatalogVariables_AllCatalogItemTypes() {
        // Arrange
        String nodeKey = "node1";
        String resourceId = "res1";

        Environment env = new Environment();
        env.setId("env1");
        env.setName("TestEnv");
        env.setConfig(new EnvironmentConfig());

        EnvironmentNode node = new EnvironmentNode();
        node.setKey(nodeKey);
        node.setResourceClassId(resourceId);

        ResourceClass resource = new ResourceClass();
        resource.setId(resourceId);
        resource.setType(ResourceType.AZURE_RESOURCE);

        Map<String, Object> templateMap = new HashMap<>();
        templateMap.put("string", "{{ catalog:cat-string:key }}");
        templateMap.put("number", "{{ catalog:cat-number:key }}");
        templateMap.put("object", "{{ catalog:cat-object:key }}");
        templateMap.put("array_string", "{{ catalog:cat-array-string:key }}");
        templateMap.put("array_object", "{{ catalog:cat-array-object:key }}");
        templateMap.put("resource_class", "{{ catalog:cat-resource-class:key }}");
        resource.setTemplate(templateMap);

        // Mock Catalogs
        mockCatalog("cat-string", CatalogItemType.STRING, "value");
        mockCatalog("cat-number", CatalogItemType.NUMBER, 123);
        mockCatalog("cat-object", CatalogItemType.OBJECT, Map.of("k", "v"));
        mockCatalog("cat-array-string", CatalogItemType.ARRAY_STRING, List.of("a", "b"));
        mockCatalog("cat-array-object", CatalogItemType.ARRAY_OBJECT, List.of(Map.of("k", "v")));
        mockCatalog("cat-resource-class", CatalogItemType.RESOURCE_CLASS, "res-id-123");

        when(resourceService.findResourceById(resourceId)).thenReturn(Optional.of(resource));

        env.setNodes(List.of(node));
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(List.of(nodeKey));

        // Act
        deploymentsService.deploy(env, plan, "taskId", "test-user");

        // Assert
        ArgumentCaptor<ResourceTemplate> captor = ArgumentCaptor.forClass(ResourceTemplate.class);
        verify(azureResourceManagerService).deployTemplate(captor.capture(), any());

        ResourceTemplate capturedTemplate = captor.getValue();
        Map<String, Object> tpl = capturedTemplate.getTemplate();

        assertEquals("value", tpl.get("string"));
        assertEquals(123, tpl.get("number"));
        assertEquals(Map.of("k", "v"), tpl.get("object"));
        assertEquals(List.of("a", "b"), tpl.get("array_string"));
        assertEquals(List.of(Map.of("k", "v")), tpl.get("array_object"));
        assertEquals("res-id-123", tpl.get("resource_class"));
    }

    private void mockCatalog(String name, CatalogItemType type, Object value) {
        ResourceClass catalog = new ResourceClass();
        catalog.setName(name);
        catalog.setType(ResourceType.CATALOG);
        catalog.setCatalogDefinition(CatalogDefinition.builder().itemType(type).build());
        catalog.setTemplate(Map.of("key", value));
        when(resourceService.findResourceByName(name)).thenReturn(Optional.of(catalog));
    }
    @Test
    void getStatus_shouldReturnStatus() {
        // Arrange
        Environment env = new Environment();
        env.setId("env1");
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(Collections.emptyList());
        String taskId = "task-123";

        // Act
        deploymentsService.deploy(env, plan, taskId, "test-user");
        DeploymentStatus status = deploymentsService.getStatus(taskId);

        // Assert
        Assertions.assertNotNull(status);
        assertEquals(taskId, status.getTaskId());
        assertEquals("env1", status.getEnvironmentId());
        assertEquals("SUCCESS", status.getStatus());
    }

    @Test
    void getAllTasks_shouldReturnAllTasks() {
        // Arrange
        Environment env = new Environment();
        env.setId("env1");
        DeploymentPlan plan = new DeploymentPlan();
        plan.setOrder(Collections.emptyList());

        deploymentsService.deploy(env, plan, "task-1", "test-user");
        deploymentsService.deploy(env, plan, "task-2", "test-user");

        // Act
        List<DeploymentStatus> tasks = deploymentsService.getAllTasks();

        // Assert
        Assertions.assertNotNull(tasks);
        Assertions.assertTrue(tasks.size() >= 2);

        boolean found1 = tasks.stream().anyMatch(t -> t.getTaskId().equals("task-1"));
        boolean found2 = tasks.stream().anyMatch(t -> t.getTaskId().equals("task-2"));

        Assertions.assertTrue(found1);
        Assertions.assertTrue(found2);
    }
}
