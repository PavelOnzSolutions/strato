package solutions.onz.platform.strato.creator.forge.repositories;

import solutions.onz.platform.strato.creator.forge.domain.EnvironmentConfig;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EnvironmentConfigRepository extends MongoRepository<EnvironmentConfig, String> {
}
