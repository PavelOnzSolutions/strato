package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.*;
import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import solutions.onz.platform.strato.creator.forge.domain.Environment;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentConfig;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentNode;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentReference;
import solutions.onz.platform.strato.creator.forge.services.AzureResourceManagerService;
import solutions.onz.platform.strato.creator.forge.services.EnvironmentsService;
import solutions.onz.platform.strato.creator.forge.services.dto.DeploymentPlan;
import solutions.onz.platform.strato.creator.forge.services.dto.EnvironmentImportDtos;
import solutions.onz.platform.strato.creator.forge.repositories.EnvironmentConfigRepository;
import solutions.onz.platform.strato.creator.forge.repositories.EnvironmentNodeRepository;
import solutions.onz.platform.strato.creator.forge.repositories.EnvironmentReferenceRepository;
import solutions.onz.platform.strato.creator.forge.repositories.EnvironmentRepository;
import solutions.onz.platform.strato.creator.repositories.DeploymentVersionMatrixRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EnvironmentsServiceTest {

    @Mock
    private EnvironmentRepository environmentRepository;
    @Mock
    private EnvironmentConfigRepository configRepository;
    @Mock
    private EnvironmentNodeRepository nodeRepository;
    @Mock
    private EnvironmentReferenceRepository referenceRepository;
    @Mock
    private EncryptionService encryptionService;
    @Mock
    private ResourceService resourceService;
    @Mock
    private DeploymentVersionMatrixRepository matrixRepository;

    @InjectMocks
    private EnvironmentsService environmentsService;

    @Test
    void testCreatePlanOrder() {
        // Arrange
        EnvironmentNode nodeA = new EnvironmentNode();
        nodeA.setKey("nodeA");
        nodeA.setLabel("Resource A");

        EnvironmentNode nodeB = new EnvironmentNode();
        nodeB.setKey("nodeB");
        nodeB.setLabel("Resource B");

        // nodeA (provider) -> nodeB (consumer)
        EnvironmentReference ref = new EnvironmentReference();
        ref.setFromNode("nodeA");
        ref.setToNode("nodeB");

        Environment env = new Environment();
        env.setNodes(Arrays.asList(nodeA, nodeB));
        env.setReferences(List.of(ref));

        // Act
        DeploymentPlan plan = environmentsService.createPlan(env);

        // Assert
        assertNotNull(plan);
        assertEquals(2, plan.getOrder().size());
        assertEquals("nodeA", plan.getOrder().get(0), "nodeA should be first since it's the provider");
        assertEquals("nodeB", plan.getOrder().get(1), "nodeB should be second since it's the consumer");

        assertEquals(1, plan.getEdges().size());
        assertEquals("nodeA", plan.getEdges().get(0).getFrom());
        assertEquals("nodeB", plan.getEdges().get(0).getTo());
    }

    @Test
    void testEnvironmentReferenceHandles() {
        // Arrange
        EnvironmentReference ref = EnvironmentReference.builder()
                .fromNode("nodeA")
                .fromAttribute("attrA")
                .fromHandle("right")
                .toNode("nodeB")
                .toAttribute("attrB")
                .toHandle("left")
                .build();

        Environment env = new Environment();
        env.setReferences(List.of(ref));

        when(referenceRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(environmentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Environment saved = environmentsService.create(env);

        // Assert
        assertNotNull(saved.getReferences());
        assertEquals(1, saved.getReferences().size());
        EnvironmentReference savedRef = saved.getReferences().get(0);
        assertEquals("right", savedRef.getFromHandle());
        assertEquals("left", savedRef.getToHandle());
    }

    @Test
    void testUpdateCleanupOrphans() {
        // Arrange
        String envId = "env1";
        Environment existingEnv = new Environment();
        existingEnv.setId(envId);

        EnvironmentNode existingNode = new EnvironmentNode();
        existingNode.setId("n1");
        existingEnv.setNodes(List.of(existingNode));

        EnvironmentReference existingRef = new EnvironmentReference();
        existingRef.setId("r1");
        existingEnv.setReferences(List.of(existingRef));

        Environment incomingEnv = new Environment();
        incomingEnv.setNodes(List.of()); // No nodes, so existingNode is an orphan
        incomingEnv.setReferences(List.of()); // No refs, so existingRef is an orphan

        when(environmentRepository.findById(envId)).thenReturn(Optional.of(existingEnv));
        when(nodeRepository.saveAll(any())).thenReturn(List.of());
        when(referenceRepository.saveAll(any())).thenReturn(List.of());
        when(environmentRepository.save(any())).thenReturn(existingEnv);

        // Act
        environmentsService.update(envId, incomingEnv);

        // Assert
        verify(nodeRepository).deleteAll(argThat(iterable -> {
            int count = 0;
            String id = null;
            for (EnvironmentNode n : iterable) {
                count++;
                id = n.getId();
            }
            return count == 1 && "n1".equals(id);
        }));
        verify(referenceRepository).deleteAll(argThat(iterable -> {
            int count = 0;
            String id = null;
            for (EnvironmentReference r : iterable) {
                count++;
                id = r.getId();
            }
            return count == 1 && "r1".equals(id);
        }));
    }

    @org.mockito.Spy
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Test
    void testCreateWithObjectValues() {
        // Arrange
        EnvironmentNode node = new EnvironmentNode();
        node.setKey("node1");
        node.setResourceClassId("rc1");

        java.util.Map<String, Object> values = new java.util.HashMap<>();
        values.put("simple", "string");
        values.put("complex", java.util.Map.of("foo", "bar", "num", 123));
        values.put("array", java.util.List.of("a", "b"));
        node.setValues(values);

        Environment env = new Environment();
        env.setNodes(List.of(node));

        // Mock resource lookup to return empty or simple resource (no secure keys)
        ResourceClass rc = new ResourceClass();
        rc.setId("rc1");
        when(resourceService.findResourceById("rc1")).thenReturn(Optional.of(rc));

        when(environmentRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(nodeRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));

        // Act
        Environment result = environmentsService.create(env);

        // Assert
        assertNotNull(result);
        EnvironmentNode savedNode = result.getNodes().get(0);
        assertEquals("string", savedNode.getValues().get("simple"));

        // precise class match might depend on Jackson but here we passed Map directly
        // and no encryption happened, so it should remain Map
        assertTrue(savedNode.getValues().get("complex") instanceof java.util.Map);
        assertEquals("bar", ((java.util.Map) savedNode.getValues().get("complex")).get("foo"));

        assertTrue(savedNode.getValues().get("array") instanceof java.util.List);
        assertEquals("b", ((java.util.List) savedNode.getValues().get("array")).get(1));
    }

    @Test
    void testSecureObjectValues() throws Exception {
        // Arrange
        EnvironmentNode node = new EnvironmentNode();
        node.setKey("nodeSecure");
        node.setResourceClassId("rcSecure");

        java.util.Map<String, Object> initialValues = new java.util.HashMap<>();
        java.util.Map<String, Object> secretObj = java.util.Map.of("username", "admin", "password", "1234");
        initialValues.put("credential", secretObj);
        node.setValues(initialValues);

        Environment env = new Environment();
        env.setNodes(List.of(node));

        ResourceClass rc = new ResourceClass();
        rc.setId("rcSecure");
        // Template defining 'credential' as secure object
        rc.setTemplate(java.util.Map.of("dummy", "{{ credential:object! }}"));

        when(resourceService.findResourceById("rcSecure")).thenReturn(Optional.of(rc));
        when(nodeRepository.saveAll(any())).thenAnswer(i -> i.getArgument(0));
        when(environmentRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        // Mock encryption
        when(encryptionService.encrypt(any())).thenAnswer(inv -> "ENC:" + inv.getArgument(0));
        // Mock decryption
        when(encryptionService.decrypt(any())).thenAnswer(inv -> {
            String s = (String) inv.getArgument(0);
            return s.startsWith("ENC:") ? s.substring(4) : s;
        });

        // Act
        Environment saved = environmentsService.create(env);

        // Assert Internal State (should be encrypted string)
        // 'create' returns the processed OUT environment (decrypted).
        // We need to capture what was passed to save() or check the encryption call.

        verify(encryptionService).encrypt(argThat(s -> s.contains("admin") && s.contains("1234") && s.startsWith("{")));

        // The returned environment should be decrypted back to Object because template
        // says it's object
        EnvironmentNode resultNode = saved.getNodes().get(0);
        Object decryptedVal = resultNode.getValues().get("credential");

        assertNotNull(decryptedVal);
        assertTrue(decryptedVal instanceof java.util.Map<?, ?>,
                "Should be deserialized back to Map, was: " + decryptedVal.getClass());
        assertEquals("admin", ((java.util.Map<?, ?>) decryptedVal).get("username"));
    }
        @Test
    void testClone() {
        // Arrange source environment with nodes and references
        EnvironmentNode n1 = new EnvironmentNode();
        n1.setId("node-src-1");
        n1.setKey("db");
        n1.setLabel("Database");
        n1.setResourceClassId("rc-db");
        n1.setValues(new java.util.HashMap<>(java.util.Map.of("user", "u", "pass", "p")));

        EnvironmentNode n2 = new EnvironmentNode();
        n2.setId("node-src-2");
        n2.setKey("api");
        n2.setLabel("API");
        n2.setResourceClassId("rc-api");
        n2.setValues(new java.util.HashMap<>(java.util.Map.of("port", 8080)));

        EnvironmentReference ref = new EnvironmentReference();
        ref.setId("ref-src-1");
        ref.setFromNode("api");
        ref.setFromAttribute("conn");
        ref.setToNode("db");
        ref.setToAttribute("url");

        Environment source = new Environment();
        source.setId("env-src-1");
        source.setName("Original");
        source.setNodes(java.util.List.of(n1, n2));
        source.setReferences(java.util.List.of(ref));
        source.setDocumentId(java.util.UUID.randomUUID());
        source.setVersion(3);

        when(environmentRepository.findById("env-src-1")).thenReturn(java.util.Optional.of(source));

        // Mock deep save of nodes to return NEW node instances with different IDs
        EnvironmentNode savedN1 = new EnvironmentNode();
        savedN1.setId("node-new-1");
        savedN1.setKey(n1.getKey());
        savedN1.setLabel(n1.getLabel());
        savedN1.setResourceClassId(n1.getResourceClassId());
        savedN1.setValues(new java.util.HashMap<>(n1.getValues()));

        EnvironmentNode savedN2 = new EnvironmentNode();
        savedN2.setId("node-new-2");
        savedN2.setKey(n2.getKey());
        savedN2.setLabel(n2.getLabel());
        savedN2.setResourceClassId(n2.getResourceClassId());
        savedN2.setValues(new java.util.HashMap<>(n2.getValues()));

        when(nodeRepository.saveAll(any())).thenReturn(java.util.List.of(savedN1, savedN2));

        // Mock deep save of references
        EnvironmentReference savedRef = new EnvironmentReference();
        savedRef.setId("ref-new-1");
        savedRef.setFromNode(ref.getFromNode());
        savedRef.setFromAttribute(ref.getFromAttribute());
        savedRef.setToNode(ref.getToNode());
        savedRef.setToAttribute(ref.getToAttribute());
        when(referenceRepository.saveAll(any())).thenReturn(java.util.List.of(savedRef));

        // New config to apply
        EnvironmentConfig newCfg = new EnvironmentConfig();
        newCfg.setSubscriptionId("sub-123");
        newCfg.setRegion("westeurope");
        newCfg.setResourceGroup("rg-clone");

        EnvironmentConfig savedCfg = new EnvironmentConfig();
        savedCfg.setId("cfg-new-1");
        savedCfg.setSubscriptionId(newCfg.getSubscriptionId());
        savedCfg.setRegion(newCfg.getRegion());
        savedCfg.setResourceGroup(newCfg.getResourceGroup());
        when(configRepository.save(any())).thenReturn(savedCfg);

        // Mock repository save to simulate versioning listener creating new documentId and version=1
        when(environmentRepository.save(any())).thenAnswer(inv -> {
            Environment toSave = inv.getArgument(0);
            // simulate persistence side effects
            toSave.setId("env-new-1");
            toSave.setDocumentId(java.util.UUID.randomUUID());
            toSave.setVersion(1);
            toSave.setDeleted(false);
            return toSave;
        });

        // Act
        Environment cloned = environmentsService.clone("env-src-1", "ClonedEnv", newCfg);

        // Assert
        assertNotNull(cloned);
        assertEquals("ClonedEnv", cloned.getName());
        assertNotNull(cloned.getId());
        assertNotEquals(source.getId(), cloned.getId());
        assertNotNull(cloned.getDocumentId());
        assertNotEquals(source.getDocumentId(), cloned.getDocumentId());
        assertEquals(1, cloned.getVersion());

        // Config saved and attached
        assertNotNull(cloned.getConfig());
        assertEquals("cfg-new-1", cloned.getConfig().getId());
        assertEquals("sub-123", cloned.getConfig().getSubscriptionId());
        assertEquals("westeurope", cloned.getConfig().getRegion());
        assertEquals("rg-clone", cloned.getConfig().getResourceGroup());

        // Nodes deep copied and saved as new objects
        assertEquals(2, cloned.getNodes().size());
        assertTrue(cloned.getNodes().stream().anyMatch(x -> "node-new-1".equals(x.getId())));
        assertTrue(cloned.getNodes().stream().anyMatch(x -> "node-new-2".equals(x.getId())));

        // References deep copied
        assertEquals(1, cloned.getReferences().size());
        assertEquals("ref-new-1", cloned.getReferences().get(0).getId());

        // Original vs cloned node IDs differ
        java.util.Set<String> originalNodeIds = new java.util.HashSet<>(java.util.List.of("node-src-1", "node-src-2"));
        java.util.Set<String> clonedNodeIds = cloned.getNodes().stream().map(EnvironmentNode::getId).collect(java.util.stream.Collectors.toSet());
        assertTrue(clonedNodeIds.stream().noneMatch(originalNodeIds::contains));
    }

    @Mock
    private AzureResourceManagerService azureResourceManagerService;

    @Test
    void testImportFromResourceGroupBestMatch() {
        // Arrange
        EnvironmentImportDtos.ImportRequest request = EnvironmentImportDtos.ImportRequest.builder()
                .source(EnvironmentImportDtos.ImportSource.ARM)
                .subscriptionId("sub1")
                .resourceGroup("rg1")
                .build();

        // 1. Exact match (1.0)
        EnvironmentImportDtos.ImportedItem item1 = EnvironmentImportDtos.ImportedItem.builder()
                .id("res1")
                .type("TypeA")
                .apiVersion("v1")
                .kind("Kind1")
                .build();

        // 2. Type + Kind match (0.8)
        EnvironmentImportDtos.ImportedItem item2 = EnvironmentImportDtos.ImportedItem.builder()
                .id("res2")
                .type("TypeA")
                .apiVersion("v2") // different api version
                .kind("Kind1")
                .build();

        // 3. Type only match (0.7)
        EnvironmentImportDtos.ImportedItem item3 = EnvironmentImportDtos.ImportedItem.builder()
                .id("res3")
                .type("TypeA")
                .apiVersion("v2")
                .kind("Kind2")
                .build();

        when(azureResourceManagerService.listResourceGroupResources(any())).thenReturn(List.of(item1, item2, item3));

        ResourceClass rc1 = new ResourceClass().setId("rc1").setName("Exact").setTemplate(new java.util.HashMap<>(java.util.Map.of(
                "type", "TypeA", "apiVersion", "v1", "kind", "Kind1")));
        
        ResourceClass rc2 = new ResourceClass().setId("rc2").setName("TypeOnly").setTemplate(new java.util.HashMap<>(java.util.Map.of(
                "type", "TypeA")));

        when(resourceService.findAllResourcesByType(ResourceType.AZURE_RESOURCE)).thenReturn(List.of(rc1, rc2));

        // Act
        EnvironmentImportDtos.ImportResult result = environmentsService.importFromResourceGroup(request);

        // Assert
        assertEquals(3, result.getMatches().size());

        // res1 should match rc1 (1.0)
        var m1 = result.getMatches().stream().filter(m -> "res1".equals(m.getImported().getId())).findFirst().get();
        assertEquals("rc1", m1.getMatchedResourceId());
        assertEquals(1.0, m1.getConfidence());

        // res2 should match rc1 (0.8 - same type and kind, but different api)
        var m2 = result.getMatches().stream().filter(m -> "res2".equals(m.getImported().getId())).findFirst().get();
        assertEquals("rc1", m2.getMatchedResourceId());
        assertEquals(0.8, m2.getConfidence());

        // res3 should match rc1 or rc2 (0.7 - same type only)
        var m3 = result.getMatches().stream().filter(m -> "res3".equals(m.getImported().getId())).findFirst().get();
        assertEquals(0.7, m3.getConfidence());
    }

    @Test
    void testPatchWithDottedKeys() {
        // Arrange
        String id = "env-1";
        Environment existing = new Environment();
        existing.setId(id);
        existing.setName("Existing");

        EnvironmentNode existingNode = new EnvironmentNode();
        existingNode.setId("node-1");
        existingNode.setKey("node1");
        existing.setNodes(List.of(existingNode));

        Environment changes = new Environment();
        EnvironmentNode updatedNode = new EnvironmentNode();
        updatedNode.setId("node-1");
        updatedNode.setKey("node1");
        Map<String, Object> values = new HashMap<>();
        values.put("properties.serverFarmId", "some-id");
        updatedNode.setValues(values);
        changes.setNodes(List.of(updatedNode));

        when(environmentRepository.findById(id)).thenReturn(Optional.of(existing));
        when(nodeRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(environmentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Optional<Environment> patched = environmentsService.patch(id, changes);

        // Assert
        assertTrue(patched.isPresent());
        Environment patchedEnv = patched.get();
        assertEquals(1, patchedEnv.getNodes().size());
        assertEquals("some-id", patchedEnv.getNodes().get(0).getValues().get("properties.serverFarmId"));
    }

    @Test
    void testPatchConfigPartial() {
        // Arrange
        String envId = "env-1";
        String configId = "cfg-1";

        EnvironmentConfig existingConfig = EnvironmentConfig.builder()
                .id(configId)
                .subscriptionId("old-sub")
                .azureCredentialId("old-cred")
                .region("westeurope")
                .build();

        Environment existing = new Environment();
        existing.setId(envId);
        existing.setName("Existing");
        existing.setConfig(existingConfig);

        // PATCH request only contains new azureCredentialId
        EnvironmentConfig configChanges = EnvironmentConfig.builder()
                .azureCredentialId("new-cred")
                .build();

        Environment changes = new Environment();
        changes.setConfig(configChanges);

        when(environmentRepository.findById(envId)).thenReturn(Optional.of(existing));
        // Mock configRepository.save to return what it receives
        when(configRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(environmentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Optional<Environment> patched = environmentsService.patch(envId, changes);

        // Assert
        assertTrue(patched.isPresent());
        Environment patchedEnv = patched.get();
        assertNotNull(patchedEnv.getConfig());
        assertEquals("new-cred", patchedEnv.getConfig().getAzureCredentialId());
        // Check if old fields are preserved
        assertEquals("old-sub", patchedEnv.getConfig().getSubscriptionId(), "Subscription ID should be preserved");
        assertEquals("westeurope", patchedEnv.getConfig().getRegion(), "Region should be preserved");
    }
    @Test
    void testHardDeleteDocumentWithNullsInLists() {
        // Arrange
        UUID documentId = UUID.randomUUID();
        Environment env = new Environment();
        env.setId("env1");
        
        // Simulate a list with a null element (which happens when @DBRef points to a missing document)
        List<EnvironmentNode> nodes = new ArrayList<>();
        nodes.add(null);
        env.setNodes(nodes);

        List<EnvironmentReference> references = new ArrayList<>();
        references.add(null);
        env.setReferences(references);

        when(environmentRepository.findAllByDocumentId(documentId)).thenReturn(Collections.singletonList(env));

        // Act & Assert
        assertDoesNotThrow(() -> environmentsService.hardDeleteDocument(documentId));

        verify(environmentRepository).delete(env);
        verify(nodeRepository, org.mockito.Mockito.never()).deleteAll(org.mockito.ArgumentMatchers.argThat(iterable -> {
            if (iterable == null) return false;
            for (Object o : iterable) {
                if (o == null) return true;
            }
            return false;
        }));
    }
}
