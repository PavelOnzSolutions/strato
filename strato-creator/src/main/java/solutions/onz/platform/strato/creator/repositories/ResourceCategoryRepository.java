package solutions.onz.platform.strato.creator.repositories;

import solutions.onz.platform.strato.creator.domain.ResourceCategory;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ResourceCategoryRepository extends MongoRepository<ResourceCategory, String> {
    Boolean existsByName(String name);
    Optional<ResourceCategory> findByKey(String key);
    Optional<ResourceCategory> findByName(String name);
}
