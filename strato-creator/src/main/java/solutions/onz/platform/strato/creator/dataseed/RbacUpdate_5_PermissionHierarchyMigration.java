package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.constants.Permissions;
import solutions.onz.platform.strato.creator.domain.Authority;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Set;

/**
 * Backfill implied permissions on all Authority documents.
 * For example, a role that has PERM_DEPLOYMENT_WRITE but not PERM_DEPLOYMENT_READ
 * will gain PERM_DEPLOYMENT_EXECUTE and PERM_DEPLOYMENT_READ.
 */
@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "rbac-update-5-permission-hierarchy-backfill", order = "014", author = "dataseed")
public class RbacUpdate_5_PermissionHierarchyMigration {

    private final AuthorityRepository authorityRepository;

    @Execution
    public void changeSet() {
        for (Authority authority : authorityRepository.findAll()) {
            Set<String> current = authority.getPermissions();
            if (current == null || current.isEmpty()) {
                continue;
            }

            Set<String> expanded = Permissions.expandAll(current);
            if (expanded.size() > current.size()) {
                log.info("[ Dataseed ]: Expanding permissions for role '{}': {} → {}",
                        authority.getName(), current.size(), expanded.size());
                authority.setPermissions(expanded);
                authorityRepository.save(authority);
            }
        }
    }

    @RollbackExecution
    public void rollback() {
        // No rollback — the added implied permissions are data-consistent
        // and removing them could break access for existing users.
    }
}
