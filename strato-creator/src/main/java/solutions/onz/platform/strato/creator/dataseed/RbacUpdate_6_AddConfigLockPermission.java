package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.constants.Permissions;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "rbac-update-6-add-config-lock-permission", order = "015", author = "dataseed")
public class RbacUpdate_6_AddConfigLockPermission {

    private final AuthorityRepository authorityRepository;

    @Execution
    public void changeSet() {
        authorityRepository.findById("ADMIN").ifPresent(admin -> {
            admin.addPermission(Permissions.CONFIG_LOCK_SET);
            authorityRepository.save(admin);
            log.info("[ Dataseed ]: Added {} to ADMIN authority", Permissions.CONFIG_LOCK_SET);
        });
    }

    @RollbackExecution
    public void rollback() {
        authorityRepository.findById("ADMIN").ifPresent(admin -> {
            admin.removePermission(Permissions.CONFIG_LOCK_SET);
            authorityRepository.save(admin);
        });
    }
}
