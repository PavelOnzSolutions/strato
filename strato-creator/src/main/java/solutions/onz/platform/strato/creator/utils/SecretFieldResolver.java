package solutions.onz.platform.strato.creator.utils;

import solutions.onz.platform.strato.creator.services.EncryptionService;

import java.util.*;

public class SecretFieldResolver {

    private SecretFieldResolver() {}

    @SuppressWarnings("unchecked")
    /**
     * Recursively finds all paths to secret fields in the given JSON schema.
     *
     * @param schema The JSON schema to search for secret fields.
     * @return A set of paths to secret fields in the schema.
     */
    public static Set<String> findSecretPaths(Map<String, Object> schema) {
        Set<String> paths = new HashSet<>();
        if (schema == null) return paths;
        Object properties = schema.get("properties");
        if (properties instanceof Map) {
            // Note: only recurses into "type": "object" properties. Arrays of objects ("type": "array" with "items")
            // are not traversed — secret fields nested inside arrays are not supported in this version.
            collectPaths((Map<String, Object>) properties, "", paths);
        }
        return paths;
    }

    @SuppressWarnings("unchecked")
    /**
     * Recursively collects paths to secret fields within the given properties map.
     *
     * @param properties The properties map to search for secret fields.
     * @param prefix The current path prefix.
     * @param paths The set to collect paths into.
     */
    private static void collectPaths(Map<String, Object> properties, String prefix, Set<String> paths) {
        for (Map.Entry<String, Object> entry : properties.entrySet()) {
            String fullPath = prefix.isEmpty() ? entry.getKey() : prefix + "." + entry.getKey();
            Object fieldDef = entry.getValue();
            if (!(fieldDef instanceof Map)) continue;
            Map<String, Object> def = (Map<String, Object>) fieldDef;
            Object type = def.get("type");
            if ("secret".equals(type)) {
                paths.add(fullPath);
            } else if ("object".equals(type) && def.get("properties") instanceof Map) {
                collectPaths((Map<String, Object>) def.get("properties"), fullPath, paths);
            }
        }
    }

    /**
     * Masks the last 3 characters of the given value.
     * @param value
     * @return
     */
    public static String maskValue(String value) {
        if (value == null || value.length() <= 3) return "***";
        return "***" + value.substring(value.length() - 3);
    }

    public static Map<String, Object> maskData(Map<String, Object> data, Set<String> secretPaths) {
        if (data == null) return null;
        if (secretPaths.isEmpty()) return deepCopyMap(data);
        Map<String, Object> result = deepCopyMap(data);
        for (String path : secretPaths) {
            Object val = getAtPath(result, path);
            if (val instanceof String) {
                setAtPath(result, path, maskValue((String) val));
            }
        }
        return result;
    }

    public static Map<String, Object> decryptData(Map<String, Object> data, Set<String> secretPaths,
                                                    EncryptionService enc) {
        if (data == null) return null;
        if (secretPaths.isEmpty()) return deepCopyMap(data);
        Map<String, Object> result = deepCopyMap(data);
        for (String path : secretPaths) {
            Object val = getAtPath(result, path);
            if (val instanceof String) {
                setAtPath(result, path, enc.decrypt((String) val));
            }
        }
        return result;
    }

    public static Map<String, Object> encryptData(Map<String, Object> incoming,
                                                   Map<String, Object> existing,
                                                   Set<String> secretPaths,
                                                   EncryptionService enc) {
        if (incoming == null) return null;
        if (secretPaths.isEmpty()) return deepCopyMap(incoming);
        Map<String, Object> result = deepCopyMap(incoming);
        for (String path : secretPaths) {
            Object val = getAtPath(result, path);
            if (!(val instanceof String)) continue;
            String strVal = (String) val;
            if (strVal.startsWith("gcm.v1:")) {
                // already encrypted — leave it
            } else if (strVal.startsWith("***")) {
                Object existingVal = existing != null ? getAtPath(existing, path) : null;
                if (existingVal == null) {
                    throw new IllegalArgumentException(
                        "Masked value submitted for secret field '" + path + "' but no existing record found to restore from");
                }
                if (existingVal instanceof String && !((String) existingVal).startsWith("gcm.v1:")) {
                    // existing value is plain text (legacy) — encrypt it now
                    setAtPath(result, path, enc.encrypt((String) existingVal));
                } else {
                    setAtPath(result, path, existingVal);
                }
            } else {
                setAtPath(result, path, enc.encrypt(strVal));
            }
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    static Object getAtPath(Map<String, Object> data, String path) {
        if (data == null) return null;
        int dot = path.indexOf('.');
        if (dot < 0) return data.get(path);
        String head = path.substring(0, dot);
        String tail = path.substring(dot + 1);
        Object nested = data.get(head);
        if (nested instanceof Map) return getAtPath((Map<String, Object>) nested, tail);
        return null;
    }

    @SuppressWarnings("unchecked")
    static void setAtPath(Map<String, Object> data, String path, Object value) {
        if (data == null) return;
        int dot = path.indexOf('.');
        if (dot < 0) {
            data.put(path, value);
            return;
        }
        String head = path.substring(0, dot);
        String tail = path.substring(dot + 1);
        Object nested = data.get(head);
        if (nested instanceof Map) {
            setAtPath((Map<String, Object>) nested, tail, value);
        }
    }

    @SuppressWarnings("unchecked")
    static List<?> deepCopyList(List<?> list) {
        List<Object> copy = new ArrayList<>(list.size());
        for (Object item : list) {
            if (item instanceof Map) {
                copy.add(deepCopyMap((Map<String, Object>) item));
            } else {
                copy.add(item);
            }
        }
        return copy;
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> deepCopyMap(Map<String, Object> data) {
        if (data == null) return null;
        Map<String, Object> copy = new LinkedHashMap<>(data.size());
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            Object val = entry.getValue();
            if (val instanceof Map) {
                copy.put(entry.getKey(), deepCopyMap((Map<String, Object>) val));
            } else if (val instanceof List) {
                copy.put(entry.getKey(), deepCopyList((List<?>) val));
            } else {
                copy.put(entry.getKey(), val);
            }
        }
        return copy;
    }
}
