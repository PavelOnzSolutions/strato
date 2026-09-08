package solutions.onz.platform.strato.creator.repositories;

import solutions.onz.platform.strato.creator.domain.UserAccount;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserAccountRepository extends MongoRepository<UserAccount, String> {
    Optional<UserAccount> findByUsername(String username);

    Optional<UserAccount> findByEmail(String email);

    void deleteByUsername(String username);
}
