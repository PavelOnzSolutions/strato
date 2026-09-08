package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.provisioner.domain.enums.Flavor;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.SectionItemFieldType;
import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;
import solutions.onz.platform.strato.creator.provisioner.domain.SchemaSection;
import solutions.onz.platform.strato.creator.provisioner.domain.SectionCatalogEntry;
import solutions.onz.platform.strato.creator.provisioner.domain.SectionItemField;
import solutions.onz.platform.strato.creator.provisioner.repositories.ConfigurationSchemaRepository;
import solutions.onz.platform.strato.creator.provisioner.repositories.SectionCatalogEntryRepository;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationSchemaService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConfigurationSchemaServiceTest {

    @Mock ConfigurationSchemaRepository schemaRepo;
    @Mock SectionCatalogEntryRepository catalogRepo;
    @InjectMocks
    ConfigurationSchemaService service;

    private SectionCatalogEntry catalogEntry(UUID docId, Flavor flavor, String sectionKey, List<SectionItemField> fields) {
        SectionCatalogEntry e = SectionCatalogEntry.builder()
                .flavor(flavor).sectionKey(sectionKey).itemFields(fields).build();
        e.setDocumentId(docId);
        return e;
    }

    @Test
    void save_rejectsDuplicateSection() {
        UUID catDocId = UUID.randomUUID();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .name("s").flavor(Flavor.AZURE)
                .sections(List.of(
                        SchemaSection.builder().catalogEntryDocumentId(catDocId).build(),
                        SchemaSection.builder().catalogEntryDocumentId(catDocId).build()))
                .build();
        // The first section's catalog lookup happens before the duplicate check fires;
        // wire it up just in case the implementation iterates sections in order.
        lenient().when(catalogRepo.findTopByDocumentIdOrderByVersionDesc(catDocId))
                .thenReturn(Optional.of(catalogEntry(catDocId, Flavor.AZURE, "functions", List.of())));
        assertThrows(IllegalArgumentException.class, () -> service.save(schema));
    }

    @Test
    void save_rejectsFlavorMismatch() {
        UUID catDocId = UUID.randomUUID();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .name("s").flavor(Flavor.AZURE)
                .sections(List.of(SchemaSection.builder().catalogEntryDocumentId(catDocId).build()))
                .build();
        when(catalogRepo.findTopByDocumentIdOrderByVersionDesc(catDocId))
                .thenReturn(Optional.of(catalogEntry(catDocId, Flavor.AWS, "aws-fn", List.of())));
        assertThrows(IllegalArgumentException.class, () -> service.save(schema));
    }

    @Test
    void save_rejectsCustomFieldNameCollidesWithBuiltin() {
        UUID catDocId = UUID.randomUUID();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .name("s").flavor(Flavor.AZURE)
                .sections(List.of(SchemaSection.builder()
                        .catalogEntryDocumentId(catDocId)
                        .customFields(List.of(SectionItemField.builder().name("nodeVersion").type(SectionItemFieldType.STRING).build()))
                        .build()))
                .build();
        when(catalogRepo.findTopByDocumentIdOrderByVersionDesc(catDocId))
                .thenReturn(Optional.of(catalogEntry(catDocId, Flavor.AZURE, "functions",
                        List.of(SectionItemField.builder().name("nodeVersion").type(SectionItemFieldType.STRING).build()))));
        assertThrows(IllegalArgumentException.class, () -> service.save(schema));
    }

    @Test
    void save_rejectsOverlayTouchingCatalogSecret() {
        UUID catDocId = UUID.randomUUID();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .name("s").flavor(Flavor.AZURE)
                .sections(List.of(SchemaSection.builder()
                        .catalogEntryDocumentId(catDocId)
                        .disabledFieldPaths(Set.of("apiKey"))
                        .customFields(List.of())
                        .build()))
                .build();
        when(catalogRepo.findTopByDocumentIdOrderByVersionDesc(catDocId))
                .thenReturn(Optional.of(catalogEntry(catDocId, Flavor.AZURE, "functions",
                        List.of(SectionItemField.builder().name("apiKey").type(SectionItemFieldType.STRING).secret(true).build()))));
        assertThrows(IllegalArgumentException.class, () -> service.save(schema));
    }

    @Test
    void save_happyPath() {
        UUID catDocId = UUID.randomUUID();
        ConfigurationSchema schema = ConfigurationSchema.builder()
                .name("s").flavor(Flavor.AZURE)
                .sections(List.of(SchemaSection.builder()
                        .catalogEntryDocumentId(catDocId)
                        .disabledFieldPaths(Set.of()).fieldDefaults(Map.of())
                        .customFields(List.of()).build()))
                .build();
        when(catalogRepo.findTopByDocumentIdOrderByVersionDesc(catDocId))
                .thenReturn(Optional.of(catalogEntry(catDocId, Flavor.AZURE, "functions", List.of())));
        when(schemaRepo.save(schema)).thenReturn(schema);
        assertNotNull(service.save(schema));
    }
}
