package solutions.onz.platform.strato.creator.constants;

import org.springframework.stereotype.Component;

import java.util.*;

@Component("permissions")
public class Permissions {
    public static final String USER_READ = "PERM_USER_READ";
    public static final String USER_WRITE = "PERM_USER_WRITE";
    public static final String ROLE_READ = "PERM_ROLE_READ";
    public static final String ROLE_WRITE = "PERM_ROLE_WRITE";
    public static final String VERSIONS_READ = "PERM_VERSIONS_READ";
    public static final String VERSIONS_WRITE = "PERM_VERSIONS_WRITE";
    public static final String ENVIRONMENT_READ = "PERM_ENVIRONMENT_READ";
    public static final String ENVIRONMENT_WRITE = "PERM_ENVIRONMENT_WRITE";
    public static final String DEPLOYMENT_READ = "PERM_DEPLOYMENT_READ";
    public static final String DEPLOYMENT_EXECUTE = "PERM_DEPLOYMENT_EXECUTE";
    public static final String DEPLOYMENT_WRITE = "PERM_DEPLOYMENT_WRITE";
    public static final String RESOURCE_READ = "PERM_RESOURCE_READ";
    public static final String RESOURCE_WRITE = "PERM_RESOURCE_WRITE";
    public static final String AUDIT_READ = "PERM_AUDIT_READ";
    public static final String AUDIT_DELETE = "PERM_AUDIT_DELETE";
    public static final String BACKUP_READ = "PERM_BACKUP_READ";
    public static final String BACKUP_WRITE = "PERM_BACKUP_WRITE";
    public static final String HEALTH_READ = "PERM_HEALTH_READ";
    public static final String PLATFORM_READ = "PERM_PLATFORM_READ";
    public static final String CONFIG_PROVIDER_READ = "PERM_CONFIG_PROVIDER_READ";
    public static final String CONFIG_PROVIDER_WRITE = "PERM_CONFIG_PROVIDER_WRITE";
    public static final String CONFIG_SCHEMA_WRITE = "PERM_CONFIG_SCHEMA_WRITE";
    public static final String CONFIG_SCHEMA_READ = "PERM_CONFIG_SCHEMA_READ";
    public static final String CONFIG_SECTIONS_READ = "PERM_CONFIG_SECTIONS_READ";
    public static final String CONFIG_SECTIONS_WRITE = "PERM_CONFIG_SECTIONS_WRITE";
    public static final String CONFIG_SECTIONS_OVERRIDE = "PERM_CONFIG_SECTIONS_OVERRIDE";
    public static final String CONFIG_LOCK_SET = "PERM_CONFIG_LOCK_SET";
    public static final String CATALOG_ADMIN = "PERM_CATALOG_ADMIN";

    /**
     * Hierarchy per scope — each list is ordered highest to lowest.
     * A higher-level permission implies all lower-level ones in the same scope.
     */
    private static final Map<String, List<String>> HIERARCHY = new LinkedHashMap<>();

    static {
        HIERARCHY.put("USER",            List.of(USER_WRITE, USER_READ));
        HIERARCHY.put("ROLE",            List.of(ROLE_WRITE, ROLE_READ));
        HIERARCHY.put("VERSIONS",        List.of(VERSIONS_WRITE, VERSIONS_READ));
        HIERARCHY.put("ENVIRONMENT",     List.of(ENVIRONMENT_WRITE, ENVIRONMENT_READ));
        HIERARCHY.put("DEPLOYMENT",      List.of(DEPLOYMENT_WRITE, DEPLOYMENT_EXECUTE, DEPLOYMENT_READ));
        HIERARCHY.put("RESOURCE",        List.of(RESOURCE_WRITE, RESOURCE_READ));
        HIERARCHY.put("AUDIT",           List.of(AUDIT_DELETE, AUDIT_READ));
        HIERARCHY.put("BACKUP",          List.of(BACKUP_WRITE, BACKUP_READ));
        HIERARCHY.put("HEALTH",          List.of(HEALTH_READ));
        HIERARCHY.put("PLATFORM",        List.of(PLATFORM_READ));
        HIERARCHY.put("CONFIG_PROVIDER", List.of(CONFIG_PROVIDER_WRITE, CONFIG_PROVIDER_READ));
        HIERARCHY.put("CONFIG_SCHEMA",   List.of(CONFIG_SCHEMA_WRITE, CONFIG_SCHEMA_READ));
        HIERARCHY.put("CONFIG_SECTIONS", List.of(CONFIG_SECTIONS_OVERRIDE, CONFIG_SECTIONS_WRITE, CONFIG_SECTIONS_READ));
        HIERARCHY.put("CATALOG_ADMIN",   List.of(CATALOG_ADMIN));
        HIERARCHY.put("CONFIG_LOCK",     List.of(CONFIG_LOCK_SET));
    }

    /**
     * Returns the hierarchy map (unmodifiable) for iteration in migrations.
     */
    public static Map<String, List<String>> getHierarchy() {
        return Collections.unmodifiableMap(HIERARCHY);
    }

    /**
     * Given a single permission, returns it plus every permission it implies.
     * E.g. PERM_DEPLOYMENT_WRITE → [PERM_DEPLOYMENT_WRITE, PERM_DEPLOYMENT_EXECUTE, PERM_DEPLOYMENT_READ]
     */
    public static Set<String> getImpliedPermissions(String permission) {
        for (List<String> levels : HIERARCHY.values()) {
            int idx = levels.indexOf(permission);
            if (idx >= 0) {
                return new LinkedHashSet<>(levels.subList(idx, levels.size()));
            }
        }
        return Set.of(permission);
    }

    /**
     * Expands a set of permissions by adding all implied (lower-level) permissions.
     */
    public static Set<String> expandAll(Collection<String> permissions) {
        Set<String> expanded = new LinkedHashSet<>();
        for (String perm : permissions) {
            expanded.addAll(getImpliedPermissions(perm));
        }
        return expanded;
    }
}
