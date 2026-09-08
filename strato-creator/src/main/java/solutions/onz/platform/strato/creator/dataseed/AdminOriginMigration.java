package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.domain.enums.UserSource;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;


/**
 * Sets Admin user origin to LOCAL
 */
@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "admin-add-origin-field", order = "014", author = "dataseed")
public class AdminOriginMigration {

    private final UserAccountRepository userRepository;

    @Execution
    public void changeSet() {
       userRepository.save(userRepository.findByUsername("admin").orElseThrow().setSource(UserSource.LOCAL));
    }

    @RollbackExecution
    public void rollback() {
        // none
    }
}
