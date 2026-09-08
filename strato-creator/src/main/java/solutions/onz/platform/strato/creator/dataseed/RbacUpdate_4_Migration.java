package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;


/**
 * Assign PERM_CONFIG_PROVIDER_* roles to admin
 */
@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "rbac-update-4-migration-add-permission-to-admins", order = "013", author = "dataseed")
public class RbacUpdate_4_Migration {

    private final AuthorityRepository roleRepository;
    private final UserAccountRepository userRepository;

    @Execution
    public void changeSet() {
        roleRepository.save(
                roleRepository
                        .findById("ADMIN")
                        .orElseThrow()
                        .addPermission("PERM_CONFIG_SCHEMA_READ")
                        .addPermission("PERM_CONFIG_SCHEMA_WRITE")
        );
    }

    @RollbackExecution
    public void rollback() {
        roleRepository.save(roleRepository.findById("ADMIN").orElseThrow().removePermission("PERM_CONFIG_SCHEMA_READ").removePermission("PERM_CONFIG_SCHEMA_WRITE"));
    }
}
