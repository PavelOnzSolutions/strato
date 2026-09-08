package solutions.onz.platform.strato.creator.repositories;

import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ResourceRepository extends MongoRepository<ResourceClass, String> {
    boolean existsAllByResourceCategory_Id(String resourceCategoryId);

    boolean existsByName(String name);
    Optional<ResourceClass> findByName(String name);
    List<ResourceClass> findAllByType(ResourceType type);

    @Query(value = "{}", fields = "{ 'catalogDefinition': 0, 'defaults': 0, 'inputMappings': 0, 'namingRule': 0, 'outputMappings': 0, 'outputs': 0, 'template': 0 }")
    List<ResourceClass> findAllExcludeData();

    @Query(value = "{}", fields = "{ 'catalogDefinition': 0, 'defaults': 0, 'inputMappings': 0, 'namingRule': 0, 'outputMappings': 0, 'outputs': 0, 'template': 0 }")
    Page<ResourceClass> findAllExcludeData(Pageable pageable);

}
