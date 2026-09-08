package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.forge.services.EnvironmentsService;
import solutions.onz.platform.strato.creator.provisioner.domain.ConfigProviderOutput;
import solutions.onz.platform.strato.creator.provisioner.domain.Configuration;
import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;
import solutions.onz.platform.strato.creator.forge.domain.Environment;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentConfig;
import solutions.onz.platform.strato.creator.provisioner.domain.SchemaSection;
import solutions.onz.platform.strato.creator.provisioner.domain.SectionCatalogEntry;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.Flavor;
import solutions.onz.platform.strato.creator.provisioner.repositories.SectionCatalogEntryRepository;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationProviderService;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationSchemaService;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationService;
import solutions.onz.platform.strato.creator.provisioner.services.EffectiveSchemaMaterializer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConfigurationProviderServiceTest {

    @Mock
    private ConfigurationService configurationService;

    @Mock
    private EnvironmentsService environmentsService;

    @Mock
    private ConfigurationSchemaService schemaService;

    @Mock
    private EncryptionService encryptionService;

    @Mock
    private EffectiveSchemaMaterializer materializer;

    @Mock
    private SectionCatalogEntryRepository catalogRepository;

    @InjectMocks
    private ConfigurationProviderService service;

    @BeforeEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clearAuthAfter() {
        SecurityContextHolder.clearContext();
    }

    private void authAs(String... permissions) {
        List<GrantedAuthority> auths = new ArrayList<>();
        for (String p : permissions) {
            auths.add(new SimpleGrantedAuthority(p));
        }
        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken("u", "p", auths);
        SecurityContextImpl ctx = new SecurityContextImpl(token);
        SecurityContextHolder.setContext(ctx);
    }

    // --- Helpers -----------------------------------------------------------

    /** Build a minimal Configuration with one section "functions" containing one item "bw-contracts". */
    private Configuration newConfig(String name, String schemaId, Map<String, Object> itemData) {
        Map<String, Map<String, Object>> items = new LinkedHashMap<>();
        items.put("bw-contracts", new LinkedHashMap<>(itemData));
        Map<String, Map<String, Map<String, Object>>> data = new LinkedHashMap<>();
        data.put("functions", items);

        Configuration config = Configuration.builder()
                .name(name)
                .schemaId(schemaId)
                .data(data)
                .build();
        config.setVersion(1);
        return config;
    }

    /** Build the materialized JSON-schema map shape: {properties: {functions: {type:object, additionalProperties: {...}}}}. */
    private Map<String, Object> newMaterialized(boolean withSecret) {
        Map<String, Object> nodeVersion = new LinkedHashMap<>();
        nodeVersion.put("type", "string");

        Map<String, Object> itemProps = new LinkedHashMap<>();
        itemProps.put("nodeVersion", nodeVersion);
        if (withSecret) {
            Map<String, Object> apiKey = new LinkedHashMap<>();
            apiKey.put("type", "secret");
            apiKey.put("x-strato-secret", true);
            itemProps.put("apiKey", apiKey);
        }

        Map<String, Object> itemSchema = new LinkedHashMap<>();
        itemSchema.put("type", "object");
        itemSchema.put("properties", itemProps);

        Map<String, Object> sectionWrap = new LinkedHashMap<>();
        sectionWrap.put("type", "object");
        sectionWrap.put("additionalProperties", itemSchema);

        Map<String, Object> sectionProps = new LinkedHashMap<>();
        sectionProps.put("functions", sectionWrap);

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("type", "object");
        root.put("properties", sectionProps);
        return root;
    }

    /** Build a schema with one section that maps to a catalog entry. */
    private ConfigurationSchema newSchema(UUID catalogEntryDocumentId) {
        ConfigurationSchema schema = new ConfigurationSchema();
        schema.setFlavor(Flavor.AZURE);
        SchemaSection section = SchemaSection.builder()
                .catalogEntryDocumentId(catalogEntryDocumentId)
                .build();
        List<SchemaSection> sections = new ArrayList<>();
        sections.add(section);
        schema.setSections(sections);
        return schema;
    }

    private SectionCatalogEntry newCatalog(String sectionKey, String requiredReadPermission) {
        SectionCatalogEntry cat = SectionCatalogEntry.builder()
                .sectionKey(sectionKey)
                .requiredReadPermission(requiredReadPermission)
                .build();
        cat.setDocumentId(UUID.randomUUID());
        return cat;
    }

    // --- Tests -------------------------------------------------------------

    /**
     * Output data shape is { sectionKey -> { itemName -> itemData }, _environment? }.
     */
    @Test
    void output_dataShape_isSectionItem() {
        authAs("PERM_CONFIG_PROVIDER_READ");
        String schemaId = UUID.randomUUID().toString();
        UUID catalogDocId = UUID.randomUUID();

        Map<String, Object> itemData = new LinkedHashMap<>();
        itemData.put("nodeVersion", "20");

        Configuration config = newConfig("my-config", schemaId, itemData);

        ConfigurationSchema schema = newSchema(catalogDocId);
        SectionCatalogEntry catalog = newCatalog("functions", null);
        catalog.setDocumentId(catalogDocId);
        // Align the schema's section catalogEntryDocumentId with the catalog we return
        schema.getSections().get(0).setCatalogEntryDocumentId(catalogDocId);

        when(configurationService.findLatestByName("my-config")).thenReturn(Optional.of(config));
        when(schemaService.findById(schemaId)).thenReturn(Optional.of(schema));
        when(materializer.materialize(schema)).thenReturn(newMaterialized(false));
        when(catalogRepository.findTopByDocumentIdOrderByVersionDesc(catalogDocId)).thenReturn(Optional.of(catalog));

        ConfigProviderOutput out = service.getConfigForPipeline("my-config", null);

        assertNotNull(out);
        assertEquals("my-config", out.getConfigurationName());

        Map<String, Object> data = out.getData();
        assertTrue(data.containsKey("functions"), "expected section key 'functions' in output data");

        @SuppressWarnings("unchecked")
        Map<String, Object> functions = (Map<String, Object>) data.get("functions");
        assertTrue(functions.containsKey("bw-contracts"), "expected item key 'bw-contracts'");

        @SuppressWarnings("unchecked")
        Map<String, Object> item = (Map<String, Object>) functions.get("bw-contracts");
        assertEquals("20", item.get("nodeVersion"));

        // No environment was provided
        assertFalse(data.containsKey("_environment"));
    }

    /**
     * Sections whose catalog has a requiredReadPermission the caller lacks are omitted.
     */
    @Test
    void rbac_filtersOutSection_whenCallerLacksPermission() {
        authAs("PERM_CONFIG_PROVIDER_READ"); // does NOT have PERM_FUNCTIONS_READ
        String schemaId = UUID.randomUUID().toString();
        UUID catalogDocId = UUID.randomUUID();

        Map<String, Object> itemData = new LinkedHashMap<>();
        itemData.put("nodeVersion", "20");

        Configuration config = newConfig("my-config", schemaId, itemData);

        ConfigurationSchema schema = newSchema(catalogDocId);
        schema.getSections().get(0).setCatalogEntryDocumentId(catalogDocId);
        SectionCatalogEntry catalog = newCatalog("functions", "PERM_FUNCTIONS_READ");
        catalog.setDocumentId(catalogDocId);

        when(configurationService.findLatestByName("my-config")).thenReturn(Optional.of(config));
        when(schemaService.findById(schemaId)).thenReturn(Optional.of(schema));
        when(materializer.materialize(schema)).thenReturn(newMaterialized(false));
        when(catalogRepository.findTopByDocumentIdOrderByVersionDesc(catalogDocId)).thenReturn(Optional.of(catalog));

        ConfigProviderOutput out = service.getConfigForPipeline("my-config", null);

        assertNotNull(out);
        assertFalse(out.getData().containsKey("functions"),
                "section 'functions' should be filtered out due to missing PERM_FUNCTIONS_READ");
    }

    /**
     * Sections with required read permission ARE included when the caller has it.
     */
    @Test
    void rbac_includesSection_whenCallerHasPermission() {
        authAs("PERM_FUNCTIONS_READ");
        String schemaId = UUID.randomUUID().toString();
        UUID catalogDocId = UUID.randomUUID();

        Map<String, Object> itemData = new LinkedHashMap<>();
        itemData.put("nodeVersion", "20");

        Configuration config = newConfig("my-config", schemaId, itemData);

        ConfigurationSchema schema = newSchema(catalogDocId);
        schema.getSections().get(0).setCatalogEntryDocumentId(catalogDocId);
        SectionCatalogEntry catalog = newCatalog("functions", "PERM_FUNCTIONS_READ");
        catalog.setDocumentId(catalogDocId);

        when(configurationService.findLatestByName("my-config")).thenReturn(Optional.of(config));
        when(schemaService.findById(schemaId)).thenReturn(Optional.of(schema));
        when(materializer.materialize(schema)).thenReturn(newMaterialized(false));
        when(catalogRepository.findTopByDocumentIdOrderByVersionDesc(catalogDocId)).thenReturn(Optional.of(catalog));

        ConfigProviderOutput out = service.getConfigForPipeline("my-config", null);

        assertTrue(out.getData().containsKey("functions"));
    }

    /**
     * Item-level secrets are decrypted in the output.
     */
    @Test
    void secrets_areDecryptedPerItem() {
        authAs("PERM_CONFIG_PROVIDER_READ");
        String schemaId = UUID.randomUUID().toString();
        UUID catalogDocId = UUID.randomUUID();

        Map<String, Object> itemData = new LinkedHashMap<>();
        itemData.put("nodeVersion", "20");
        itemData.put("apiKey", "gcm.v1:encrypted-blob");

        Configuration config = newConfig("my-config", schemaId, itemData);

        ConfigurationSchema schema = newSchema(catalogDocId);
        schema.getSections().get(0).setCatalogEntryDocumentId(catalogDocId);
        SectionCatalogEntry catalog = newCatalog("functions", null);
        catalog.setDocumentId(catalogDocId);

        when(configurationService.findLatestByName("my-config")).thenReturn(Optional.of(config));
        when(schemaService.findById(schemaId)).thenReturn(Optional.of(schema));
        when(materializer.materialize(schema)).thenReturn(newMaterialized(true)); // includes "apiKey":"secret"
        when(catalogRepository.findTopByDocumentIdOrderByVersionDesc(catalogDocId)).thenReturn(Optional.of(catalog));
        when(encryptionService.decrypt("gcm.v1:encrypted-blob")).thenReturn("plain-secret");

        ConfigProviderOutput out = service.getConfigForPipeline("my-config", null);

        @SuppressWarnings("unchecked")
        Map<String, Object> functions = (Map<String, Object>) out.getData().get("functions");
        @SuppressWarnings("unchecked")
        Map<String, Object> item = (Map<String, Object>) functions.get("bw-contracts");

        assertEquals("plain-secret", item.get("apiKey"));
        assertEquals("20", item.get("nodeVersion"));
    }

    /**
     * JSONPath query on the new shape returns the expected value.
     */
    @Test
    void queryResult_jsonPathOnNewShape() {
        authAs("PERM_CONFIG_PROVIDER_READ");
        String schemaId = UUID.randomUUID().toString();
        UUID catalogDocId = UUID.randomUUID();

        Map<String, Object> itemData = new LinkedHashMap<>();
        itemData.put("nodeVersion", "20");

        Configuration config = newConfig("my-config", schemaId, itemData);

        ConfigurationSchema schema = newSchema(catalogDocId);
        schema.getSections().get(0).setCatalogEntryDocumentId(catalogDocId);
        SectionCatalogEntry catalog = newCatalog("functions", null);
        catalog.setDocumentId(catalogDocId);

        when(configurationService.findLatestByName("my-config")).thenReturn(Optional.of(config));
        when(schemaService.findById(schemaId)).thenReturn(Optional.of(schema));
        when(materializer.materialize(schema)).thenReturn(newMaterialized(false));
        when(catalogRepository.findTopByDocumentIdOrderByVersionDesc(catalogDocId)).thenReturn(Optional.of(catalog));

        Object result = service.getQueryResult("my-config", "$.functions['bw-contracts'].nodeVersion");
        assertEquals("20", result);
    }

    /**
     * Variable substitution still works on string values throughout the data tree.
     */
    @Test
    void variableSubstitution_replacesNameAndEnvironment() {
        authAs("PERM_CONFIG_PROVIDER_READ");
        String schemaId = UUID.randomUUID().toString();
        UUID catalogDocId = UUID.randomUUID();

        Map<String, Object> itemData = new LinkedHashMap<>();
        itemData.put("nodeVersion", "https://{{name}}-{{environment}}.example.com");

        Configuration config = newConfig("my-config", schemaId, itemData);

        ConfigurationSchema schema = newSchema(catalogDocId);
        schema.getSections().get(0).setCatalogEntryDocumentId(catalogDocId);
        SectionCatalogEntry catalog = newCatalog("functions", null);
        catalog.setDocumentId(catalogDocId);

        when(configurationService.findLatestByName("my-config")).thenReturn(Optional.of(config));
        when(schemaService.findById(schemaId)).thenReturn(Optional.of(schema));
        when(materializer.materialize(schema)).thenReturn(newMaterialized(false));
        when(catalogRepository.findTopByDocumentIdOrderByVersionDesc(catalogDocId)).thenReturn(Optional.of(catalog));

        Object result = service.getQueryResult("my-config", "$.functions['bw-contracts'].nodeVersion");
        assertEquals("https://my-config-.example.com", result);
    }

    /**
     * When an Environment is supplied, the _environment metadata block is present and
     * the configuration name/env-name end up on the output.
     */
    @Test
    void environmentMetadata_addedWhenEnvProvided() {
        authAs("PERM_CONFIG_PROVIDER_READ");
        String schemaId = UUID.randomUUID().toString();
        UUID catalogDocId = UUID.randomUUID();

        Map<String, Object> itemData = new LinkedHashMap<>();
        itemData.put("nodeVersion", "20");

        Configuration config = newConfig("my-config", schemaId, itemData);

        ConfigurationSchema schema = newSchema(catalogDocId);
        schema.getSections().get(0).setCatalogEntryDocumentId(catalogDocId);
        SectionCatalogEntry catalog = newCatalog("functions", null);
        catalog.setDocumentId(catalogDocId);

        Environment env = Environment.builder()
                .id("env-1")
                .name("prod")
                .config(EnvironmentConfig.builder()
                        .subscriptionId("sub-1")
                        .region("westus")
                        .resourceGroup("rg-1")
                        .build())
                .build();

        when(configurationService.findLatestByName("my-config")).thenReturn(Optional.of(config));
        when(environmentsService.findLatestByName("prod")).thenReturn(Optional.of(env));
        when(schemaService.findById(schemaId)).thenReturn(Optional.of(schema));
        when(materializer.materialize(schema)).thenReturn(newMaterialized(false));
        when(catalogRepository.findTopByDocumentIdOrderByVersionDesc(catalogDocId)).thenReturn(Optional.of(catalog));

        ConfigProviderOutput out = service.getConfigForPipeline("my-config", "prod");

        assertEquals("prod", out.getEnvironmentName());
        @SuppressWarnings("unchecked")
        Map<String, Object> envMeta = (Map<String, Object>) out.getData().get("_environment");
        assertNotNull(envMeta);
        assertEquals("prod", envMeta.get("name"));
        assertEquals("sub-1", envMeta.get("subscriptionId"));
        assertEquals("westus", envMeta.get("region"));
        assertEquals("rg-1", envMeta.get("resourceGroup"));
    }

    /**
     * getConfigForPipelineById delegates to findByIdRaw.
     */
    @Test
    void byId_returnsOutput() {
        authAs("PERM_CONFIG_PROVIDER_READ");
        String configId = "c-1";
        String envId = "e-1";

        Configuration config = newConfig("cfg-by-id", null, Map.of("nodeVersion", "20"));
        config.setId(configId);

        Environment env = Environment.builder().id(envId).name("e1").build();

        when(configurationService.findByIdRaw(configId)).thenReturn(Optional.of(config));
        when(environmentsService.findById(envId)).thenReturn(Optional.of(env));

        ConfigProviderOutput out = service.getConfigForPipelineById(configId, envId);

        assertEquals("cfg-by-id", out.getConfigurationName());
        assertEquals("e1", out.getEnvironmentName());
        // schemaId is null in this config, so no schema fetch, no RBAC filter — section remains
        @SuppressWarnings("unchecked")
        Map<String, Object> functions = (Map<String, Object>) out.getData().get("functions");
        assertNotNull(functions);
    }
}
