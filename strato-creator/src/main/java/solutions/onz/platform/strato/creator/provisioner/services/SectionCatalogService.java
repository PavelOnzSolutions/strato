package solutions.onz.platform.strato.creator.provisioner.services;

import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;
import solutions.onz.platform.strato.creator.provisioner.domain.SchemaSection;
import solutions.onz.platform.strato.creator.provisioner.domain.SectionCatalogEntry;
import solutions.onz.platform.strato.creator.provisioner.domain.enums.Flavor;
import solutions.onz.platform.strato.creator.provisioner.repositories.ConfigurationSchemaRepository;
import solutions.onz.platform.strato.creator.provisioner.repositories.SectionCatalogEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SectionCatalogService {

    private static final Pattern SECTION_KEY_PATTERN = Pattern.compile("[a-z][a-zA-Z0-9]*");

    private final SectionCatalogEntryRepository repo;
    private final ConfigurationSchemaRepository schemaRepo;

    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_SCHEMA_READ, @permissions.CONFIG_SCHEMA_WRITE})")
    @Cacheable(value = "section_catalog_latest", key = "#flavor")
    public List<SectionCatalogEntry> findAllLatest(Flavor flavor) {
        return repo.findAllByFlavor(flavor).stream()
                .collect(Collectors.groupingBy(SectionCatalogEntry::getDocumentId,
                        Collectors.maxBy(Comparator.comparing(SectionCatalogEntry::getVersion))))
                .values().stream()
                .filter(Optional::isPresent).map(Optional::get)
                .filter(e -> e.getDeleted() == null || !e.getDeleted())
                .sorted(Comparator.comparing(SectionCatalogEntry::isSystem).reversed()
                        .thenComparing(SectionCatalogEntry::getDisplayName))
                .collect(Collectors.toList());
    }

    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_SCHEMA_READ, @permissions.CONFIG_SCHEMA_WRITE})")
    public Optional<SectionCatalogEntry> findById(String id) {
        return repo.findById(id);
    }

    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_SCHEMA_READ, @permissions.CONFIG_SCHEMA_WRITE})")
    public Optional<SectionCatalogEntry> findLatestByDocumentId(UUID documentId) {
        return repo.findTopByDocumentIdOrderByVersionDesc(documentId);
    }

    @PreAuthorize("hasAuthority(@permissions.CATALOG_ADMIN)")
    @CacheEvict(value = "section_catalog_latest", allEntries = true)
    public SectionCatalogEntry create(SectionCatalogEntry entry) {
        /*
        if (entry.isSystem()) {
            throw new IllegalArgumentException("Cannot create a system catalog entry from the API");
        }*/

        validate(entry, null);
        entry.setSystem(false);
        if (entry.getDocumentId() == null) entry.setDocumentId(UUID.randomUUID());
        return repo.save(entry);
    }

    @PreAuthorize("hasAuthority(@permissions.CATALOG_ADMIN)")
    @CacheEvict(value = "section_catalog_latest", allEntries = true)
    public SectionCatalogEntry update(String id, SectionCatalogEntry incoming) {
        SectionCatalogEntry existing = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Catalog entry not found: " + id));
        /*
        if (existing.isSystem()) {
            throw new IllegalArgumentException("Cannot modify system catalog entry: " + existing.getSectionKey());
        }
        */

        validate(incoming, existing);
        incoming.setId(existing.getId());
        incoming.setDocumentId(existing.getDocumentId());
        incoming.setSystem(existing.isSystem());
        return repo.save(incoming);
    }

    @PreAuthorize("hasAuthority(@permissions.CATALOG_ADMIN)")
    @CacheEvict(value = "section_catalog_latest", allEntries = true)
    public SectionCatalogEntry clone(String id, String displayName, String sectionKey) {
        SectionCatalogEntry source = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Catalog entry not found: " + id));
        SectionCatalogEntry copy = SectionCatalogEntry.builder()
                .flavor(source.getFlavor())
                .sectionKey(sectionKey)
                .displayName(displayName)
                .description(source.getDescription())
                .icon(source.getIcon())
                .system(false)
                .itemFields(source.getItemFields() != null ? new ArrayList<>(source.getItemFields()) : null)
                .requiredReadPermission(source.getRequiredReadPermission())
                .requiredWritePermission(source.getRequiredWritePermission())
                .build();
        copy.setDocumentId(UUID.randomUUID());
        validate(copy, null);
        return repo.save(copy);
    }

    @PreAuthorize("hasAuthority(@permissions.CATALOG_ADMIN)")
    @CacheEvict(value = "section_catalog_latest", allEntries = true)
    public void delete(String id) {
        SectionCatalogEntry existing = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Catalog entry not found: " + id));
        if (existing.isSystem()) {
            throw new IllegalArgumentException("Cannot delete system catalog entry: " + existing.getSectionKey());
        }
        if (isReferencedBySchema(existing.getDocumentId())) {
            throw new IllegalStateException("Catalog entry is referenced by one or more schemas: " + existing.getSectionKey());
        }
        existing.setDeleted(true);
        repo.save(existing);
    }

    private boolean isReferencedBySchema(UUID catalogDocumentId) {
        if (catalogDocumentId == null) return false;
        return schemaRepo.findAll().stream()
                .map(ConfigurationSchema::getSections)
                .filter(Objects::nonNull)
                .flatMap(List::stream)
                .map(SchemaSection::getCatalogEntryDocumentId)
                .anyMatch(catalogDocumentId::equals);
    }

    private void validate(SectionCatalogEntry entry, SectionCatalogEntry existing) {
        if (entry.getFlavor() == null) throw new IllegalArgumentException("flavor required");
        if (entry.getSectionKey() == null || !SECTION_KEY_PATTERN.matcher(entry.getSectionKey()).matches()) {
            throw new IllegalArgumentException("sectionKey must match [a-z][a-zA-Z0-9]*");
        }
        // Uniqueness across flavor (excluding current entry if updating, and ignoring soft-deleted)
        repo.findFirstByFlavorAndSectionKeyOrderByVersionDesc(entry.getFlavor(), entry.getSectionKey())
                .filter(other -> other.getDeleted() == null || !other.getDeleted())
                .filter(other -> existing == null || !other.getDocumentId().equals(existing.getDocumentId()))
                .ifPresent(conflict -> {
                    throw new IllegalArgumentException(
                            "sectionKey already exists for flavor " + entry.getFlavor() + ": " + entry.getSectionKey());
                });
    }
}
