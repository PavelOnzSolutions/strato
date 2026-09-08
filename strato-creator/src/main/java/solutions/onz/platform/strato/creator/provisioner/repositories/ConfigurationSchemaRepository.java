package solutions.onz.platform.strato.creator.provisioner.repositories;

import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfigurationSchemaRepository extends MongoRepository<ConfigurationSchema, String> {
}
