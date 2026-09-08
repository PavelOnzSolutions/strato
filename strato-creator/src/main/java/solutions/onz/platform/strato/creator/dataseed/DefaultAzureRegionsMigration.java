package solutions.onz.platform.strato.creator.dataseed;

import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.domain.ResourceCategory;
import solutions.onz.platform.strato.creator.domain.ResourceClass;
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
@ChangeUnit(id = "default-azure-regions", order = "007", author = "dataseed")
public class DefaultAzureRegionsMigration {
    private final ResourceRepository resourceRepository;
    private final ResourceCategoryRepository resourceCategoryRepository;

    private List<ResourceClass> loadAzureRegionResources() throws IOException {
        List<ResourceClass> result = new ArrayList<>();
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath*:dataseed/regions_azure.json");
        ObjectMapper mapper = new ObjectMapper();
        for (Resource resource : resources) {
            try (InputStream is = resource.getInputStream()) {
                ResourceClass[] rc = mapper.readValue(is, ResourceClass[].class);
                if (rc != null) {
                    result.addAll(Arrays.stream(rc).peek(c -> log.info("[ Dataseed ]: Loaded Region Resource Class: {}", c.getName())).toList());
                }
            }
        }
        return result;

    }

    @Execution
    public void changeSet() throws IOException {
        List<ResourceClass> resourceClasses = loadAzureRegionResources();
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
                        log.warn("[ Dataseed ]: Skipping Region Resource Class '{}' because ResourceCategory with key '{}' was not found.", resClass.getName(), key);
                        continue;
                    }
                } else {
                    // If present but no key, avoid saving invalid DBRef
                    log.warn("[ Dataseed ]: Skipping Region Resource Class '{}' due to missing ResourceCategory key.", resClass.getName());
                    continue;
                }
            }

            boolean exists = resourceRepository.existsByName(resClass.getName());
            if (!exists) {
                resourceRepository.save(resClass);
                log.info("[ Dataseed ]: Inserted Region Resource Class: {}", resClass.getName());
            }
        }
    }

    @RollbackExecution
    public void rollback() throws IOException {
        List<ResourceClass> classes = loadAzureRegionResources();
        for (ResourceClass resourceClass : classes) {
            if (resourceClass == null) continue;
            // Best-effort rollback by name if present in DB
            try {
                // We don't have a findByName; rely on existsByName and deleteById when id known
                if (resourceClass.getId() != null) {
                    resourceRepository.deleteById(resourceClass.getId());
                    log.warn("[ Dataseed Rollback ]: Deleted Region by id: {}", resourceClass.getName());
                }
            } catch (Exception e) {
                log.warn("[ Dataseed Rollback ]: Could not delete Region Resource Class '{}': {}", resourceClass.getName(), e.getMessage());
            }
        }
    }
}
