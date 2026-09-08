package solutions.onz.platform.strato.creator.dataseed;

import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.domain.ResourceCategory;
import solutions.onz.platform.strato.creator.repositories.ResourceCategoryRepository;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "default-resource-categories", order = "005", author = "dataseed")
public class DefaultResourceCategoriesMigration {
    private final ResourceCategoryRepository resourceCategoryRepository;

    private List<ResourceCategory> loadResourceCategoriesFromResources() throws IOException {
        List<ResourceCategory> result = new ArrayList<>();
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath*:dataseed/resource_categories.json");
        ObjectMapper mapper = new ObjectMapper();
        for (Resource resource : resources) {
            try (InputStream is = resource.getInputStream()) {
                ResourceCategory[] rc = mapper.readValue(is, ResourceCategory[].class);
                if (rc != null) {
                    result.addAll(Arrays.stream(rc).map(c -> {
                        log.info("[ Dataseed ]: Loaded Resource Categories: {}", c.getName());
                        return c;
                    }).toList());
                }
            }
        }
        return result;

    }

    @Execution
    public void changeSet() throws IOException {
        List<ResourceCategory> resourceCategories = loadResourceCategoriesFromResources();
        for (ResourceCategory category : resourceCategories) {
            if (category == null) continue;
            boolean exists = resourceCategoryRepository.existsByName(category.getName());
            if (!exists) {
                resourceCategoryRepository.save(category);
                log.info("[ Dataseed ]: Inserted Resource Category: {}", category.getName());
            }
        }
    }

    @RollbackExecution
    public void rollback() throws IOException {
        List<ResourceCategory> categories = loadResourceCategoriesFromResources();
        for (ResourceCategory resourceCategory : categories) {
            if (resourceCategory == null) continue;
            Query query = new Query(Criteria.where("key").is(resourceCategory.getName()));
            resourceCategoryRepository.deleteById(resourceCategory.getId());
            log.warn("[ Dataseed Rollback ]: Deleted Resource Category: {}", resourceCategory.getName());
        }
    }
}
