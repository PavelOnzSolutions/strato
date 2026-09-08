package solutions.onz.platform.strato.creator.dataseed;

import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.ResourceCategory;
import solutions.onz.platform.strato.creator.repositories.ResourceCategoryRepository;
import solutions.onz.platform.strato.creator.repositories.ResourceRepository;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "default-resource-classes", order = "006", author = "dataseed")
public class DefaultResourceClassesMigration {
    private final ResourceRepository resourceRepository;
    private final ResourceCategoryRepository resourceCategoryRepository;

    private List<ResourceClass> loadResourceClassesFromResources() throws IOException {
        List<ResourceClass> result = new ArrayList<>();
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath*:dataseed/resources_azure.json");
        ObjectMapper mapper = new ObjectMapper();
        for (Resource resource : resources) {
            try (InputStream is = resource.getInputStream()) {
                ResourceClass[] rc = mapper.readValue(is, ResourceClass[].class);
                if (rc != null) {
                    result.addAll(Arrays.stream(rc).map(c -> {
                        log.info("[ Dataseed ]: Loaded Resource Class: {}", c.getName());
                        return c;
                    }).toList());
                }
            }
        }
        return result;

    }

    @Execution
    public void changeSet() throws IOException {
        List<ResourceClass> resourceClasses = loadResourceClassesFromResources();
        for (ResourceClass resClass : resourceClasses) {
            if (resClass == null) continue;

            // Resolve DBRef: find ResourceCategory by key from JSON and attach the persisted entity with id
            ResourceCategory jsonCategory = resClass.getResourceCategory();
            if (jsonCategory != null) {
                String key = jsonCategory.getKey();
                if (key != null && !key.isBlank()) {
                    Optional<ResourceCategory> persisted = resourceCategoryRepository.findByKey(key);
                    if (persisted.isPresent()) {
                        resClass.setResourceCategory(persisted.get());
                    } else {
                        log.warn("[ Dataseed ]: ResourceCategory with key '{}' not found for Resource Class '{}'. Trying name '{}'.", key, resClass.getName(), jsonCategory.getName());
                        Optional<ResourceCategory> persistedByName = resourceCategoryRepository.findByName(jsonCategory.getName());
                        if (persistedByName.isPresent()) {
                            resClass.setResourceCategory(persistedByName.get());
                        } else {
                            log.warn("[ Dataseed ]: Skipping Resource Class '{}' because ResourceCategory was not found.", resClass.getName());
                            continue;
                        }
                    }
                } else {
                    // If present but no key, avoid saving invalid DBRef
                    log.warn("[ Dataseed ]: Skipping Resource Class '{}' due to missing ResourceCategory key.", resClass.getName());
                    continue;
                }
            }

            boolean exists = resourceRepository.existsByName(resClass.getName());
            if (!exists) {
                resourceRepository.save(resClass);
                log.info("[ Dataseed ]: Inserted Resource Class: {}", resClass.getName());
            }
        }
    }

    @RollbackExecution
    public void rollback() throws IOException {
        List<ResourceClass> classes = loadResourceClassesFromResources();
        for (ResourceClass resourceClass : classes) {
            if (resourceClass == null) continue;
            // Best-effort rollback by name if present in DB
            try {
                // We don't have a findByName; rely on existsByName and deleteById when id known
                if (resourceClass.getId() != null) {
                    resourceRepository.deleteById(resourceClass.getId());
                    log.warn("[ Dataseed Rollback ]: Deleted Resource Class by id: {}", resourceClass.getName());
                }
            } catch (Exception e) {
                log.warn("[ Dataseed Rollback ]: Could not delete Resource Class '{}': {}", resourceClass.getName(), e.getMessage());
            }
        }
    }
}
