package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.AuditLog;
import solutions.onz.platform.strato.creator.provisioner.domain.Configuration;
import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationLock;
import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogEntityOperation;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.Flavor;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationSchemaService;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationService;
import solutions.onz.platform.strato.creator.provisioner.services.EffectiveSchemaMaterializer;
import solutions.onz.platform.strato.creator.repositories.AuditLogRepository;
import solutions.onz.platform.strato.creator.provisioner.repositories.ConfigurationLockRepository;
import solutions.onz.platform.strato.creator.provisioner.repositories.ConfigurationRepository;
import solutions.onz.platform.strato.creator.provisioner.api.exception.ConfigurationLockedException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ConfigurationServiceTest {

    @Mock
    private ConfigurationRepository configurationRepository;

    @Mock
    private ConfigurationLockRepository configurationLockRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private ConfigurationSchemaService schemaService;

    @Mock
    private EncryptionService encryptionService;

    @Mock
    private EffectiveSchemaMaterializer materializer;

    @Mock
    private ConfigurationDataValidator validator;

    @InjectMocks
    private ConfigurationService configurationService;

    /** Helper: a materialized schema with a single section "functions" containing an "apiKey" secret + "baseUrl" string. */
    private Map<String, Object> singleSectionMaterialized(String sectionKey) {
        Map<String, Object> fieldProps = new LinkedHashMap<>();
        fieldProps.put("apiKey", Map.of("type", "secret"));
        fieldProps.put("baseUrl", Map.of("type", "string"));
        Map<String, Object> itemSchema = Map.of("type", "object", "properties", fieldProps);
        Map<String, Object> sectionSchema = Map.of("type", "object", "additionalProperties", itemSchema);
        return Map.of("type", "object", "properties", Map.of(sectionKey, sectionSchema));
    }

    @Test
    void testFindAllLatestVersions() {
        UUID docId1 = UUID.randomUUID();
        UUID docId2 = UUID.randomUUID();

        Configuration c1v1 = new Configuration();
        c1v1.setId("1");
        c1v1.setDocumentId(docId1);
        c1v1.setVersion(1);
        c1v1.setName("Config A");

        Configuration c1v2 = new Configuration();
        c1v2.setId("2");
        c1v2.setDocumentId(docId1);
        c1v2.setVersion(2);
        c1v2.setName("Config A Updated");

        Configuration c2v1 = new Configuration();
        c2v1.setId("3");
        c2v1.setDocumentId(docId2);
        c2v1.setVersion(1);
        c2v1.setName("Config B");
        c2v1.setDeleted(true);

        Configuration c2v2 = new Configuration();
        c2v2.setId("4");
        c2v2.setDocumentId(docId2);
        c2v2.setVersion(2);
        c2v2.setName("Config B Updated");

        when(configurationRepository.findAll()).thenReturn(Arrays.asList(c1v1, c1v2, c2v1, c2v2));
        when(configurationLockRepository.findAllByDocumentIdIn(any())).thenReturn(List.of());

        List<Configuration> result = configurationService.findAllLatestVersions();

        assertEquals(2, result.size());
        assertTrue(result.stream().anyMatch(c -> c.getId().equals("2")));
        assertTrue(result.stream().anyMatch(c -> c.getId().equals("4")));
    }

    @Test
    void testFindById() {
        UUID docId = UUID.randomUUID();
        Configuration config = Configuration.builder().id("1").name("Test").build();
        config.setDocumentId(docId);
        when(configurationRepository.findById("1")).thenReturn(Optional.of(config));
        when(configurationLockRepository.findByDocumentId(docId)).thenReturn(Optional.empty());

        Optional<Configuration> result = configurationService.findById("1");

        assertTrue(result.isPresent());
        assertEquals("Test", result.get().getName());
        assertFalse(result.get().isLocked());
    }

    @Test
    void testFindByIdPopulatesLockedTrue() {
        UUID docId = UUID.randomUUID();
        Configuration config = Configuration.builder().id("1").name("Test").build();
        config.setDocumentId(docId);
        ConfigurationLock lock = ConfigurationLock.builder().documentId(docId).locked(true).build();
        when(configurationRepository.findById("1")).thenReturn(Optional.of(config));
        when(configurationLockRepository.findByDocumentId(docId)).thenReturn(Optional.of(lock));

        Optional<Configuration> result = configurationService.findById("1");

        assertTrue(result.isPresent());
        assertTrue(result.get().isLocked());
    }

    @Test
    void testSave() {
        Configuration config = Configuration.builder().name("Test").build();
        config.setDocumentId(UUID.randomUUID());
        when(configurationRepository.save(config)).thenReturn(config);
        when(configurationLockRepository.findByDocumentId(any())).thenReturn(Optional.empty());

        Configuration result = configurationService.save(config);

        assertNotNull(result);
        assertEquals("Test", result.getName());
        verify(configurationRepository).save(config);
    }

    @Test
    void testSaveThrowsWhenLocked() {
        UUID docId = UUID.randomUUID();
        Configuration config = Configuration.builder().name("Test").build();
        config.setDocumentId(docId);
        ConfigurationLock lock = ConfigurationLock.builder().documentId(docId).locked(true).build();
        when(configurationLockRepository.findByDocumentId(docId)).thenReturn(Optional.of(lock));

        assertThrows(ConfigurationLockedException.class, () -> configurationService.save(config));
        verify(configurationRepository, never()).save(any());
    }

    @Test
    void save_rejectsUnknownSection() {
        String schemaIdStr = UUID.randomUUID().toString();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .flavor(Flavor.AZURE).sections(List.of()).build();
        schema.setId(schemaIdStr);
        when(schemaService.findById(schemaIdStr)).thenReturn(Optional.of(schema));
        when(configurationLockRepository.findByDocumentId(any())).thenReturn(Optional.empty());

        // Materialized schema for an empty sections list:
        Map<String, Object> materialized = Map.of("type", "object", "properties", Map.of());
        when(materializer.materialize(schema)).thenReturn(materialized);
        // Delegate to a real validator so we actually exercise the unknown-section detection.
        doAnswer(inv -> {
            new ConfigurationDataValidator().validateConfigurationData(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(validator).validateConfigurationData(any(), any());

        Configuration config = Configuration.builder()
                .schemaId(schemaIdStr)
                .data(Map.of("functions", Map.of("f1", Map.of())))
                .build();
        config.setDocumentId(UUID.randomUUID());

        assertThrows(IllegalArgumentException.class, () -> configurationService.save(config));
    }

    @Test
    void save_delegatesToValidator() {
        String schemaIdStr = UUID.randomUUID().toString();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .flavor(Flavor.AZURE).sections(List.of()).build();
        schema.setId(schemaIdStr);
        Map<String, Object> materialized = singleSectionMaterialized("functions");

        when(schemaService.findById(schemaIdStr)).thenReturn(Optional.of(schema));
        when(materializer.materialize(schema)).thenReturn(materialized);
        when(configurationLockRepository.findByDocumentId(any())).thenReturn(Optional.empty());
        when(configurationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Map<String, Map<String, Object>>> data = new HashMap<>();
        Map<String, Map<String, Object>> section = new HashMap<>();
        section.put("f1", new HashMap<>(Map.of("baseUrl", "https://x.com")));
        data.put("functions", section);

        Configuration config = Configuration.builder()
                .schemaId(schemaIdStr)
                .data(data)
                .build();
        config.setDocumentId(UUID.randomUUID());

        configurationService.save(config);

        verify(validator).validateConfigurationData(eq(data), eq(materialized));
    }

    @Test
    void save_encryptsItemLevelSecrets() {
        String schemaIdStr = UUID.randomUUID().toString();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .flavor(Flavor.AZURE).sections(List.of()).build();
        schema.setId(schemaIdStr);
        Map<String, Object> materialized = singleSectionMaterialized("functions");

        when(schemaService.findById(schemaIdStr)).thenReturn(Optional.of(schema));
        when(materializer.materialize(schema)).thenReturn(materialized);
        when(configurationLockRepository.findByDocumentId(any())).thenReturn(Optional.empty());
        when(encryptionService.encrypt("plainSecret")).thenReturn("gcm.v1:encrypted");
        when(configurationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Map<String, Map<String, Object>>> data = new HashMap<>();
        Map<String, Map<String, Object>> section = new HashMap<>();
        section.put("f1", new HashMap<>(Map.of("apiKey", "plainSecret", "baseUrl", "https://x.com")));
        data.put("functions", section);

        Configuration config = Configuration.builder()
                .schemaId(schemaIdStr)
                .data(data)
                .build();
        config.setDocumentId(UUID.randomUUID());

        Configuration result = configurationService.save(config);

        Map<String, Object> item = result.getData().get("functions").get("f1");
        assertEquals("gcm.v1:encrypted", item.get("apiKey"));
        assertEquals("https://x.com", item.get("baseUrl"));
        verify(encryptionService, times(1)).encrypt("plainSecret");
    }

    @Test
    void save_preservesMaskedSecretsRoundTrip() {
        String schemaIdStr = UUID.randomUUID().toString();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .flavor(Flavor.AZURE).sections(List.of()).build();
        schema.setId(schemaIdStr);
        Map<String, Object> materialized = singleSectionMaterialized("functions");

        Map<String, Map<String, Map<String, Object>>> existingData = new HashMap<>();
        existingData.put("functions", new HashMap<>(Map.of(
                "f1", new HashMap<>(Map.of("apiKey", "gcm.v1:original")))));
        Configuration existing = Configuration.builder().name("Test").data(existingData).build();
        existing.setId("existing-id");

        Map<String, Map<String, Map<String, Object>>> incomingData = new HashMap<>();
        incomingData.put("functions", new HashMap<>(Map.of(
                "f1", new HashMap<>(Map.of("apiKey", "***nal")))));
        Configuration incoming = Configuration.builder().name("Test")
                .schemaId(schemaIdStr).data(incomingData).build();
        incoming.setId("existing-id");

        when(schemaService.findById(schemaIdStr)).thenReturn(Optional.of(schema));
        when(materializer.materialize(schema)).thenReturn(materialized);
        when(configurationLockRepository.findByDocumentId(any())).thenReturn(Optional.empty());
        when(configurationRepository.findById("existing-id")).thenReturn(Optional.of(existing));
        when(configurationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Configuration result = configurationService.save(incoming);

        assertEquals("gcm.v1:original", result.getData().get("functions").get("f1").get("apiKey"));
        verify(encryptionService, never()).encrypt(any());
    }

    @Test
    void maskSecretFields_masksItemLevelSecrets() {
        String schemaIdStr = UUID.randomUUID().toString();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .flavor(Flavor.AZURE).sections(List.of()).build();
        schema.setId(schemaIdStr);
        Map<String, Object> materialized = singleSectionMaterialized("functions");

        when(schemaService.findById(schemaIdStr)).thenReturn(Optional.of(schema));
        when(materializer.materialize(schema)).thenReturn(materialized);

        Map<String, Map<String, Map<String, Object>>> data = new HashMap<>();
        data.put("functions", new HashMap<>(Map.of(
                "f1", new HashMap<>(Map.of("apiKey", "gcm.v1:encryptedValue123", "baseUrl", "app")))));
        Configuration config = Configuration.builder().name("Test")
                .schemaId(schemaIdStr).data(data).build();

        configurationService.maskSecretFields(config);

        Map<String, Object> item = config.getData().get("functions").get("f1");
        assertEquals("***123", item.get("apiKey"));
        assertEquals("app", item.get("baseUrl"));
    }

    @Test
    void testDeleteThrowsWhenLocked() {
        UUID docId = UUID.randomUUID();
        Configuration config = Configuration.builder().id("1").build();
        config.setDocumentId(docId);
        ConfigurationLock lock = ConfigurationLock.builder().documentId(docId).locked(true).build();
        when(configurationRepository.findById("1")).thenReturn(Optional.of(config));
        when(configurationLockRepository.findByDocumentId(docId)).thenReturn(Optional.of(lock));

        assertThrows(ConfigurationLockedException.class, () -> configurationService.delete("1"));
        verify(configurationRepository, never()).deleteById(any());
    }

    @Test
    void testLockConfigurationCreatesLockAndAuditLog() {
        UUID docId = UUID.randomUUID();
        Configuration config = Configuration.builder().id("1").build();
        config.setDocumentId(docId);
        when(configurationRepository.findAllByDocumentId(docId)).thenReturn(List.of(config));
        when(configurationLockRepository.findByDocumentId(docId)).thenReturn(Optional.empty());
        when(configurationLockRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        configurationService.lockConfiguration(docId, true, "admin@test.com");

        ArgumentCaptor<ConfigurationLock> lockCaptor = ArgumentCaptor.forClass(ConfigurationLock.class);
        verify(configurationLockRepository).save(lockCaptor.capture());
        assertTrue(lockCaptor.getValue().isLocked());
        assertEquals("admin@test.com", lockCaptor.getValue().getLockedBy());

        ArgumentCaptor<AuditLog> auditCaptor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(auditCaptor.capture());
        assertEquals(AuditLogEntityOperation.LOCK, auditCaptor.getValue().getOperation());
        assertEquals("admin@test.com", auditCaptor.getValue().getUserLogin());
    }

    @Test
    void testUnlockConfigurationSetsLockedFalse() {
        UUID docId = UUID.randomUUID();
        Configuration config = Configuration.builder().id("1").build();
        config.setDocumentId(docId);
        ConfigurationLock existing = ConfigurationLock.builder().documentId(docId).locked(true).lockedBy("admin").build();
        when(configurationRepository.findAllByDocumentId(docId)).thenReturn(List.of(config));
        when(configurationLockRepository.findByDocumentId(docId)).thenReturn(Optional.of(existing));
        when(configurationLockRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        configurationService.lockConfiguration(docId, false, "admin@test.com");

        ArgumentCaptor<ConfigurationLock> lockCaptor = ArgumentCaptor.forClass(ConfigurationLock.class);
        verify(configurationLockRepository).save(lockCaptor.capture());
        assertFalse(lockCaptor.getValue().isLocked());

        ArgumentCaptor<AuditLog> auditCaptor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(auditCaptor.capture());
        assertEquals(AuditLogEntityOperation.UNLOCK, auditCaptor.getValue().getOperation());
    }

    @Test
    void testLockConfigurationThrowsWhenDocumentNotFound() {
        UUID docId = UUID.randomUUID();
        when(configurationRepository.findAllByDocumentId(docId)).thenReturn(List.of());

        assertThrows(ResponseStatusException.class,
                () -> configurationService.lockConfiguration(docId, true, "admin@test.com"));
    }

    @Test
    void testDelete() {
        UUID docId = UUID.randomUUID();
        Configuration config = new Configuration();
        config.setId("1");
        config.setDocumentId(docId);
        when(configurationRepository.findById("1")).thenReturn(Optional.of(config));
        when(configurationLockRepository.findByDocumentId(docId)).thenReturn(Optional.empty());

        configurationService.delete("1");

        verify(configurationRepository).deleteById("1");
    }

    @Test
    void testFindAllVersions() {
        UUID docId = UUID.randomUUID();
        Configuration c1 = new Configuration();
        c1.setDocumentId(docId);
        c1.setVersion(1);
        Configuration c2 = new Configuration();
        c2.setDocumentId(docId);
        c2.setVersion(2);
        when(configurationRepository.findAllByDocumentId(docId)).thenReturn(Arrays.asList(c1, c2));
        when(configurationLockRepository.findByDocumentId(docId)).thenReturn(Optional.empty());

        List<Configuration> result = configurationService.findAllVersions(docId);

        assertEquals(2, result.size());
    }

    @Test
    void testSearch() {
        UUID docId = UUID.randomUUID();
        Configuration c1v1 = new Configuration();
        c1v1.setId("1");
        c1v1.setDocumentId(docId);
        c1v1.setVersion(1);
        c1v1.setName("Test Config");

        Configuration c1v2 = new Configuration();
        c1v2.setId("2");
        c1v2.setDocumentId(docId);
        c1v2.setVersion(2);
        c1v2.setName("Test Config Updated");

        when(configurationRepository.findAllByNameContainingIgnoreCase("Test")).thenReturn(Arrays.asList(c1v1, c1v2));
        when(configurationLockRepository.findAllByDocumentIdIn(any())).thenReturn(List.of());

        List<Configuration> result = configurationService.search("Test");

        assertEquals(1, result.size());
        assertEquals("2", result.get(0).getId());
    }

    @Test
    void testClone() {
        UUID sourceDocId = UUID.randomUUID();
        Configuration source = new Configuration();
        source.setId("source-id");
        source.setDocumentId(sourceDocId);
        source.setVersion(5);
        source.setName("Source Config");
        source.setEnvironmentId("env-123");
        source.setFlavor(Flavor.AZURE);
        Map<String, Map<String, Map<String, Object>>> data = new HashMap<>();
        data.put("section", new HashMap<>(Map.of("item", new HashMap<>(Map.of("k", "v")))));
        source.setData(data);
        source.setSchemaId(UUID.randomUUID().toString());

        when(configurationRepository.findById("source-id")).thenReturn(Optional.of(source));
        when(configurationRepository.save(any(Configuration.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Configuration cloned = configurationService.clone("source-id", "New Name");

        assertNotNull(cloned);
        assertEquals("New Name", cloned.getName());
        assertNull(cloned.getId());
        assertNull(cloned.getDocumentId());
        assertNull(cloned.getVersion());
        assertEquals(Flavor.AZURE, cloned.getFlavor());
    }

    @Test
    void save_emitsItemAddAndItemDeleteAudits() {
        String schemaIdStr = UUID.randomUUID().toString();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .flavor(Flavor.AZURE).sections(List.of()).build();
        schema.setId(schemaIdStr);
        Map<String, Object> materialized = singleSectionMaterialized("functions");

        // existing has {f1} in section "functions"
        Map<String, Map<String, Map<String, Object>>> existingData = new HashMap<>();
        existingData.put("functions", new HashMap<>(Map.of(
                "f1", new HashMap<>(Map.of("baseUrl", "https://old.com")))));
        Configuration existing = Configuration.builder().name("Test").data(existingData).build();
        existing.setId("c1");
        existing.setDocumentId(UUID.randomUUID());

        // incoming has {f2} in section "functions" (replaces f1)
        Map<String, Map<String, Map<String, Object>>> incomingData = new HashMap<>();
        incomingData.put("functions", new HashMap<>(Map.of(
                "f2", new HashMap<>(Map.of("baseUrl", "https://new.com")))));
        Configuration incoming = Configuration.builder().name("Test")
                .schemaId(schemaIdStr).data(incomingData).build();
        incoming.setId("c1");
        incoming.setDocumentId(existing.getDocumentId());

        when(schemaService.findById(schemaIdStr)).thenReturn(Optional.of(schema));
        when(materializer.materialize(schema)).thenReturn(materialized);
        when(configurationLockRepository.findByDocumentId(any())).thenReturn(Optional.empty());
        when(configurationRepository.findById("c1")).thenReturn(Optional.of(existing));
        when(configurationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        configurationService.save(incoming);

        ArgumentCaptor<AuditLog> audits = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository, times(2)).save(audits.capture());

        List<AuditLog> all = audits.getAllValues();
        assertTrue(all.stream().anyMatch(a -> a.getOperation() == AuditLogEntityOperation.ITEM_ADD
                && "f2".equals(((Map<?, ?>) a.getData()).get("itemName"))));
        assertTrue(all.stream().anyMatch(a -> a.getOperation() == AuditLogEntityOperation.ITEM_DELETE
                && "f1".equals(((Map<?, ?>) a.getData()).get("itemName"))));
    }
}
