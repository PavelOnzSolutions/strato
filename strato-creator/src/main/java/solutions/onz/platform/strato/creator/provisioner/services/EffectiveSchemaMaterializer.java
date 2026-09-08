package solutions.onz.platform.strato.creator.provisioner.services;

import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;
import solutions.onz.platform.strato.creator.provisioner.domain.SchemaSection;
import solutions.onz.platform.strato.creator.provisioner.domain.SectionCatalogEntry;
import solutions.onz.platform.strato.creator.provisioner.domain.SectionItemField;
import solutions.onz.platform.strato.creator.provisioner.repositories.SectionCatalogEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class EffectiveSchemaMaterializer {

    private final SectionCatalogEntryRepository catalogRepo;

    @Cacheable(value = "effective_schemas", key = "#schema.id")
    public Map<String, Object> materialize(ConfigurationSchema schema) {
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("type", "object");
        Map<String, Object> properties = new LinkedHashMap<>();

        if (schema.getSections() != null) {
            for (SchemaSection section : schema.getSections()) {
                SectionCatalogEntry catalog = catalogRepo.findTopByDocumentIdOrderByVersionDesc(section.getCatalogEntryDocumentId())
                        .orElse(null);
                if (catalog == null) {
                    log.warn("Skipping unknown catalog entry {} in schema {}", section.getCatalogEntryDocumentId(), schema.getName());
                    continue;
                }

                List<SectionItemField> effectiveFields = composeFields(catalog, section);
                Map<String, Object> itemSchema = fieldsToJsonSchema(effectiveFields, section.getFieldDefaults(), "");

                Map<String, Object> sectionWrap = new LinkedHashMap<>();
                sectionWrap.put("type", "object");
                sectionWrap.put("additionalProperties", itemSchema);

                properties.put(catalog.getSectionKey(), sectionWrap);
            }
        }
        root.put("properties", properties);
        return root;
    }

    private List<SectionItemField> composeFields(SectionCatalogEntry catalog, SchemaSection overlay) {
        Set<String> disabled = overlay.getDisabledFieldPaths() != null
                ? overlay.getDisabledFieldPaths() : Set.of();
        List<SectionItemField> base = filterDisabled(catalog.getItemFields(), disabled, "");
        List<SectionItemField> custom = overlay.getCustomFields() != null ? overlay.getCustomFields() : List.of();

        List<SectionItemField> combined = new ArrayList<>(base);
        combined.addAll(custom);
        return combined;
    }

    private List<SectionItemField> filterDisabled(List<SectionItemField> fields, Set<String> disabled, String prefix) {
        if (fields == null) return List.of();
        List<SectionItemField> out = new ArrayList<>();
        for (SectionItemField f : fields) {
            String path = prefix.isEmpty() ? f.getName() : prefix + "." + f.getName();
            if (disabled.contains(path)) continue;
            // Recurse into nested fields if any
            if (f.getNestedFields() != null && !f.getNestedFields().isEmpty()) {
                SectionItemField copy = SectionItemField.builder()
                        .name(f.getName()).displayName(f.getDisplayName()).type(f.getType())
                        .description(f.getDescription()).defaultValue(f.getDefaultValue())
                        .secret(f.isSecret())
                        .nestedFields(filterDisabled(f.getNestedFields(), disabled, path))
                        .build();
                out.add(copy);
            } else {
                out.add(f);
            }
        }
        return out;
    }

    private Map<String, Object> fieldsToJsonSchema(List<SectionItemField> fields, Map<String, Object> defaults, String prefix) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        Map<String, Object> props = new LinkedHashMap<>();
        for (SectionItemField f : fields) {
            String path = prefix.isEmpty() ? f.getName() : prefix + "." + f.getName();
            props.put(f.getName(), fieldToJsonSchema(f, defaults, path));
        }
        schema.put("properties", props);
        return schema;
    }

    private Map<String, Object> fieldToJsonSchema(SectionItemField f, Map<String, Object> defaults, String path) {
        Map<String, Object> node = new LinkedHashMap<>();
        switch (f.getType()) {
            case STRING -> node.put("type", f.isSecret() ? "secret" : "string");
            case NUMBER -> node.put("type", "number");
            case BOOLEAN -> node.put("type", "boolean");
            case ARRAY_OF_STRING -> {
                node.put("type", "array");
                node.put("items", Map.of("type", "string"));
            }
            case OBJECT -> {
                if (f.getNestedFields() != null && !f.getNestedFields().isEmpty()) {
                    Map<String, Object> inner = fieldsToJsonSchema(f.getNestedFields(), defaults, path);
                    node.put("type", "object");
                    node.put("properties", inner.get("properties"));
                } else {
                    node.put("type", "object");
                }
            }
            case ARRAY_OF_OBJECT -> {
                node.put("type", "array");
                if (f.getNestedFields() != null && !f.getNestedFields().isEmpty()) {
                    Map<String, Object> itemInner = fieldsToJsonSchema(f.getNestedFields(), defaults, path);
                    Map<String, Object> items = new LinkedHashMap<>();
                    items.put("type", "object");
                    items.put("properties", itemInner.get("properties"));
                    node.put("items", items);
                } else {
                    node.put("items", Map.of("type", "object"));
                }
            }
            case MAP_OF_STRING -> {
                node.put("type", "object");
                node.put("additionalProperties", Map.of("type", "string"));
            }
            case MAP_OF_OBJECT -> {
                node.put("type", "object");
                if (f.getNestedFields() != null && !f.getNestedFields().isEmpty()) {
                    Map<String, Object> itemInner = fieldsToJsonSchema(f.getNestedFields(), defaults, path);
                    Map<String, Object> ap = new LinkedHashMap<>();
                    ap.put("type", "object");
                    ap.put("properties", itemInner.get("properties"));
                    node.put("additionalProperties", ap);
                } else {
                    node.put("additionalProperties", Map.of("type", "object"));
                }
            }
        }
        if (f.isSecret()) {
            node.put("x-strato-secret", true);
        }
        // Apply default — overlay default wins
        if (defaults != null && defaults.containsKey(path)) {
            node.put("default", defaults.get(path));
        } else if (f.getDefaultValue() != null) {
            node.put("default", f.getDefaultValue());
        }
        if (f.getDescription() != null) node.put("description", f.getDescription());
        if (f.getDisplayName() != null) node.put("title", f.getDisplayName());
        return node;
    }
}
