package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.repositories.ResourceRepository;
import io.mongock.api.annotations.ChangeUnit;
import io.mongock.api.annotations.Execution;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

/**
 * Optimistic Icon path fix for Resources - Assuming all resources without subfolder were created prior the FE change and thus, belong to "azure" subfolder
 */
@Slf4j
@RequiredArgsConstructor
@ChangeUnit(id = "class-icon-categories-icon-fix", order = "013", author = "dataseed")
public class ClassIconCategoriesIconFix {
    private final ResourceRepository resourceRepository;

    @Execution
    public void execution() {
        List<ResourceClass> resourceClasses = resourceRepository.findAll();
        List<String> subdirs = List.of("azure/", "aws/", "kubernetes/", "generics/");

        for (ResourceClass resourceClass : resourceClasses) {
            String icon = resourceClass.getIcon();
            if (icon != null && !icon.isBlank()) {
                boolean hasPrefix = subdirs.stream().anyMatch(icon::startsWith);
                if (!hasPrefix) {
                    resourceClass.setIcon("azure/" + icon);
                    resourceRepository.save(resourceClass);
                    log.info("[ Dataseed ]: Updated icon for Resource Class '{}': {} -> {}",
                            resourceClass.getName(), icon, resourceClass.getIcon());
                }
            }
        }
    }

    @RollbackExecution
    public void rollback() {
        // Rollback might be complex if we don't know which were changed.
        // For this fix, we assume it's safe to not have a full rollback or it's a one-way fix.
    }
}
