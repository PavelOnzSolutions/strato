package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.provisioner.domain.enums.Flavor;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.SectionItemFieldType;
import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;
import solutions.onz.platform.strato.creator.provisioner.domain.SchemaSection;
import solutions.onz.platform.strato.creator.provisioner.domain.SectionCatalogEntry;
import solutions.onz.platform.strato.creator.provisioner.domain.SectionItemField;
import solutions.onz.platform.strato.creator.provisioner.repositories.SectionCatalogEntryRepository;
import solutions.onz.platform.strato.creator.provisioner.services.EffectiveSchemaMaterializer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EffectiveSchemaMaterializerTest {

    @Mock SectionCatalogEntryRepository catalogRepo;
    @InjectMocks
    EffectiveSchemaMaterializer materializer;

    private UUID catDocId;
    private SectionCatalogEntry catalogEntry;

    @BeforeEach
    void setup() {
        catDocId = UUID.randomUUID();
        catalogEntry = SectionCatalogEntry.builder()
                .flavor(Flavor.AZURE).sectionKey("functions")
                .system(true)
                .itemFields(List.of(
                        SectionItemField.builder().name("nodeVersion").displayName("Node Version")
                                .type(SectionItemFieldType.STRING).defaultValue("").build(),
                        SectionItemField.builder().name("secretKey").displayName("Secret Key")
                                .type(SectionItemFieldType.STRING).secret(true).defaultValue("").build()))
                .build();
        catalogEntry.setDocumentId(catDocId);
        when(catalogRepo.findTopByDocumentIdOrderByVersionDesc(catDocId))
                .thenReturn(Optional.of(catalogEntry));
    }

    @Test
    void materialize_buildsJsonSchemaWithSectionsAsAdditionalProperties() {
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .name("test").flavor(Flavor.AZURE)
                .sections(List.of(SchemaSection.builder()
                        .catalogEntryDocumentId(catDocId)
                        .disabledFieldPaths(Set.of()).fieldDefaults(Map.of())
                        .customFields(List.of()).build()))
                .build();

        Map<String, Object> out = materializer.materialize(schema);
        assertEquals("object", out.get("type"));
        Map<String, Object> properties = (Map<String, Object>) out.get("properties");
        Map<String, Object> functions = (Map<String, Object>) properties.get("functions");
        assertEquals("object", functions.get("type"));
        Map<String, Object> itemSchema = (Map<String, Object>) functions.get("additionalProperties");
        Map<String, Object> itemProps = (Map<String, Object>) itemSchema.get("properties");
        assertTrue(itemProps.containsKey("nodeVersion"));
        assertTrue(itemProps.containsKey("secretKey"));
    }

    @Test
    void materialize_marksSecretFieldsWithExtension() {
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .name("test").flavor(Flavor.AZURE)
                .sections(List.of(SchemaSection.builder()
                        .catalogEntryDocumentId(catDocId)
                        .disabledFieldPaths(Set.of()).fieldDefaults(Map.of())
                        .customFields(List.of()).build()))
                .build();
        Map<String, Object> out = materializer.materialize(schema);
        Map<String, Object> functions = (Map<String, Object>) ((Map<String, Object>) out.get("properties")).get("functions");
        Map<String, Object> itemSchema = (Map<String, Object>) functions.get("additionalProperties");
        Map<String, Object> secretKey = (Map<String, Object>) ((Map<String, Object>) itemSchema.get("properties")).get("secretKey");
        assertEquals(Boolean.TRUE, secretKey.get("x-strato-secret"));
    }

    @Test
    void materialize_removesDisabledFieldPaths() {
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .name("test").flavor(Flavor.AZURE)
                .sections(List.of(SchemaSection.builder()
                        .catalogEntryDocumentId(catDocId)
                        .disabledFieldPaths(Set.of("nodeVersion"))
                        .fieldDefaults(Map.of()).customFields(List.of()).build()))
                .build();
        Map<String, Object> out = materializer.materialize(schema);
        Map<String, Object> functions = (Map<String, Object>) ((Map<String, Object>) out.get("properties")).get("functions");
        Map<String, Object> itemSchema = (Map<String, Object>) functions.get("additionalProperties");
        assertFalse(((Map<String, Object>) itemSchema.get("properties")).containsKey("nodeVersion"));
    }

    @Test
    void materialize_appliesFieldDefaults() {
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .name("test").flavor(Flavor.AZURE)
                .sections(List.of(SchemaSection.builder()
                        .catalogEntryDocumentId(catDocId)
                        .disabledFieldPaths(Set.of())
                        .fieldDefaults(Map.of("nodeVersion", "20.x"))
                        .customFields(List.of()).build()))
                .build();
        Map<String, Object> out = materializer.materialize(schema);
        Map<String, Object> functions = (Map<String, Object>) ((Map<String, Object>) out.get("properties")).get("functions");
        Map<String, Object> itemSchema = (Map<String, Object>) functions.get("additionalProperties");
        Map<String, Object> nodeVersion = (Map<String, Object>) ((Map<String, Object>) itemSchema.get("properties")).get("nodeVersion");
        assertEquals("20.x", nodeVersion.get("default"));
    }

    @Test
    void materialize_appendsCustomFields() {
        SectionItemField custom = SectionItemField.builder().name("region").displayName("Region")
                .type(SectionItemFieldType.STRING).defaultValue("eastus").build();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .name("test").flavor(Flavor.AZURE)
                .sections(List.of(SchemaSection.builder()
                        .catalogEntryDocumentId(catDocId)
                        .disabledFieldPaths(Set.of())
                        .fieldDefaults(Map.of())
                        .customFields(List.of(custom)).build()))
                .build();
        Map<String, Object> out = materializer.materialize(schema);
        Map<String, Object> functions = (Map<String, Object>) ((Map<String, Object>) out.get("properties")).get("functions");
        Map<String, Object> itemSchema = (Map<String, Object>) functions.get("additionalProperties");
        assertTrue(((Map<String, Object>) itemSchema.get("properties")).containsKey("region"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void materialize_mapOfString_emitsObjectWithStringAdditionalProperties() {
        SectionItemField mapField = SectionItemField.builder()
                .name("properties").displayName("Properties")
                .type(SectionItemFieldType.MAP_OF_STRING).build();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .name("test").flavor(Flavor.AZURE)
                .sections(List.of(SchemaSection.builder()
                        .catalogEntryDocumentId(catDocId)
                        .disabledFieldPaths(Set.of()).fieldDefaults(Map.of())
                        .customFields(List.of(mapField)).build()))
                .build();

        Map<String, Object> out = materializer.materialize(schema);
        Map<String, Object> functions = (Map<String, Object>) ((Map<String, Object>) out.get("properties")).get("functions");
        Map<String, Object> itemSchema = (Map<String, Object>) functions.get("additionalProperties");
        Map<String, Object> props = (Map<String, Object>) itemSchema.get("properties");
        Map<String, Object> mapNode = (Map<String, Object>) props.get("properties");
        assertEquals("object", mapNode.get("type"));
        Map<String, Object> ap = (Map<String, Object>) mapNode.get("additionalProperties");
        assertEquals("string", ap.get("type"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void materialize_mapOfObject_emitsObjectWithObjectAdditionalProperties() {
        SectionItemField mapField = SectionItemField.builder()
                .name("routes").displayName("Routes")
                .type(SectionItemFieldType.MAP_OF_OBJECT)
                .nestedFields(List.of(
                        SectionItemField.builder().name("target").displayName("Target")
                                .type(SectionItemFieldType.STRING).build()))
                .build();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .name("test").flavor(Flavor.AZURE)
                .sections(List.of(SchemaSection.builder()
                        .catalogEntryDocumentId(catDocId)
                        .disabledFieldPaths(Set.of()).fieldDefaults(Map.of())
                        .customFields(List.of(mapField)).build()))
                .build();

        Map<String, Object> out = materializer.materialize(schema);
        Map<String, Object> functions = (Map<String, Object>) ((Map<String, Object>) out.get("properties")).get("functions");
        Map<String, Object> itemSchema = (Map<String, Object>) functions.get("additionalProperties");
        Map<String, Object> props = (Map<String, Object>) itemSchema.get("properties");
        Map<String, Object> mapNode = (Map<String, Object>) props.get("routes");
        assertEquals("object", mapNode.get("type"));
        Map<String, Object> ap = (Map<String, Object>) mapNode.get("additionalProperties");
        assertEquals("object", ap.get("type"));
        Map<String, Object> apProps = (Map<String, Object>) ap.get("properties");
        assertTrue(apProps.containsKey("target"));
    }
}
