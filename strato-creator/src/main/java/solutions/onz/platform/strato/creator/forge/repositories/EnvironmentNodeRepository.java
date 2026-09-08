package solutions.onz.platform.strato.creator.forge.repositories;

import solutions.onz.platform.strato.creator.forge.domain.EnvironmentNode;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EnvironmentNodeRepository extends MongoRepository<EnvironmentNode, String> {
}
