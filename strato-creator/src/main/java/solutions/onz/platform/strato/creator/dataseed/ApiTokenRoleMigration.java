package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.domain.Authority;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "api-token-role-migration", order = "004", author = "dataseed")
public class ApiTokenRoleMigration {
    private final AuthorityRepository authorityRepository;

    private static final List<String> DEFAULT_ROLES = List.of(
            "ROLE_API_TOKEN"
    );

    @Execution
    public void changeSet() {
        for (String role : DEFAULT_ROLES) {
            if (!authorityRepository.existsById(role)) {
                log.info("[ Dataseed ]: Inserting API_TOKEN authority: {}", role);
                Authority authority = Authority.builder().name(role).build();
                authorityRepository.save(authority);
            }
        }
    }

    @RollbackExecution
    public void rollback() {
        for (String role : DEFAULT_ROLES) {
            if (authorityRepository.existsById(role)) {
                authorityRepository.deleteById(role);
            }
        }
    }
}
