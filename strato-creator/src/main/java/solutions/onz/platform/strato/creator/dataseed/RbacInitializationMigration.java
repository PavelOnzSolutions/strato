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
@ChangeUnit(id = "rbac-initialization-migration", order = "002", author = "dataseed")
public class RbacInitializationMigration {
    private final AuthorityRepository authorityRepository;

    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_ENGINEER = "ENGINEER";
    private static final String ROLE_USER = "USER";
    private static final String ROLE_API_TOKEN = "API_TOKEN";

    private static final Set<String> ALL_PERMISSIONS = Set.of(
            "PERM_USER_READ",
            "PERM_USER_WRITE",
            "PERM_ROLE_READ",
            "PERM_ROLE_WRITE",
            "PERM_VERSIONS_READ",
            "PERM_VERSIONS_WRITE",
            "PERM_ENVIRONMENT_READ",
            "PERM_ENVIRONMENT_WRITE",
            "PERM_DEPLOYMENT_READ",
            "PERM_DEPLOYMENT_EXECUTE",
            "PERM_DEPLOYMENT_WRITE",
            "PERM_RESOURCE_READ",
            "PERM_RESOURCE_WRITE",
            "PERM_AUDIT_READ",
            "PERM_BACKUP_READ",
            "PERM_BACKUP_WRITE",
            "PERM_HEALTH_READ",
            "PERM_PLATFORM_READ"
    );

    @Execution
    public void changeSet() {
        updateOrCreateRole(ROLE_ADMIN, ALL_PERMISSIONS);
        updateOrCreateRole(ROLE_ENGINEER, Set.of("PERM_AUDIT_READ", "PERM_BACKUP_READ", "PERM_HEALTH_READ"));
        updateOrCreateRole(ROLE_USER, Set.of("PERM_HEALTH_READ", "PERM_PLATFORM_READ"));
        updateOrCreateRole(ROLE_API_TOKEN, Set.of("PERM_BACKUP_READ", "PERM_BACKUP_WRITE"));
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
