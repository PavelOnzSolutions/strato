package solutions.onz.platform.strato.creator.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class ConfigurationDataValidator {

    /** Throws IllegalArgumentException on validation failure. */
    @SuppressWarnings("unchecked")
    public void validateConfigurationData(Map<String, Map<String, Map<String, Object>>> data, Map<String, Object> materialized) {
        if (data == null) return;
        Map<String, Object> sectionProps = (Map<String, Object>) materialized.get("properties");
        if (sectionProps == null) {
            if (!data.isEmpty()) throw new IllegalArgumentException("Schema has no sections but data is non-empty");
            return;
        }
        for (String sectionKey : data.keySet()) {
            if (!sectionProps.containsKey(sectionKey)) {
                throw new IllegalArgumentException("Unknown section in configuration data: " + sectionKey);
            }
            Map<String, Object> sectionSchema = (Map<String, Object>) sectionProps.get(sectionKey);
            Map<String, Object> itemSchema = (Map<String, Object>) sectionSchema.get("additionalProperties");
            Map<String, Map<String, Object>> items = data.get(sectionKey);
            if (items == null) continue;
            for (Map.Entry<String, Map<String, Object>> item : items.entrySet()) {
                validateItem(sectionKey + "." + item.getKey(), item.getValue(), itemSchema);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void validateItem(String path, Map<String, Object> item, Map<String, Object> itemSchema) {
        if (itemSchema == null || item == null) return;
        Map<String, Object> fieldProps = (Map<String, Object>) itemSchema.get("properties");
        if (fieldProps == null) return;
        for (Map.Entry<String, Object> entry : item.entrySet()) {
            String fieldName = entry.getKey();
            Map<String, Object> fieldSchema = (Map<String, Object>) fieldProps.get(fieldName);
            if (fieldSchema == null) {
                // Field exists in data but not in the active schema — orphan data is permitted
                // (schema may have changed while data was still being edited; kept for user review).
                int dot = path.indexOf('.');
                String sectionKey = dot >= 0 ? path.substring(0, dot) : path;
                String itemName = dot >= 0 ? path.substring(dot + 1) : "";
                log.warn("Orphan field outside schema: section={} item={} field={}", sectionKey, itemName, fieldName);
                continue;
            }
            String type = (String) fieldSchema.get("type");
            Object val = entry.getValue();
            if (val == null) continue;
            switch (type) {
                case "string", "secret" -> { if (!(val instanceof String)) throw mismatch(path, fieldName, type, val); }
                case "number" -> { if (!(val instanceof Number)) throw mismatch(path, fieldName, type, val); }
                case "boolean" -> { if (!(val instanceof Boolean)) throw mismatch(path, fieldName, type, val); }
                case "array" -> { if (!(val instanceof List)) throw mismatch(path, fieldName, type, val); }
                case "object" -> { if (!(val instanceof Map)) throw mismatch(path, fieldName, type, val); }
                default -> { /* unknown type — be permissive */ }
            }
        }
    }

    private IllegalArgumentException mismatch(String path, String field, String expected, Object actual) {
        return new IllegalArgumentException(
                String.format("Type mismatch at %s.%s — expected %s, got %s", path, field, expected,
                        actual == null ? "null" : actual.getClass().getSimpleName()));
    }
}
