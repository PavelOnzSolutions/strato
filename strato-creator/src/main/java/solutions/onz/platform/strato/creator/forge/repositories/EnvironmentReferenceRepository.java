package solutions.onz.platform.strato.creator.forge.repositories;

import solutions.onz.platform.strato.creator.forge.domain.EnvironmentReference;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EnvironmentReferenceRepository extends MongoRepository<EnvironmentReference, String> {
}
