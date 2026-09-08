package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.domain.Authority;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Add newly introduced PERM_PLATFORM_READ to system ADMIN role
 */
@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "rbac-update-2-migration-add-permission-to-admins", order = "010", author = "dataseed")
public class RbacUpdate_2_Migration {
    private final AuthorityRepository authorityRepository;
    private Authority backup;

    @Execution
    public void changeSet() {
        Authority adminAuthority = authorityRepository.findById("ADMIN").orElseThrow();
        backup = adminAuthority;
        authorityRepository.save(adminAuthority.addPermission("PERM_PLATFORM_READ").addPermission("PERM_AUDIT_DELETE"));
    }

    @RollbackExecution
    public void rollback() {
        if (authorityRepository.existsById("ADMIN")) {
            authorityRepository.deleteById("ADMIN");
        }
        authorityRepository.save(backup);
    }
}
