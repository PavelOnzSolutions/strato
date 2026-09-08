package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.domain.UserAccount;
import solutions.onz.platform.strato.creator.repositories.AuthorityRepository;
import solutions.onz.platform.strato.creator.utils.PasswordUtils;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.List;

@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "default-admin-user-migration", order = "003", author = "dataseed")
public class DefaultAdminUserMigration {

    private final MongoTemplate mongoTemplate;
    private final AuthorityRepository authorityRepository;

    @Execution
    public void changeSet() {
        Query q = new Query(Criteria.where("username").is("admin"));
        Boolean exists = mongoTemplate.exists(q, UserAccount.class);
        if (exists == null || !exists) {
            log.warn(
                    "[ Dataseed ]: Creating default admin user with username 'admin'. Please change the password immediately in production!");
            UserAccount admin = new UserAccount()
                    .setUsername("admin")
                    .setPasswordHash(PasswordUtils.hash("admin"))
                    .setRoles(List.of("ADMIN"))
                    .setEnabled(true);
            mongoTemplate.save(admin);
        }
    }

    @RollbackExecution
    public void rollback() {
        Query q = new Query(Criteria.where("username").is("admin"));
        mongoTemplate.remove(q, UserAccount.class);
    }
}
