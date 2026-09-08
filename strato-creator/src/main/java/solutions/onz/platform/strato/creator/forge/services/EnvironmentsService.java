package solutions.onz.platform.strato.creator.forge.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.domain.*;
import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import solutions.onz.platform.strato.creator.forge.domain.Environment;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentConfig;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentNode;
import solutions.onz.platform.strato.creator.forge.domain.EnvironmentReference;
import solutions.onz.platform.strato.creator.services.EncryptionService;
import solutions.onz.platform.strato.creator.services.ResourceService;
import solutions.onz.platform.strato.creator.forge.services.dto.DeploymentPlan;
import solutions.onz.platform.strato.creator.repositories.DeploymentVersionMatrixRepository;
import solutions.onz.platform.strato.creator.forge.repositories.EnvironmentConfigRepository;
import solutions.onz.platform.strato.creator.forge.repositories.EnvironmentNodeRepository;
import solutions.onz.platform.strato.creator.forge.repositories.EnvironmentReferenceRepository;
import solutions.onz.platform.strato.creator.forge.repositories.EnvironmentRepository;
import solutions.onz.platform.strato.creator.forge.services.dto.EnvironmentImportDtos;
import com.microsoft.semantickernel.semanticfunctions.annotations.DefineKernelFunction;
import com.microsoft.semantickernel.semanticfunctions.annotations.KernelFunctionParameter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import solutions.onz.platform.strato.creator.configuration.VersioningMongoEventListener;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Caching;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EnvironmentsService {

    private final EnvironmentRepository environmentRepository;
    private final EnvironmentConfigRepository configRepository;
    private final EnvironmentNodeRepository nodeRepository;
    private final EnvironmentReferenceRepository referenceRepository;
    private final EncryptionService encryptionService;
    private final ResourceService resourceService;
    private final DeploymentVersionMatrixRepository matrixRepository;
    private final ObjectMapper objectMapper;
    private final AzureResourceManagerService azureResourceManagerService;

    private static final Pattern PLACEHOLDER_PATTERN = Pattern
            .compile("\\{\\{\\s*([\\w.-]+)(?::(string|object)!)?(?::[\\w.-]+)?\\s*}}");


    /**
     * Imports resources from a specified resource group based on the provided import request.
     * The method processes the source of discovery, retrieves the resources, and attempts
     * to match them with existing templates.
     *
     * @param request The import request containing the source of discovery and optional environment configuration details.
     * @return An {@code EnvironmentImportDtos.ImportResult} containing details about the imported resources,
     *         matched resources, unmatched resources, and a message indicating the status or guidance for further actions.
     */
    @PreAuthorize("hasAuthority('PERM_ENVIRONMENT_WRITE')")
    @DefineKernelFunction(name = "import_from_resource_group", description = "Imports resources from a specified Azure resource group")
    public EnvironmentImportDtos.ImportResult importFromResourceGroup(
            EnvironmentImportDtos.ImportRequest request) {
        var source = request.getSource();
        var result = EnvironmentImportDtos.ImportResult.builder().build();
        if (source == null) {
            result.setMessage("Choose source for discovery: ARM (faster, infra resources) vs Graph API Resource Map (for Entra/Graph objects). Provide 'source' in request to proceed.");
            return result;
        }
        result.setSourceUsed(source);
        // Currently only ARM listing is implemented. GRAPH is a placeholder suggestion.
        var envCfg = request.toEnvConfig();
        List<EnvironmentImportDtos.ImportedItem> items =
                source == EnvironmentImportDtos.ImportSource.ARM
                        ? azureResourceManagerService.listResourceGroupResources(envCfg)
                        : List.of();
        result.setItems(items);

        // Build lookup map from ResourceClass templates by type
        List<ResourceClass> all = resourceService.findAllResourcesByType(ResourceType.AZURE_RESOURCE);
        Map<String, List<ResourceClass>> byType = new HashMap<>();
        for (var rc : all) {
            Object t = rc.getTemplate() != null ? rc.getTemplate().get("type") : null;
            if (t != null) {
                String typeKey = String.valueOf(t).toLowerCase(java.util.Locale.ROOT);
                byType.computeIfAbsent(typeKey, key -> new ArrayList<>()).add(rc);
            }
        }

        List<EnvironmentImportDtos.ImportedItem> unmatched = new ArrayList<>();
        List<EnvironmentImportDtos.ImportMatch> matches = new ArrayList<>();
        for (var it : items) {
            String itType = it.getType() != null ? it.getType().toLowerCase(Locale.ROOT) : null;
            if (itType == null) {
                unmatched.add(it);
                continue;
            }

            List<ResourceClass> candidates = byType.getOrDefault(itType, List.of());
            ResourceClass bestMatch = null;
            double maxConfidence = 0.0;

            String itApi = it.getApiVersion() != null ? it.getApiVersion() : "";
            String itKind = it.getKind() != null ? it.getKind().toLowerCase(Locale.ROOT) : "";

            for (var rc : candidates) {
                if (rc.getTemplate() == null) continue;
                Object v = rc.getTemplate().get("apiVersion");
                Object k = rc.getTemplate().get("kind");
                String rcApi = v != null ? String.valueOf(v) : "";
                String rcKind = k != null ? String.valueOf(k).toLowerCase(Locale.ROOT) : "";

                double confidence = 0.7; // Base confidence for same type
                boolean apiMatch = itApi.equals(rcApi);
                boolean kindMatch = itKind.equals(rcKind);

                if (apiMatch && kindMatch) {
                    confidence = 1.0;
                } else if (apiMatch && !itApi.isEmpty()) {
                    confidence = 0.9;
                } else if (kindMatch && !itKind.isEmpty()) {
                    confidence = 0.8;
                }

                if (confidence > maxConfidence) {
                    maxConfidence = confidence;
                    bestMatch = rc;
                }
            }

            if (bestMatch != null) {
                matches.add(EnvironmentImportDtos.ImportMatch.builder()
                        .imported(it)
                        .matchedResourceId(bestMatch.getId())
                        .matchedResourceName(bestMatch.getName())
                        .confidence(maxConfidence)
                        .build());
            } else {
                unmatched.add(it);
            }
        }
        result.setMatches(matches);
        result.setUnmatched(unmatched);
        result.setDetectedReferences(detectReferences(items));

        if (source == EnvironmentImportDtos.ImportSource.ARM) {
            result.setMessage("Imported from ARM. If you expected Entra/Graph objects (apps, users, groups), rerun with source=GRAPH to use Graph API Resource Map.");
        }
        return result;
    }

    @PreAuthorize("hasAnyAuthority(@permissions.ENVIRONMENT_READ, @permissions.ENVIRONMENT_WRITE)")
    @Cacheable(value = "environments")
    @DefineKernelFunction(name = "list_environments", description = "Lists all environments in the system")
    public List<Environment> list_environments() {
        return findAllLatestVersions();
    }

    public List<Environment> findAll() {
        return environmentRepository.findAll();
    }

    @PreAuthorize("hasAnyAuthority(@permissions.ENVIRONMENT_READ, @permissions.ENVIRONMENT_WRITE)")
    @Cacheable(value = "environments", key = "#id")
    @DefineKernelFunction(name = "get_environment", description = "Gets an environment by its unique identifier")
    public Optional<Environment> findById(String id) {
        return environmentRepository.findById(id).map(this::processEnvironmentOut);
    }

    /**
     * Finds the latest version of an environment by its name.
     *
     * @param name Name of the environment
     * @return Optional containing the latest non-deleted environment if found
     */
    public Optional<Environment> findByName(String name) {
        return environmentRepository.findByName(name).stream()
                .filter(env -> env.getDeleted() == null || !env.getDeleted())
                .max(Comparator.comparing(Environment::getVersion))
                .map(this::processEnvironmentOut);
    }

    /**
     * Creates a new environment entity by validating its name and saving
     * its configuration, nodes, and references to the respective repositories
     * before persisting the environment to the environment repository.
     *
     * @param env the environment entity to be created, including its configuration,
     *            nodes, and references, if any.
     * @return the persisted environment entity with all associated data stored.
     * @throws IllegalArgumentException if an environment with the same name already exists.
     */
    @PreAuthorize("hasAuthority(@permissions.ENVIRONMENT_WRITE)")
    @CacheEvict(value = { "environments", "environments_latest" }, allEntries = true)
    @DefineKernelFunction(name = "create_environment", description = "Creates a new environment entity")
    public Environment create(@KernelFunctionParameter(name = "environment", type = Environment.class) Environment env) {
        if (environmentRepository.existsByName(env.getName())) {
            throw new IllegalArgumentException("Environment with name '" + env.getName() + "' already exists");
        }
        processEnvironmentIn(env);
        if (env.getConfig() != null) {
            env.setConfig(configRepository.save(env.getConfig()));
        }
        if (env.getNodes() != null && !env.getNodes().isEmpty()) {
            env.setNodes(nodeRepository.saveAll(env.getNodes()));
        }
        if (env.getReferences() != null && !env.getReferences().isEmpty()) {
            env.setReferences(referenceRepository.saveAll(env.getReferences()));
        }
        return processEnvironmentOut(environmentRepository.save(env));
    }

    /**
     * Updates an existing environment with the provided details. The method ensures that
     * the environment's configuration, nodes, and references are updated based on the
     * provided input. Any existing nodes or references not present in the update will
     * be removed. Additionally, the method allows toggling the soft delete status.
     *
     * @param id the unique identifier of the environment to update
     * @param env the environment object containing updates to apply; may include updates
     *            to the environment's name, configuration, nodes, references, or
     *            soft delete status
     * @return an {@code Optional} containing the updated environment, or an empty
     *         {@code Optional} if the environment with the specified ID was not found
     */
    @PreAuthorize("hasAuthority(@permissions.ENVIRONMENT_WRITE)")
    @CacheEvict(value = { "environments", "environments_latest" }, allEntries = true)
    @DefineKernelFunction(name = "update_environment", description = "Updates an existing environment")
    public Optional<Environment> update(String id, Environment env) {
        processEnvironmentIn(env); // Encrypt incoming nodes before saving them
        return environmentRepository.findById(id).map(existing -> {
            // Update Config
            if (env.getConfig() != null) {
                env.setConfig(configRepository.save(env.getConfig()));
            }

            // Update Nodes
            if (env.getNodes() != null) {
                Set<String> newNodeIds = env.getNodes().stream()
                        .map(EnvironmentNode::getId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());
                if (existing.getNodes() != null) {
                    List<EnvironmentNode> orphans = existing.getNodes().stream()
                            .filter(n -> !newNodeIds.contains(n.getId()))
                            .collect(Collectors.toList());
                    if (!orphans.isEmpty()) {
                        nodeRepository.deleteAll(orphans);
                    }
                }
                env.setNodes(nodeRepository.saveAll(env.getNodes()));
            }

            // Update References
            if (env.getReferences() != null) {
                Set<String> newRefIds = env.getReferences().stream()
                        .map(EnvironmentReference::getId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());
                if (existing.getReferences() != null) {
                    List<EnvironmentReference> orphans = existing.getReferences().stream()
                            .filter(r -> !newRefIds.contains(r.getId()))
                            .collect(Collectors.toList());
                    if (!orphans.isEmpty()) {
                        referenceRepository.deleteAll(orphans);
                    }
                }
                env.setReferences(referenceRepository.saveAll(env.getReferences()));
            }

            if (env.getName() != null) {
                existing.setName(env.getName());
            }

            // For PUT semantics, replace provided structures (may be null)
            existing.setConfig(env.getConfig());
            existing.setNodes(env.getNodes());
            existing.setReferences(env.getReferences());

            // Allow soft delete toggle on update if provided
            if (env.getDeleted() != null) {
                existing.setDeleted(env.getDeleted());
            }

            return processEnvironmentOut(environmentRepository.save(existing));
        });
    }

    @Caching(
        evict = { @CacheEvict(value = { "environments", "environments_latest" }, allEntries = true, beforeInvocation = true) },
        put = { @CachePut(value = "environments", key = "#id", unless = "#result == null") }
    )
    @PreAuthorize("hasAuthority(@permissions.ENVIRONMENT_WRITE)")
    @DefineKernelFunction(name = "patch_environment", description = "Partially updates an existing environment with non-null fields")
    public Optional<Environment> patch(String id, Environment changes) {
        processEnvironmentIn(changes); // Encrypt incoming changes before saving them
        return environmentRepository.findById(id).map(existing -> {
            // Only apply non-null fields
            if (changes.getName() != null) {
                existing.setName(changes.getName());
            }
            if (changes.getConfig() != null) {
                if (existing.getConfig() != null) {
                    EnvironmentConfig existingConfig = existing.getConfig();
                    EnvironmentConfig changeConfig = changes.getConfig();
                    if (changeConfig.getSubscriptionId() != null) {
                        existingConfig.setSubscriptionId(changeConfig.getSubscriptionId());
                    }
                    if (changeConfig.getAzureCredentialId() != null) {
                        existingConfig.setAzureCredentialId(changeConfig.getAzureCredentialId());
                    }
                    if (changeConfig.getRegion() != null) {
                        existingConfig.setRegion(changeConfig.getRegion());
                    }
                    if (changeConfig.getResourceGroup() != null) {
                        existingConfig.setResourceGroup(changeConfig.getResourceGroup());
                    }
                    if (changeConfig.getValues() != null && !changeConfig.getValues().isEmpty()) {
                        if (existingConfig.getValues() == null) {
                            existingConfig.setValues(new HashMap<>(changeConfig.getValues()));
                        } else {
                            existingConfig.getValues().putAll(changeConfig.getValues());
                        }
                    }
                    existing.setConfig(configRepository.save(existingConfig));
                } else {
                    existing.setConfig(configRepository.save(changes.getConfig()));
                }
            }
            if (changes.getNodes() != null) {
                Set<String> newNodeIds = changes.getNodes().stream()
                        .filter(Objects::nonNull)
                        .map(EnvironmentNode::getId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());
                if (existing.getNodes() != null) {
                    List<EnvironmentNode> orphans = existing.getNodes().stream()
                            .filter(n -> n != null && !newNodeIds.contains(n.getId()))
                            .collect(Collectors.toList());
                    if (!orphans.isEmpty()) {
                        nodeRepository.deleteAll(orphans);
                    }
                }
                existing.setNodes(nodeRepository.saveAll(changes.getNodes().stream()
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList())));
            }
            if (changes.getReferences() != null) {
                Set<String> newRefIds = changes.getReferences().stream()
                        .filter(Objects::nonNull)
                        .map(EnvironmentReference::getId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());
                if (existing.getReferences() != null) {
                    List<EnvironmentReference> orphans = existing.getReferences().stream()
                            .filter(r -> r != null && !newRefIds.contains(r.getId()))
                            .collect(Collectors.toList());
                    if (!orphans.isEmpty()) {
                        referenceRepository.deleteAll(orphans);
                    }
                }
                existing.setReferences(referenceRepository.saveAll(changes.getReferences().stream()
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList())));
            }
            if (changes.getDeleted() != null) {
                existing.setDeleted(changes.getDeleted());
            }
            return processEnvironmentOut(environmentRepository.save(existing));
        });
    }

    @PreAuthorize("hasAnyAuthority({@permissions.ENVIRONMENT_WRITE, @permissions.ENVIRONMENT_READ})")
    @CacheEvict(value = { "environments", "environments_latest" }, allEntries = true)
    @DefineKernelFunction(name = "delete_environment", description = "Deletes an environment by its ID")
    public void delete(String id) {
        environmentRepository.findById(id).ifPresent(env -> {
            if (env.getConfig() != null) {
                configRepository.delete(env.getConfig());
            }
            if (env.getNodes() != null) {
                nodeRepository.deleteAll(env.getNodes());
            }
            if (env.getReferences() != null) {
                referenceRepository.deleteAll(env.getReferences());
            }
            matrixRepository.deleteAllByEnvironmentId(id);
            environmentRepository.delete(env);
        });
    }

    @PreAuthorize("hasAuthority(@permissions.ENVIRONMENT_WRITE)")
    @CacheEvict(value = { "environments", "environments_latest" }, allEntries = true)
    public Environment restore(String id) {
        Environment source = environmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Environment not found: " + id));

        // Deep copy nodes
        List<EnvironmentNode> newNodes = new ArrayList<>();
        if (source.getNodes() != null) {
            newNodes = source.getNodes().stream()
                    .map(node -> EnvironmentNode.builder()
                            .key(node.getKey())
                            .label(node.getLabel())
                            .resourceClassId(node.getResourceClassId())
                            .values(node.getValues() != null ? new HashMap<>(node.getValues()) : null)
                            .build())
                    .collect(Collectors.toList());
            newNodes = nodeRepository.saveAll(newNodes);
        }

        // Deep copy references
        List<EnvironmentReference> newRefs = new ArrayList<>();
        if (source.getReferences() != null) {
            newRefs = source.getReferences().stream()
                    .map(ref -> EnvironmentReference.builder()
                            .fromNode(ref.getFromNode())
                            .fromAttribute(ref.getFromAttribute())
                            .toNode(ref.getToNode())
                            .toAttribute(ref.getToAttribute())
                            .build())
                    .collect(Collectors.toList());
            newRefs = referenceRepository.saveAll(newRefs);
        }

        // Create new Environment version
        Environment newEnv = Environment.builder()
                .name(source.getName())
                // Reuse config reference directly? Or deep copy config?
                // Usually config is shared or versioned separately?
                // Based on Environment.java, config is @DBRef.
                // If we want total independence, we should copy config too if it's mutable
                // per-version.
                // Assuming Config is part of the "snapshot", let's deep copy it to be safe.
                .config(source.getConfig() != null ? configRepository.save(
                        source.getConfig().toBuilder().id(null).build()) : null)
                .nodes(newNodes)
                .references(newRefs)
                .build();

        newEnv.setDocumentId(source.getDocumentId());
        // Listener will handle version increment and deleted=false defaults

        return processEnvironmentOut(environmentRepository.save(newEnv));
    }

    /**
     * Clones an environment by its latest version, creating a completely
     * independent copy
     * with a new documentId and version reset to 1.
     * 
     * @param id        The ID of the environment to clone (will fetch latest
     *                  version)
     * @param newName   The name for the cloned environment
     * @param newConfig The configuration for the cloned environment
     * @return The newly created cloned environment
     */
    @CacheEvict(value = { "environments", "environments_latest" }, allEntries = true)
    @PreAuthorize("hasAuthority(@permissions.ENVIRONMENT_WRITE)")
    public Environment clone(String id, String newName, EnvironmentConfig newConfig) {
        // Fetch the latest version of the environment by its ID
        Environment source = environmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Environment not found: " + id));

        // Deep copy nodes
        List<EnvironmentNode> newNodes = new ArrayList<>();
        if (source.getNodes() != null) {
            newNodes = source.getNodes().stream()
                    .map(node -> EnvironmentNode.builder()
                            .key(node.getKey())
                            .label(node.getLabel())
                            .resourceClassId(node.getResourceClassId())
                            .values(node.getValues() != null ? new HashMap<>(node.getValues()) : null)
                            .build())
                    .collect(Collectors.toList());
            newNodes = nodeRepository.saveAll(newNodes);
        }

        // Deep copy references
        List<EnvironmentReference> newRefs = new ArrayList<>();
        if (source.getReferences() != null) {
            newRefs = source.getReferences().stream()
                    .map(ref -> EnvironmentReference.builder()
                            .fromNode(ref.getFromNode())
                            .fromAttribute(ref.getFromAttribute())
                            .toNode(ref.getToNode())
                            .toAttribute(ref.getToAttribute())
                            .build())
                    .collect(Collectors.toList());
            newRefs = referenceRepository.saveAll(newRefs);
        }

        // Save the new config (deep copy)
        EnvironmentConfig savedConfig = null;
        if (newConfig != null) {
            savedConfig = configRepository.save(newConfig);
        }

        // Create new Environment with new documentId (will be auto-generated) and
        // version 1
        Environment newEnv = Environment.builder()
                .name(newName)
                .config(savedConfig)
                .nodes(newNodes)
                .references(newRefs)
                .build();

        // Do NOT set documentId - let the versioning listener generate a new one
        // This ensures version starts at 1 for this new independent environment

        return processEnvironmentOut(environmentRepository.save(newEnv));
    }

    @PreAuthorize("hasAnyAuthority({@permissions.ENVIRONMENT_WRITE, @permissions.ENVIRONMENT_READ})")
    public List<Environment> findAllVersions(UUID documentId) {
        return environmentRepository.findAllByDocumentId(documentId);
    }

    /**
     * Hard-deletes all versions of the document and their linked entities,
     * bypassing versioning listener.
     */
    @CacheEvict(value = { "environments", "environments_latest" }, allEntries = true)
    @PreAuthorize("hasAuthority(@permissions.ENVIRONMENT_WRITE)")
    public void hardDeleteDocument(UUID documentId) {
        List<Environment> versions = environmentRepository.findAllByDocumentId(documentId);
        VersioningMongoEventListener.runWithDeleteBypass(() -> {
            for (Environment env : versions) {
                if (env.getConfig() != null) {
                    configRepository.delete(env.getConfig());
                }
                if (env.getNodes() != null && !env.getNodes().isEmpty()) {
                    List<EnvironmentNode> nodesToDelete = env.getNodes().stream()
                            .filter(Objects::nonNull)
                            .collect(Collectors.toList());
                    if (!nodesToDelete.isEmpty()) {
                        nodeRepository.deleteAll(nodesToDelete);
                    }
                }
                if (env.getReferences() != null && !env.getReferences().isEmpty()) {
                    List<EnvironmentReference> refsToDelete = env.getReferences().stream()
                            .filter(Objects::nonNull)
                            .collect(Collectors.toList());
                    if (!refsToDelete.isEmpty()) {
                        referenceRepository.deleteAll(refsToDelete);
                    }
                }
                matrixRepository.deleteAllByEnvironmentId(env.getId());
                environmentRepository.delete(env);
            }
        });
    }

    public Optional<Environment> findByLatestVersion(UUID documentId) {
        // return
        // environmentRepository.findTopByDocumentIdOrderByVersionDesc(documentId);
        return environmentRepository.findAllByDocumentId(documentId).stream()
                .max(Comparator.comparing(Environment::getVersion));
    }

    @Cacheable(value = "environments_latest")
    public List<Environment> findAllLatestVersions() {
        return environmentRepository.findAll().stream()
                .collect(Collectors.groupingBy(Environment::getDocumentId,
                        Collectors.maxBy(Comparator.comparing(Environment::getVersion))))
                .values()
                .stream()
                .filter(Optional::isPresent)
                .map(Optional::get)
                .filter(env -> env.getDeleted() == null || !env.getDeleted())
                .collect(Collectors.toList());
    }

    /**
     * Builds a deployment plan from the provided environment definition.
     * The plan is a topologically sorted order of node keys derived from
     * references.
     *
     * Rules:
     * - A reference from "fromNode" to "toNode" implies edge toNode -> fromNode.
     * - All nodes mentioned must exist and node keys must be unique.
     * - Cycles are detected and reported.
     */
    @PreAuthorize("hasAnyAuthority(@permissions.DEPLOYMENT_READ, @permissions.DEPLOYMENT_EXECUTE)")
    @DefineKernelFunction(name = "create_deployment_plan", description = "Generates a deployment plan for an environment")
    public DeploymentPlan createPlan(Environment env) {
        if (env == null)
            throw new IllegalArgumentException("Environment is null");
        List<String> nodeKeys = Optional.ofNullable(env.getNodes()).orElseGet(Collections::emptyList)
                .stream().map(n -> Optional.ofNullable(n.getKey()).orElse(""))
                .toList();
        if (nodeKeys.isEmpty()) {
            return DeploymentPlan.builder().order(Collections.emptyList()).edges(Collections.emptyList()).build();
        }
        // Validate unique keys
        Set<String> uniq = new HashSet<>(nodeKeys);
        if (uniq.size() != nodeKeys.size()) {
            throw new IllegalArgumentException("Environment node keys must be unique");
        }

        // Build edges from references
        List<EnvironmentReference> refs = Optional.ofNullable(env.getReferences()).orElseGet(Collections::emptyList);
        Map<String, Set<String>> adj = new HashMap<>(); // from -> set(to)
        Map<String, Integer> indeg = new HashMap<>(); // node -> indegree
        for (String k : nodeKeys) {
            adj.put(k, new HashSet<>());
            indeg.put(k, 0);
        }
        List<DeploymentPlan.PlanEdge> planEdges = new ArrayList<>();
        for (EnvironmentReference r : refs) {
            if (r == null)
                continue;
            String from = r.getFromNode();
            String to = r.getToNode();
            if (!indeg.containsKey(from)) {
                throw new IllegalArgumentException("Reference from unknown node: " + from);
            }
            if (!indeg.containsKey(to)) {
                throw new IllegalArgumentException("Reference to unknown node: " + to);
            }
            // Edge from -> to (from must precede to)
            if (adj.get(from).add(to)) {
                indeg.put(to, indeg.get(to) + 1);
                String reason = String.format("%s.%s -> %s.%s", from, nullToEmpty(r.getFromAttribute()), to,
                        nullToEmpty(r.getToAttribute()));
                planEdges.add(DeploymentPlan.PlanEdge.builder().from(from).to(to).reason(reason).build());
            }
        }

        // Kahn's algorithm for topo sort
        Deque<String> q = new ArrayDeque<>();
        for (Map.Entry<String, Integer> e : indeg.entrySet()) {
            if (e.getValue() == 0)
                q.add(e.getKey());
        }
        List<String> order = new ArrayList<>();
        while (!q.isEmpty()) {
            String u = q.removeFirst();
            order.add(u);
            for (String v : adj.get(u)) {
                indeg.put(v, indeg.get(v) - 1);
                if (indeg.get(v) == 0)
                    q.add(v);
            }
        }
        if (order.size() != nodeKeys.size()) {
            throw new IllegalArgumentException("Cycle detected in environment references");
        }
        return DeploymentPlan.builder().order(order).edges(planEdges).build();
    }

    private void processEnvironmentIn(Environment env) {
        if (env.getNodes() == null)
            return;
        Map<String, ResourceClass> resourceCache = new HashMap<>();

        for (EnvironmentNode node : env.getNodes()) {
            if (node == null || node.getResourceClassId() == null || node.getValues() == null)
                continue;
            ResourceClass rc = resourceCache.computeIfAbsent(node.getResourceClassId(),
                    id -> resourceService.findResourceById(id).orElse(null));
            if (rc == null)
                continue;

            Set<String> secureKeys = findSecureKeys(rc);
            for (String key : secureKeys) {
                Object val = node.getValues().get(key);
                if (val != null) {
                    try {
                        String strVal;
                        if (val instanceof String) {
                            strVal = (String) val;
                        } else {
                            strVal = objectMapper.writeValueAsString(val);
                        }
                        node.getValues().put(key, encryptionService.encrypt(strVal));
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to serialize secure value for key: " + key, e);
                    }
                }
            }
        }
    }

    private Environment processEnvironmentOut(Environment env) {
        if (env.getNodes() == null)
            return env;
        Map<String, ResourceClass> resourceCache = new HashMap<>();

        for (EnvironmentNode node : env.getNodes()) {
            if (node == null || node.getResourceClassId() == null || node.getValues() == null)
                continue;
            ResourceClass rc = resourceCache.computeIfAbsent(node.getResourceClassId(),
                    id -> resourceService.findResourceById(id).orElse(null));
            if (rc == null)
                continue;

            Set<String> secureKeys = findSecureKeys(rc);
            for (String key : secureKeys) {
                Object val = node.getValues().get(key);
                if (val instanceof String) {
                    String decrypted = encryptionService.decrypt((String) val);
                    node.getValues().put(key, decrypted);

                    // Retrying a template walk to find a type
                    ValueType type = getValueType(rc.getTemplate(), key);
                    if (type == ValueType.OBJECT || type == ValueType.ARRAY) {
                        try {
                            node.getValues().put(key, objectMapper.readValue(decrypted, Object.class));
                        } catch (Exception e) {
                            // If it fails, keep as string (maybe it wasn't valid JSON or was just a string)
                        }
                    }
                }
            }
        }
        return env;
    }

    /**
     * Find the latest environment by name
     */
    public Optional<Environment> findLatestByName(String name) {
        return environmentRepository.findTopByNameOrderByVersionDesc(name);
    }

    private enum ValueType {
        STRING, OBJECT, ARRAY, UNKNOWN
    }

    private ValueType getValueType(Object template, String targetKey) {
        if (template instanceof Map) {
            // ... deep search ...
            // This is expensive to do for every key.
            // Maybe we can improve findSecureKeys to return map of Key->Type?
            return findSecureKeysWithType(template).getOrDefault(targetKey, ValueType.STRING);
        }
        return ValueType.STRING;
    }

    private Map<String, ValueType> findSecureKeysWithType(Object template) {
        Map<String, ValueType> map = new HashMap<>();
        walkTemplateWithType(template, map);
        return map;
    }

    private void walkTemplateWithType(Object obj, Map<String, ValueType> keys) {
        if (obj instanceof Map) {
            ((Map<?, ?>) obj).values().forEach(v -> walkTemplateWithType(v, keys));
        } else if (obj instanceof List) {
            ((List<?>) obj).forEach(v -> walkTemplateWithType(v, keys));
        } else if (obj instanceof String) {
            Matcher m = PLACEHOLDER_PATTERN.matcher((String) obj);
            while (m.find()) {
                if (m.group(2) != null) {
                    String name = m.group(1);
                    String typeStr = m.group(2); // "string" or "object" (we treat "object" covering arrays too here?)
                    // The regex in findSecureKeys was:
                    // \\{\\{\\s*([\\w.-]+)(?::(string|object)!)?(?::[\\w.-]+)?\\s*\\}\\}
                    // So type can be string or object.
                    if ("object".equalsIgnoreCase(typeStr)) {
                        keys.put(name, ValueType.OBJECT);
                    } else {
                        keys.put(name, ValueType.STRING);
                    }
                }
            }
        }
    }

    private Set<String> findSecureKeys(ResourceClass rc) {
        Map<String, ValueType> map = new HashMap<>();
        if (rc.getTemplate() != null) {
            walkTemplateWithType(rc.getTemplate(), map);
        }
        return map.keySet();
    }

    private void walkTemplate(Object obj, Set<String> keys) {
        // Legacy method, replaced by walkTemplateWithType
        Map<String, ValueType> map = new HashMap<>();
        walkTemplateWithType(obj, map);
        keys.addAll(map.keySet());
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    // --- Reference detection from ARM properties ---

    private static final Pattern AZURE_RESOURCE_ID_PATTERN = Pattern.compile(
            "^/subscriptions/[^/]+/resourceGroups/[^/]+/providers/.+",
            Pattern.CASE_INSENSITIVE);

    /**
     * Scans all imported items' properties for Azure resource IDs that reference
     * other imported items, producing a list of detected cross-resource references.
     */
    private List<EnvironmentImportDtos.DetectedReference> detectReferences(
            List<EnvironmentImportDtos.ImportedItem> items) {
        // Build lookup: Azure resource ID (lowercase) → ImportedItem
        Map<String, EnvironmentImportDtos.ImportedItem> byAzureId = new HashMap<>();
        for (var item : items) {
            if (item.getId() != null) {
                byAzureId.put(item.getId().toLowerCase(Locale.ROOT), item);
            }
        }

        List<EnvironmentImportDtos.DetectedReference> refs = new ArrayList<>();

        for (var item : items) {
            if (item.getTemplate() == null) continue;
            Object properties = item.getTemplate().get("properties");
            if (properties == null) continue;

            walkPropertiesForReferences(properties, "", byAzureId, item, refs);
        }

        return refs;
    }

    /**
     * Recursively walks a properties object looking for string values that match
     * Azure resource IDs of other imported resources.
     */
    @SuppressWarnings("unchecked")
    private void walkPropertiesForReferences(
            Object obj,
            String currentPath,
            Map<String, EnvironmentImportDtos.ImportedItem> byAzureId,
            EnvironmentImportDtos.ImportedItem currentItem,
            List<EnvironmentImportDtos.DetectedReference> refs) {

        if (obj instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) obj;
            for (Map.Entry<String, Object> entry : map.entrySet()) {
                String childPath = currentPath.isEmpty() ? entry.getKey() : currentPath + "." + entry.getKey();
                walkPropertiesForReferences(entry.getValue(), childPath, byAzureId, currentItem, refs);
            }
        } else if (obj instanceof List) {
            List<?> list = (List<?>) obj;
            for (int i = 0; i < list.size(); i++) {
                String childPath = currentPath + "[" + i + "]";
                walkPropertiesForReferences(list.get(i), childPath, byAzureId, currentItem, refs);
            }
        } else if (obj instanceof String) {
            String value = (String) obj;
            if (AZURE_RESOURCE_ID_PATTERN.matcher(value).matches()) {
                EnvironmentImportDtos.ImportedItem referenced = byAzureId.get(value.toLowerCase(Locale.ROOT));
                // Only create a reference if it points to a different imported resource
                if (referenced != null && !value.equalsIgnoreCase(currentItem.getId())) {
                    refs.add(EnvironmentImportDtos.DetectedReference.builder()
                            .fromImportedId(referenced.getId())
                            .fromImportedName(referenced.getName())
                            .toImportedId(currentItem.getId())
                            .toImportedName(currentItem.getName())
                            .propertyPath(currentPath)
                            .build());
                }
            }
        }
    }
}
