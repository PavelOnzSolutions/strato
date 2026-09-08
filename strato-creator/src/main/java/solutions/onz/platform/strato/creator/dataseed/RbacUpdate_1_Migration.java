package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.domain.Authority;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Set;

@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "rbac-update-1-migration", order = "009", author = "dataseed")
public class RbacUpdate_1_Migration {
    private final AuthorityRepository authorityRepository;

    private static final String ROLE_DEPLOYER = "DEPLOYER";
    private static final String ROLE_OBSERVER = "OBSERVER";
    private static final String ROLE_SECURITY_OFFICER = "SECURITY_OFFICER";

    @Execution
    public void changeSet() {
        updateOrCreateRole(
                ROLE_OBSERVER,
                Set.of(
                        "PERM_HEALTH_READ",
                        "PERM_DEPLOYMENT_READ",
                        "PERM_RESOURCE_READ",
                        "PERM_BACKUP_READ",
                        "PERM_USER_READ",
                        "PERM_ENVIRONMENT_READ"
                ));

        updateOrCreateRole(
                ROLE_DEPLOYER,
                Set.of(
                        "PERM_DEPLOYMENT_EXECUTE",
                        "PERM_DEPLOYMENT_WRITE",
                        "PERM_RESOURCE_READ",
                        "PERM_ENVIRONMENT_READ",
                        "PERM_AUDIT_READ",
                        "PERM_VERSIONS_READ"
                ));
        updateOrCreateRole(
                ROLE_SECURITY_OFFICER,
                Set.of(
                "PERM_USER_READ",
                "PERM_USER_WRITE",
                "PERM_ROLE_READ",
                "PERM_ROLE_WRITE",
                "PERM_HEALTH_READ",
                "PERM_AUDIT_READ"
        ));
    }

    private void updateOrCreateRole(String name, Set<String> permissions) {
        Authority authority = authorityRepository.findById(name)
                .orElse(Authority.builder().name(name).build());
        
        log.info("[ Dataseed ]: Updating RBAC for authority: {}", name);
        authority.setSystem(true);
        authority.setPermissions(permissions);
        authorityRepository.save(authority);
    }

    @RollbackExecution
    public void rollback() {
        // Rollback is usually not strictly required for data updates unless critical,
        // but we can at least set isSystem to false if needed.
        // For simplicity, we keep it as is.
    }
}
