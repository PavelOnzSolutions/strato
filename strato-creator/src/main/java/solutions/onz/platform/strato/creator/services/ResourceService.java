package solutions.onz.platform.strato.creator.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.ResourceCategory;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import solutions.onz.platform.strato.creator.repositories.ResourceCategoryRepository;
import solutions.onz.platform.strato.creator.repositories.ResourceRepository;
import com.microsoft.semantickernel.semanticfunctions.annotations.DefineKernelFunction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;

import solutions.onz.platform.strato.creator.utils.SecretFieldResolver;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Service class for managing resource class-related operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ResourceService {
    private final ResourceRepository resourceRepository;
    private final ResourceCategoryRepository resourceCategoryRepository;
    private final EncryptionService encryptionService;
    private final ObjectMapper objectMapper;
    private final MongoTemplate mongoTemplate;

    /**
     * Retrieves all resource classes, decrypting sensitive fields if necessary.
     *
     * @return List of decrypted resource classes
     */
    @Cacheable(value = "resources")
    @DefineKernelFunction(name = "list_resource_classes", description = "Lists all available resource classes/templates")
    @PreAuthorize("hasAnyAuthority('PERM_RESOURCE_READ', 'PERM_RESOURCE_WRITE')")
    public List<ResourceClass> findAllResources() {
        return resourceRepository.findAll().stream()
                .peek(this::decryptCredentialFields)
                .toList();
    }

    /**
     * Retrieves all resource classes, excluding sensitive and large data, for
     * compact listing wrapped in Pageable.
     * Supports optional filtering by type and category.
     *
     * @return Page of resource classes with metadata only
     */
    @Cacheable(value = "resources")
    @PreAuthorize("hasAnyAuthority('PERM_RESOURCE_READ', 'PERM_RESOURCE_WRITE')")
    public Page<ResourceClass> findAllResourcesCompactPaged(Pageable pageable, ResourceType type, String categoryId) {
        Query query = new Query();

        // Apply filters
        if (type != null) {
            query.addCriteria(Criteria.where("type").is(type));
        }
        if (categoryId != null && !categoryId.isBlank()) {
            query.addCriteria(Criteria.where("resourceCategory.$id").is(new org.bson.types.ObjectId(categoryId)));
        }

        // Exclude large/sensitive fields from the result
        query.fields()
                .exclude("catalogDefinition")
                .exclude("defaults")
                .exclude("inputMappings")
                .exclude("namingRule")
                .exclude("outputMappings")
                .exclude("outputs")
                .exclude("template");

        // Get total count for pagination
        long count = mongoTemplate.count(query, ResourceClass.class);

        // Early return if no results
        if (count == 0) {
            return PageableExecutionUtils.getPage(
                    List.of(),
                    pageable,
                    () -> 0L);
        }

        // Apply pagination and sorting
        query.with(pageable);

        // Execute query
        List<ResourceClass> resources = mongoTemplate.find(query, ResourceClass.class);

        return PageableExecutionUtils.getPage(
                resources,
                pageable,
                () -> count);
    }

    /**
     * Retrieves all resource classes, excluding sensitive and large data, for
     * compact listing.
     *
     * @return Page of resource classes with metadata only
     */
    @Cacheable(value = "resources")
    @DefineKernelFunction(name = "list_resource_classes_compact", description = "Lists all available resource classes/templates in a compact listing format (metadata-only)")
    @PreAuthorize("hasAnyAuthority('PERM_RESOURCE_READ', 'PERM_RESOURCE_WRITE')")
    public List<ResourceClass> findAllResourcesCompact() {
        return resourceRepository.findAllExcludeData();
    }

    /**
     * Retrieves a resource class by its unique identifier.
     * 
     * @param id
     * @return {@link ResourceClass}
     */
    @PreAuthorize("hasAnyAuthority(@permissions.RESOURCE_READ, @permissions.RESOURCE_WRITE)")
    @Cacheable(value = "resources", key = "#id")
    @DefineKernelFunction(name = "get_resource_class", description = "Gets a resource class by its unique identifier")
    public Optional<ResourceClass> findResourceById(String id) {
        return resourceRepository.findById(id)
                .map(rc -> {
                    decryptCredentialFields(rc);
                    return rc;
                });
    }

    /**
     * Retrieves a resource class by its unique identifier without decrypting
     * sensitive fields.
     * 
     * @param id
     * @return {@link Optional}
     */
    @PreAuthorize("hasAnyAuthority(@permissions.RESOURCE_READ, @permissions.RESOURCE_WRITE)")
    @DefineKernelFunction(name = "get_resource_class_no_decrypt", description = "Gets a resource class by its unique identifier without decrypting sensitive fields")
    public Optional<ResourceClass> findResourceByIdNoDecrypt(String id) {
        return resourceRepository.findById(id);
    }

    /**
     * Retrieves a resource class by its name.
     * 
     * @param name
     * @return
     */
    @Cacheable(value = "resources", key = "#name")
    public Optional<ResourceClass> findResourceByName(String name) {
        return resourceRepository.findByName(name)
                .map(rc -> {
                    decryptCredentialFields(rc);
                    return rc;
                });
    }

    /**
     * Retrieves a resource class by its type.
     * 
     * @param type
     * @return {@link List<ResourceClass>}
     */
    @Cacheable(value = "resources", key = "#type")
    public List<ResourceClass> findAllResourcesByType(ResourceType type) {
        return resourceRepository.findAllByType(type).stream()
                .peek(this::decryptCredentialFields)
                .toList();
    }

    /**
     * Creates a new resource class.
     * 
     * @param resourceClass
     * @return {@link ResourceClass}
     */
    @CacheEvict(value = "resources", allEntries = true)
    public ResourceClass createResource(ResourceClass resourceClass) {
        validateProcessResource(resourceClass);
        encryptCredentialFields(resourceClass, null);
        return resourceRepository.save(resourceClass);
    }

    /**
     * Updates an existing resource class.
     * 
     * @param id
     * @param resourceClass
     * @return {@link Optional<ResourceClass>}
     */
    @CacheEvict(value = "resources", allEntries = true)
    public Optional<ResourceClass> updateResource(String id, ResourceClass resourceClass) {
        // Ensure the path id is the persisted id
        resourceClass.setId(Objects.requireNonNull(id, "id"));
        if (resourceRepository.existsById(id)) {
            validateProcessResource(resourceClass);
            ResourceClass existing = resourceRepository.findById(id).orElse(null);
            encryptCredentialFields(resourceClass, existing);
            return Optional.of(resourceRepository.save(resourceClass));
        }
        return Optional.empty();
    }

    /**
     * Deletes a resource class by its unique identifier.
     * 
     * @param id
     */
    @CacheEvict(value = "resources", allEntries = true)
    public void deleteResource(String id) {
        resourceRepository.deleteById(id);
    }

    /**
     * Returns a copy of the ResourceClass with credential template fields masked.
     * Non-credential types are returned as-is (no copy). Safe to call on cached objects.
     */
    public ResourceClass maskCredentialFields(ResourceClass rc) {
        if (rc == null || rc.getTemplate() == null || !isCredentialType(rc.getType())) return rc;
        Map<String, Object> maskedTemplate = new HashMap<>(rc.getTemplate());
        for (String field : credentialFieldsFor(rc.getType())) {
            Object val = maskedTemplate.get(field);
            if (val instanceof String) {
                maskedTemplate.put(field, SecretFieldResolver.maskValue((String) val));
            }
        }
        ResourceClass copy = new ResourceClass();
        copy.setId(rc.getId())
            .setName(rc.getName())
            .setAbbreviation(rc.getAbbreviation())
            .setIcon(rc.getIcon())
            .setHelp(rc.getHelp())
            .setIsSystem(rc.getIsSystem())
            .setType(rc.getType())
            .setResourceCategory(rc.getResourceCategory())
            .setNamingRule(rc.getNamingRule())
            .setCatalogDefinition(rc.getCatalogDefinition())
            .setTemplate(maskedTemplate)
            .setDefaults(rc.getDefaults())
            .setOutputs(rc.getOutputs())
            .setInputMappings(rc.getInputMappings())
            .setOutputMappings(rc.getOutputMappings());
        return copy;
    }

    public List<ResourceClass> maskCredentialFields(List<ResourceClass> resources) {
        if (resources == null) return null;
        return resources.stream().map(this::maskCredentialFields).toList();
    }

    private boolean isCredentialType(ResourceType type) {
        return type == ResourceType.AZURE_CREDENTIAL
            || type == ResourceType.GITHUB_CREDENTIAL
            || type == ResourceType.BITBUCKET_CREDENTIAL
            || type == ResourceType.KUBERNETES_CLUSTER;
    }

    private List<String> credentialFieldsFor(ResourceType type) {
        return switch (type) {
            case AZURE_CREDENTIAL -> List.of("identifier", "secret", "tenantId");
            case GITHUB_CREDENTIAL, BITBUCKET_CREDENTIAL -> List.of("username", "pat");
            case KUBERNETES_CLUSTER -> List.of("kubeConfig");
            default -> List.of();
        };
    }

    private void encryptCredentialFields(ResourceClass resourceClass, ResourceClass existing) {
        if (resourceClass.getTemplate() == null || !isCredentialType(resourceClass.getType())) return;
        for (String field : credentialFieldsFor(resourceClass.getType())) {
            encryptField(resourceClass, existing, field);
        }
    }

    private void encryptField(ResourceClass rc, ResourceClass existing, String field) {
        Object val = rc.getTemplate().get(field);
        if (!(val instanceof String strVal)) return;
        if (strVal.startsWith("gcm.v1:")) {
            // already encrypted — leave it
        } else if (strVal.startsWith("***")) {
            if (existing == null || existing.getTemplate() == null) {
                throw new IllegalArgumentException(
                    "Masked value submitted for credential field '" + field + "' but no existing record found");
            }
            Object existingVal = existing.getTemplate().get(field);
            if (existingVal == null) {
                throw new IllegalArgumentException(
                    "Masked value submitted for credential field '" + field + "' but field not found in existing record");
            }
            rc.getTemplate().put(field, existingVal);
        } else {
            rc.getTemplate().put(field, encryptionService.encrypt(strVal));
        }
    }

    private void validateProcessResource(ResourceClass resourceClass) {
        if (resourceClass != null && resourceClass.getType() == ResourceType.PROCESS) {
            if (resourceClass.getTemplate() == null || !resourceClass.getTemplate().containsKey("workflowDefinition")) {
                throw new IllegalArgumentException("Resource of type PROCESS must have a 'workflowDefinition' attribute in its template");
            }
        }
    }

    private void decryptCredentialFields(ResourceClass resourceClass) {
        if (resourceClass.getType() == ResourceType.AZURE_CREDENTIAL && resourceClass.getTemplate() != null) {
            Object identifier = resourceClass.getTemplate().get("identifier");
            if (identifier instanceof String) {
                resourceClass.getTemplate().put("identifier", encryptionService.decrypt((String) identifier));
            }
            Object secret = resourceClass.getTemplate().get("secret");
            if (secret instanceof String) {
                resourceClass.getTemplate().put("secret", encryptionService.decrypt((String) secret));
            }
            Object tenantId = resourceClass.getTemplate().get("tenantId");
            if (tenantId instanceof String) {
                resourceClass.getTemplate().put("tenantId", encryptionService.decrypt((String) tenantId));
            }
        }
        if (resourceClass.getType() == ResourceType.GITHUB_CREDENTIAL && resourceClass.getTemplate() != null) {
            Object username = resourceClass.getTemplate().get("username");
            if (username instanceof String) {
                resourceClass.getTemplate().put("username", encryptionService.decrypt((String) username));
            }
            Object pat = resourceClass.getTemplate().get("pat");
            if (pat instanceof String) {
                resourceClass.getTemplate().put("pat", encryptionService.decrypt((String) pat));
            }
        }
        if (resourceClass.getType() == ResourceType.BITBUCKET_CREDENTIAL && resourceClass.getTemplate() != null) {
            Object username = resourceClass.getTemplate().get("username");
            if (username instanceof String) {
                resourceClass.getTemplate().put("username", encryptionService.decrypt((String) username));
            }
            Object pat = resourceClass.getTemplate().get("pat");
            if (pat instanceof String) {
                resourceClass.getTemplate().put("pat", encryptionService.decrypt((String) pat));
            }
        }
        if (resourceClass.getType() == ResourceType.KUBERNETES_CLUSTER && resourceClass.getTemplate() != null) {
            Object kubeConfig = resourceClass.getTemplate().get("kubeConfig");
            if (kubeConfig instanceof String) {
                resourceClass.getTemplate().put("kubeConfig", encryptionService.decrypt((String) kubeConfig));
            }
        }
    }

    @PreAuthorize("hasAnyAuthority(@permissions.RESOURCE_READ, @permissions.RESOURCE_WRITE)")
    @Cacheable(value = "resourceCategories")
    @DefineKernelFunction(name = "list_resource_categories", description = "Lists all resource categories")
    public List<ResourceCategory> list_resource_categories() {
        return findAllResourceCategories();
    }

    public List<ResourceCategory> findAllResourceCategories() {
        return resourceCategoryRepository.findAll();
    }

    @Cacheable(value = "resourceCategories", key = "#id")
    public Optional<ResourceCategory> findResourceCategoryById(String id) {
        return resourceCategoryRepository.findById(id);
    }

    /**
     * Creates a new ResourceCategory and saves it to the repository.
     * 
     * @param category
     * @return
     */
    @CacheEvict(value = "resourceCategories", allEntries = true)
    public ResourceCategory createResourceCategory(ResourceCategory category) {
        return resourceCategoryRepository.save(category);
    }

    /**
     * Updates an existing ResourceCategory identified by its ID. If the ID exists
     * in
     * the repository, the ResourceCategory will be updated and saved; otherwise, an
     * empty Optional is returned.
     *
     * @param id       the ID of the ResourceCategory to be updated
     * @param category the updated ResourceCategory object
     * @return an Optional containing the updated ResourceCategory if the ID exists,
     *         otherwise an empty Optional
     */
    @CacheEvict(value = "resourceCategories", allEntries = true)
    public Optional<ResourceCategory> updateResourceCategory(String id, ResourceCategory category) {
        category.setId(Objects.requireNonNull(id, "id"));
        return resourceCategoryRepository.existsById(id) ? Optional.of(resourceCategoryRepository.save(category))
                : Optional.empty();
    }

    /**
     * Deletes a ResourceCategory by its identifier. If the ResourceCategory is
     * referenced by existing Resources, an exception is thrown.
     *
     * @param id the ID of the ResourceCategory to be deleted
     * @throws
     */
    @CacheEvict(value = { "resourceCategories", "resources" }, allEntries = true)
    public void deleteResourceCategory(String id) throws Exception {
        if (resourceRepository.existsAllByResourceCategory_Id(id))
            throw new Exception("Cannot delete ResourceCategory as it is referenced by existing Resources");
        resourceCategoryRepository.deleteById(id);
    }
}
