package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.provisioner.domain.SectionCatalogEntry;
import solutions.onz.platform.strato.creator.provisioner.domain.SectionItemField;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.Flavor;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.SectionItemFieldType;
import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;
import solutions.onz.platform.strato.creator.provisioner.domain.SchemaSection;
import solutions.onz.platform.strato.creator.provisioner.repositories.ConfigurationSchemaRepository;
import solutions.onz.platform.strato.creator.provisioner.repositories.SectionCatalogEntryRepository;
import solutions.onz.platform.strato.creator.provisioner.services.SectionCatalogService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SectionCatalogServiceTest {

    @Mock SectionCatalogEntryRepository repo;
    @Mock ConfigurationSchemaRepository schemaRepo;
    @InjectMocks
    SectionCatalogService service;

    @Test
    void create_rejectsSystemTrueInPayload() {
        SectionCatalogEntry entry = SectionCatalogEntry.builder()
                .flavor(Flavor.AZURE).sectionKey("custom1").displayName("Custom").system(true).build();
        assertThrows(IllegalArgumentException.class, () -> service.create(entry));
    }

    @Test
    void update_rejectsWhenTargetIsSystem() {
        SectionCatalogEntry existing = SectionCatalogEntry.builder()
                .id("id1").flavor(Flavor.AZURE).sectionKey("functions").system(true).build();
        when(repo.findById("id1")).thenReturn(Optional.of(existing));
        SectionCatalogEntry update = SectionCatalogEntry.builder()
                .id("id1").flavor(Flavor.AZURE).sectionKey("functions").displayName("Hacked").build();
        assertThrows(IllegalArgumentException.class, () -> service.update("id1", update));
    }

    @Test
    void delete_rejectsWhenTargetIsSystem() {
        SectionCatalogEntry existing = SectionCatalogEntry.builder()
                .id("id1").flavor(Flavor.AZURE).sectionKey("functions").system(true).build();
        when(repo.findById("id1")).thenReturn(Optional.of(existing));
        assertThrows(IllegalArgumentException.class, () -> service.delete("id1"));
    }

    @Test
    void delete_rejectsWhenReferencedBySchema() {
        UUID docId = UUID.randomUUID();
        // Note: SectionCatalogEntry uses @Builder (not @SuperBuilder), so parent-class
        // field documentId cannot be set on the builder chain. We use the chained setter
        // (parent has @Accessors(chain = true)) after build. Behaviour is equivalent.
        SectionCatalogEntry existing = SectionCatalogEntry.builder()
                .id("id1").flavor(Flavor.AZURE).sectionKey("custom1").system(false).build();
        existing.setDocumentId(docId);
        when(repo.findById("id1")).thenReturn(Optional.of(existing));
        when(schemaRepo.findAll()).thenReturn(List.of(
                ConfigurationSchema.builder()
                        .name("s1")
                        .sections(List.of(
                                SchemaSection.builder()
                                        .catalogEntryDocumentId(docId).build()))
                        .build()));
        assertThrows(IllegalStateException.class, () -> service.delete("id1"));
    }

    @Test
    void create_setsSystemFalse_andSavesWithDocumentId() {
        SectionCatalogEntry entry = SectionCatalogEntry.builder()
                .flavor(Flavor.AZURE).sectionKey("custom1").displayName("Custom").build();
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        SectionCatalogEntry saved = service.create(entry);
        assertFalse(saved.isSystem());
        assertNotNull(saved.getDocumentId());
    }

    @Test
    void clone_copiesFields_forcesSystemFalse_andAssignsDocumentId() {
        SectionItemField field = SectionItemField.builder()
                .name("host").displayName("Host").type(SectionItemFieldType.STRING).build();
        SectionCatalogEntry source = SectionCatalogEntry.builder()
                .id("src1").flavor(Flavor.AZURE).sectionKey("functions").displayName("Functions")
                .description("desc").icon("azure/func.svg").system(true)
                .itemFields(List.of(field))
                .requiredReadPermission("PERM_X_READ").requiredWritePermission("PERM_X_WRITE")
                .build();
        when(repo.findById("src1")).thenReturn(Optional.of(source));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SectionCatalogEntry cloned = service.clone("src1", "Functions Copy", "functionsCopy");

        assertEquals("Functions Copy", cloned.getDisplayName());
        assertEquals("functionsCopy", cloned.getSectionKey());
        assertEquals(Flavor.AZURE, cloned.getFlavor());
        assertEquals("desc", cloned.getDescription());
        assertEquals("azure/func.svg", cloned.getIcon());
        assertEquals("PERM_X_READ", cloned.getRequiredReadPermission());
        assertEquals("PERM_X_WRITE", cloned.getRequiredWritePermission());
        assertEquals(1, cloned.getItemFields().size());
        assertFalse(cloned.isSystem());
        assertNotNull(cloned.getDocumentId());
    }

    @Test
    void clone_rejectsDuplicateSectionKey() {
        SectionCatalogEntry source = SectionCatalogEntry.builder()
                .id("src1").flavor(Flavor.AZURE).sectionKey("functions").displayName("Functions").build();
        when(repo.findById("src1")).thenReturn(Optional.of(source));
        SectionCatalogEntry conflict = SectionCatalogEntry.builder()
                .id("other").flavor(Flavor.AZURE).sectionKey("functionsCopy").displayName("Other").build();
        when(repo.findFirstByFlavorAndSectionKeyOrderByVersionDesc(Flavor.AZURE, "functionsCopy"))
                .thenReturn(Optional.of(conflict));

        assertThrows(IllegalArgumentException.class,
                () -> service.clone("src1", "Functions Copy", "functionsCopy"));
    }
}
