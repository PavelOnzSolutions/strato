package solutions.onz.platform.strato.creator.provisioner.services;

import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;
import solutions.onz.platform.strato.creator.provisioner.domain.SchemaSection;
import solutions.onz.platform.strato.creator.provisioner.domain.SectionCatalogEntry;
import solutions.onz.platform.strato.creator.provisioner.domain.SectionItemField;
import solutions.onz.platform.strato.creator.provisioner.repositories.ConfigurationSchemaRepository;
import solutions.onz.platform.strato.creator.provisioner.repositories.SectionCatalogEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConfigurationSchemaService {

    private final ConfigurationSchemaRepository schemaRepository;
    private final SectionCatalogEntryRepository catalogRepository;

    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_SCHEMA_WRITE, @permissions.CONFIG_SCHEMA_READ})")
    @Cacheable(value = "configuration_schemas_latest")
    public List<ConfigurationSchema> findAll() {
        return schemaRepository.findAll();
    }

    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_SCHEMA_WRITE, @permissions.CONFIG_SCHEMA_READ})")
    @Cacheable(value = "configuration_schemas", key = "#id")
    public Optional<ConfigurationSchema> findById(String id) {
        return schemaRepository.findById(id);
    }

    @PreAuthorize("hasAuthority(@permissions.CONFIG_SCHEMA_WRITE)")
    @CacheEvict(value = {"configuration_schemas", "configuration_schemas_latest", "effective_schemas"}, allEntries = true)
    public ConfigurationSchema save(ConfigurationSchema schema) {
        validate(schema);
        return schemaRepository.save(schema);
    }

    @PreAuthorize("hasAuthority(@permissions.CONFIG_SCHEMA_WRITE)")
    @CacheEvict(value = {"configuration_schemas", "configuration_schemas_latest", "effective_schemas"}, allEntries = true)
    public void delete(String id) {
        schemaRepository.deleteById(id);
    }

    @CacheEvict(value = {"configuration_schemas", "configuration_schemas_latest"}, allEntries = true)
    public ConfigurationSchema clone(String id, String newName) {
        ConfigurationSchema source = schemaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Configuration schema not found: " + id));
        ConfigurationSchema cloned = ConfigurationSchema.builder()
                .name(newName)
                .description(source.getDescription())
                .flavor(source.getFlavor())
                .sections(source.getSections() != null ? new ArrayList<>(source.getSections()) : List.of())
                .build();
        return schemaRepository.save(cloned);
    }

    private void validate(ConfigurationSchema schema) {
        if (schema.getFlavor() == null) throw new IllegalArgumentException("flavor required");
        List<SchemaSection> sections = schema.getSections() != null ? schema.getSections() : List.of();
        Set<UUID> seen = new HashSet<>();
        for (SchemaSection sec : sections) {
            if (!seen.add(sec.getCatalogEntryDocumentId())) {
                throw new IllegalArgumentException("Duplicate catalogEntryDocumentId in sections: " + sec.getCatalogEntryDocumentId());
            }
            SectionCatalogEntry catalog = catalogRepository.findTopByDocumentIdOrderByVersionDesc(sec.getCatalogEntryDocumentId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Catalog entry not found: " + sec.getCatalogEntryDocumentId()));
            if (catalog.getFlavor() != schema.getFlavor()) {
                throw new IllegalArgumentException(
                        "Catalog entry flavor " + catalog.getFlavor() + " does not match schema flavor " + schema.getFlavor());
            }
            validateOverlay(catalog, sec);
        }
    }

    private void validateOverlay(SectionCatalogEntry catalog, SchemaSection section) {
        Set<String> secretPaths = new HashSet<>();
        collectSecretPaths(catalog.getItemFields(), "", secretPaths);

        Set<String> disabled = section.getDisabledFieldPaths() != null ? section.getDisabledFieldPaths() : Set.of();
        for (String d : disabled) {
            if (secretPaths.contains(d)) {
                throw new IllegalArgumentException("Cannot disable catalog-secret field: " + d);
            }
        }
        Map<String, Object> defaults = section.getFieldDefaults() != null ? section.getFieldDefaults() : Map.of();
        for (String d : defaults.keySet()) {
            if (secretPaths.contains(d)) {
                throw new IllegalArgumentException("Cannot override default for catalog-secret field: " + d);
            }
        }
        Set<String> builtInNames = new HashSet<>();
        if (catalog.getItemFields() != null) catalog.getItemFields().forEach(f -> builtInNames.add(f.getName()));
        List<SectionItemField> custom = section.getCustomFields() != null ? section.getCustomFields() : List.of();
        for (SectionItemField cf : custom) {
            if (builtInNames.contains(cf.getName())) {
                throw new IllegalArgumentException("Custom field name collides with built-in: " + cf.getName());
            }
        }
    }

    private void collectSecretPaths(List<SectionItemField> fields, String prefix, Set<String> out) {
        if (fields == null) return;
        for (SectionItemField f : fields) {
            String path = prefix.isEmpty() ? f.getName() : prefix + "." + f.getName();
            if (f.isSecret()) out.add(path);
            if (f.getNestedFields() != null && !f.getNestedFields().isEmpty()) {
                collectSecretPaths(f.getNestedFields(), path, out);
            }
        }
    }
}
