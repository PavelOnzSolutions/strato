package solutions.onz.platform.strato.creator.repositories;

import solutions.onz.platform.strato.creator.domain.DirectoryConfig;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface DirectoryConfigRepository extends MongoRepository<DirectoryConfig, String> {
}
