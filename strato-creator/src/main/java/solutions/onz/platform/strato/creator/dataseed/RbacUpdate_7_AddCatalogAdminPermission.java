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
@ChangeUnit(id = "rbac-update-7-add-catalog-admin-permission", order = "018", author = "dataseed")
public class RbacUpdate_7_AddCatalogAdminPermission {

    private final AuthorityRepository authorityRepository;

    @Execution
    public void changeSet() {
        authorityRepository.findById("ADMIN").ifPresent(admin -> {
            admin.addPermission(Permissions.CATALOG_ADMIN);
            authorityRepository.save(admin);
            log.info("[ Dataseed ]: Added {} to ADMIN authority", Permissions.CATALOG_ADMIN);
        });
    }

    @RollbackExecution
    public void rollback() {
        authorityRepository.findById("ADMIN").ifPresent(admin -> {
            admin.removePermission(Permissions.CATALOG_ADMIN);
            authorityRepository.save(admin);
        });
    }
}
