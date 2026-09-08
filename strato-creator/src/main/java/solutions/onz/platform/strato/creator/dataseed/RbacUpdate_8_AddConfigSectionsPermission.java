package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.constants.Permissions;
import solutions.onz.platform.strato.creator.domain.Authority;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.HashSet;
import java.util.Set;

/**
 * Grants PERM_CONFIG_SECTIONS_READ / _WRITE to roles that already hold
 * the corresponding PERM_CONFIG_SCHEMA_* permission. Section Catalog is
 * functionally tied to schemas, so existing schema-capable roles inherit
 * the new permissions. ADMIN role is wildcard-gated by role membership
 * and needs no permission update.
 */
@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "rbac-update-8-add-config-sections-permission-and-fix-user-role", order = "020", author = "dataseed")
public class RbacUpdate_8_AddConfigSectionsPermission {

    private final AuthorityRepository authorityRepository;

    @Execution
    public void changeSet() {
        for (Authority authority : authorityRepository.findAll()) {
            Set<String> current = authority.getPermissions();
            if (current == null) continue;

            Set<String> updated = new HashSet<>(current);
            boolean changed = false;
            if (updated.contains(Permissions.CONFIG_SCHEMA_READ)
                    && updated.add(Permissions.CONFIG_SECTIONS_READ)) {
                changed = true;
            }
            if (updated.contains(Permissions.CONFIG_SCHEMA_WRITE)
                    && updated.add(Permissions.CONFIG_SECTIONS_WRITE)) {
                changed = true;
            }

            if(authority.getName().equalsIgnoreCase("USER")
                    && updated.contains(Permissions.PLATFORM_READ)
                    && updated.add(Permissions.PLATFORM_READ)) {
                updated.add(Permissions.PLATFORM_READ);
                changed = true;
            }

            if (changed) {
                log.info("[ Dataseed ]: Granting PERM_CONFIG_SECTIONS_* to role '{}'", authority.getName());
                authority.setPermissions(updated);
                authorityRepository.save(authority);
            }
        }
    }

    @RollbackExecution
    public void rollback() {
        // No rollback — removing implied permissions could break access.
    }
}
