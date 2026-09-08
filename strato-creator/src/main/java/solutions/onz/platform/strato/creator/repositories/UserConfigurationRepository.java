package solutions.onz.platform.strato.creator.repositories;

import solutions.onz.platform.strato.creator.domain.UserConfiguration;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserConfigurationRepository extends MongoRepository<UserConfiguration, String> {
    void deleteByName(String name);

    Optional<UserConfiguration> findByName(String name );
}
