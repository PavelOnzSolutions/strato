package solutions.onz.platform.strato.creator.provisioner.services;

import solutions.onz.platform.strato.creator.configuration.VersioningMongoEventListener;
import solutions.onz.platform.strato.creator.domain.AuditLog;
import solutions.onz.platform.strato.creator.provisioner.domain.Configuration;
import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationLock;
import solutions.onz.platform.strato.creator.provisioner.domain.ConfigurationSchema;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogEntityOperation;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogSeverity;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogType;
import solutions.onz.platform.strato.creator.repositories.AuditLogRepository;
import solutions.onz.platform.strato.creator.provisioner.repositories.ConfigurationLockRepository;
import solutions.onz.platform.strato.creator.provisioner.repositories.ConfigurationRepository;
import solutions.onz.platform.strato.creator.services.ConfigurationDataValidator;
import solutions.onz.platform.strato.creator.services.EncryptionService;
import solutions.onz.platform.strato.creator.provisioner.api.exception.ConfigurationLockedException;
import solutions.onz.platform.strato.creator.provisioner.api.exception.ConfigurationVersionConflictException;
import solutions.onz.platform.strato.creator.utils.SecretFieldResolver;
import com.microsoft.semantickernel.semanticfunctions.annotations.DefineKernelFunction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service class responsible for managing configurations, handling their lifecycle, and enriching them with
 * metadata such as lock states and audit information. It provides methods for retrieval, saving, deletion,
 * search, encryption, and masking of sensitive fields within configurations. This service also ensures
 * proper authorization checks at multiple levels to control access to configuration data.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConfigurationService {

    private final ConfigurationRepository configurationRepository;
    private final ConfigurationLockRepository configurationLockRepository;
    private final AuditLogRepository auditLogRepository;
    private final ConfigurationSchemaService schemaService;
    private final EncryptionService encryptionService;
    private final EffectiveSchemaMaterializer materializer;
    private final ConfigurationDataValidator validator;

    /**
     * Retrieves a list of all configurations in their latest versions.
     * This method groups configurations by their document ID, selects the latest version
     * for each group, filters out deleted configurations, and enriches the result with lock state information.
     *
     * @return a list containing the latest version of all available configurations
     *         that are not marked as deleted.
     */
    @DefineKernelFunction(name = "find_all_configurations_latest_version", description = "Gets a list of all configurations in their latest versions")
    @Cacheable(value = "configurations_latest")
    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_PROVIDER_READ, @permissions.CONFIG_PROVIDER_WRITE})")
    public List<Configuration> findAllLatestVersions() {
        List<Configuration> latest = configurationRepository.findAll().stream()
                .collect(Collectors.groupingBy(Configuration::getDocumentId,
                        Collectors.maxBy(Comparator.comparing(Configuration::getVersion))))
                .values()
                .stream()
                .filter(Optional::isPresent)
                .map(Optional::get)
                .filter(config -> config.getDeleted() == null || !config.getDeleted())
                .collect(Collectors.toList());
        enrichWithLockState(latest);
        return latest;
    }

    @DefineKernelFunction(name = "find_configuration_by_id", description = "Gets a configuration by its unique identifier")
    @Cacheable(value = "configurations", key = "#id")
    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_PROVIDER_READ, @permissions.CONFIG_PROVIDER_WRITE})")
    public Optional<Configuration> findById(String id) {
        return configurationRepository.findById(id).map(config -> {
            enrichWithLockState(config);
            return config;
        });
    }

    @DefineKernelFunction(name = "save_configuration", description = "Saves a configuration, updating if it already exists")
    @CacheEvict(value = { "configurations", "configurations_latest" }, allEntries = true)
    @PreAuthorize("hasAuthority(@permissions.CONFIG_PROVIDER_WRITE)")
    public Configuration save(Configuration config) {
        if (config.getDocumentId() != null) {
            configurationLockRepository.findByDocumentId(config.getDocumentId())
                    .filter(ConfigurationLock::isLocked)
                    .ifPresent(lock -> {
                        throw new ConfigurationLockedException(config.getDocumentId().toString());
                    });
        }

        // Optimistic concurrency: require baseVersion on updates of existing documents.
        if (config.getDocumentId() != null) {
            List<Configuration> existingVersions =
                    configurationRepository.findAllByDocumentId(config.getDocumentId());
            if (!existingVersions.isEmpty()) {
                Configuration latest = existingVersions.stream()
                        .max(Comparator.comparing(Configuration::getVersion))
                        .orElseThrow();
                Integer base = config.getBaseVersion();
                if (base == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "baseVersion is required when updating an existing configuration document");
                }
                if (!base.equals(latest.getVersion())) {
                    enrichWithLockState(latest);
                    throw new ConfigurationVersionConflictException(latest.getVersion(), latest);
                }
            } else if (config.getBaseVersion() != null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "baseVersion must be null when creating a new configuration document");
            }
        }

        // Snapshot of stored configuration before mutation/encryption — used
        // for ITEM_ADD / ITEM_DELETE auditing (compared against the saved value).
        Configuration before = config.getId() != null
                ? configurationRepository.findById(config.getId()).orElse(null) : null;

        if (config.getSchemaId() != null) {
            ConfigurationSchema schema = schemaService.findById(config.getSchemaId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "Schema not found: " + config.getSchemaId()));
            config.setFlavor(schema.getFlavor());

            if (config.getData() != null) {
                Map<String, Object> materialized = materializer.materialize(schema);
                validator.validateConfigurationData(config.getData(), materialized);
                encryptItemLevelSecrets(config, materialized);
            }
        }

        Configuration saved = configurationRepository.save(config);

        auditItemChanges(before, saved, currentUserLogin());

        return saved;
    }

    @SuppressWarnings("unchecked")
    private void encryptItemLevelSecrets(Configuration config, Map<String, Object> materialized) {
        Map<String, Object> sectionProps = (Map<String, Object>) materialized.get("properties");
        if (sectionProps == null) return;

        Configuration existing = config.getId() != null
                ? configurationRepository.findById(config.getId()).orElse(null) : null;

        for (Map.Entry<String, Map<String, Map<String, Object>>> sectionEntry : config.getData().entrySet()) {
            String sectionKey = sectionEntry.getKey();
            Map<String, Object> sectionSchema = (Map<String, Object>) sectionProps.get(sectionKey);
            if (sectionSchema == null) continue;
            Map<String, Object> itemSchema = (Map<String, Object>) sectionSchema.get("additionalProperties");
            if (itemSchema == null) continue;
            Set<String> secretPaths = SecretFieldResolver.findSecretPaths(itemSchema);
            if (secretPaths.isEmpty()) continue;

            for (Map.Entry<String, Map<String, Object>> itemEntry : sectionEntry.getValue().entrySet()) {
                Map<String, Object> existingItem = existing != null && existing.getData() != null
                        && existing.getData().get(sectionKey) != null
                        ? existing.getData().get(sectionKey).get(itemEntry.getKey())
                        : null;
                Map<String, Object> encrypted = SecretFieldResolver.encryptData(
                        itemEntry.getValue(), existingItem, secretPaths, encryptionService);
                sectionEntry.getValue().put(itemEntry.getKey(), encrypted);
            }
        }
    }

    @CacheEvict(value = { "configurations", "configurations_latest" }, allEntries = true)
    @PreAuthorize("hasAuthority(@permissions.CONFIG_PROVIDER_WRITE)")
    public void delete(String id) {
        configurationRepository.findById(id).ifPresent(config -> {
            if (config.getDocumentId() != null) {
                configurationLockRepository.findByDocumentId(config.getDocumentId())
                        .filter(ConfigurationLock::isLocked)
                        .ifPresent(lock -> {
                            throw new ConfigurationLockedException(config.getDocumentId().toString());
                        });
            }
        });
        configurationRepository.deleteById(id);
    }

    @CacheEvict(value = { "configurations", "configurations_latest" }, allEntries = true)
    @PreAuthorize("hasAuthority(@permissions.CONFIG_PROVIDER_WRITE)")
    public void hardDeleteDocument(UUID documentId) {
        configurationLockRepository.findByDocumentId(documentId)
                .filter(ConfigurationLock::isLocked)
                .ifPresent(lock -> {
                    throw new ConfigurationLockedException(documentId.toString());
                });
        List<Configuration> configs = configurationRepository.findAllByDocumentId(documentId);
        VersioningMongoEventListener.runWithDeleteBypass(() -> {
            for (Configuration config : configs) {
                configurationRepository.deleteById(config.getId());
            }
        });
    }

    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_PROVIDER_READ, @permissions.CONFIG_PROVIDER_WRITE})")
    public List<Configuration> findAllVersions(UUID documentId) {
        List<Configuration> versions = configurationRepository.findAllByDocumentId(documentId);
        boolean isLocked = configurationLockRepository.findByDocumentId(documentId)
                .map(ConfigurationLock::isLocked)
                .orElse(false);
        versions.forEach(v -> v.setLocked(isLocked));
        return versions;
    }

    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_PROVIDER_READ, @permissions.CONFIG_PROVIDER_WRITE})")
    public Optional<Configuration> findLatestByName(String name) {
        return configurationRepository
                .findByName(name)
                .stream()
                .filter(config -> config.getDeleted() == null || !config.getDeleted())
                .max(Comparator.comparing(Configuration::getVersion));
    }

    @DefineKernelFunction(name = "search_configurations", description = "Searches for configurations by name")
    @PreAuthorize("hasAnyAuthority({@permissions.CONFIG_PROVIDER_READ, @permissions.CONFIG_PROVIDER_WRITE})")
    public List<Configuration> search(String query) {
        List<Configuration> results = configurationRepository.findAllByNameContainingIgnoreCase(query).stream()
                .collect(Collectors.groupingBy(Configuration::getDocumentId,
                        Collectors.maxBy(Comparator.comparing(Configuration::getVersion))))
                .values()
                .stream()
                .filter(Optional::isPresent)
                .map(Optional::get)
                .filter(config -> config.getDeleted() == null || !config.getDeleted())
                .collect(Collectors.toList());
        enrichWithLockState(results);
        return results;
    }

    @CacheEvict(value = { "configurations", "configurations_latest" }, allEntries = true)
    @PreAuthorize("hasAuthority(@permissions.CONFIG_PROVIDER_WRITE)")
    public Configuration clone(String id, String newName) {
        Configuration source = configurationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Configuration not found: " + id));

        Configuration cloned = Configuration.builder()
                .name(newName)
                .schemaId(source.getSchemaId())
                .flavor(source.getFlavor())
                .data(source.getData() != null ? new java.util.HashMap<>(source.getData()) : null)
                .environmentId(source.getEnvironmentId())
                .build();

        return configurationRepository.save(cloned);
    }

    @CacheEvict(value = { "configurations", "configurations_latest" }, allEntries = true)
    @PreAuthorize("hasAuthority(@permissions.CONFIG_LOCK_SET)")
    public ConfigurationLock lockConfiguration(UUID documentId, boolean locked, String currentUser) {
        boolean exists = !configurationRepository.findAllByDocumentId(documentId).isEmpty();
        if (!exists) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Configuration document not found: " + documentId);
        }

        ConfigurationLock lockDoc = configurationLockRepository.findByDocumentId(documentId)
                .orElseGet(() -> ConfigurationLock.builder().documentId(documentId).build());

        lockDoc.setLocked(locked);
        lockDoc.setLockedBy(currentUser);
        lockDoc.setLockedAt(Instant.now());

        ConfigurationLock saved = configurationLockRepository.save(lockDoc);

        AuditLog entry = new AuditLog();
        entry.setType(AuditLogType.ENTITY_CHANGE);
        entry.setSeverity(AuditLogSeverity.INFO);
        entry.setOperation(locked ? AuditLogEntityOperation.LOCK : AuditLogEntityOperation.UNLOCK);
        entry.setCollectionName("configurations");
        entry.setEntityId(documentId.toString());
        entry.setEntityClass(Configuration.class.getName());
        entry.setTimestamp(Instant.now());
        entry.setUserLogin(currentUser);
        Map<String, Object> data = new HashMap<>();
        data.put("locked", locked);
        data.put("lockedBy", currentUser);
        data.put("lockedAt", saved.getLockedAt().toString());
        entry.setData(data);
        auditLogRepository.save(entry);

        return saved;
    }

    public Map<String, Object> executeQuery(String query) {
        return HashMap.newHashMap(1);
    }

    @SuppressWarnings("unchecked")
    public void maskSecretFields(Configuration config) {
        if (config == null || config.getData() == null || config.getSchemaId() == null) return;
        schemaService.findById(config.getSchemaId()).ifPresent(schema -> {
            Map<String, Object> materialized = materializer.materialize(schema);
            Map<String, Object> sectionProps = (Map<String, Object>) materialized.get("properties");
            if (sectionProps == null) return;
            for (Map.Entry<String, Map<String, Map<String, Object>>> sectionEntry : config.getData().entrySet()) {
                Map<String, Object> sectionSchema = (Map<String, Object>) sectionProps.get(sectionEntry.getKey());
                if (sectionSchema == null) continue;
                Map<String, Object> itemSchema = (Map<String, Object>) sectionSchema.get("additionalProperties");
                if (itemSchema == null) continue;
                Set<String> secretPaths = SecretFieldResolver.findSecretPaths(itemSchema);
                if (secretPaths.isEmpty()) continue;
                for (Map.Entry<String, Map<String, Object>> itemEntry : sectionEntry.getValue().entrySet()) {
                    sectionEntry.getValue().put(itemEntry.getKey(),
                            SecretFieldResolver.maskData(itemEntry.getValue(), secretPaths));
                }
            }
        });
    }

    public void maskSecretFields(List<Configuration> configs) {
        configs.forEach(this::maskSecretFields);
    }

    public Optional<Configuration> findByIdRaw(String id) {
        return configurationRepository.findById(id);
    }


    private void enrichWithLockState(Configuration config) {
        if (config.getDocumentId() == null) return;
        boolean isLocked = configurationLockRepository.findByDocumentId(config.getDocumentId())
                .map(ConfigurationLock::isLocked)
                .orElse(false);
        config.setLocked(isLocked);
    }

    private void enrichWithLockState(List<Configuration> configs) {
        if (configs.isEmpty()) return;
        List<UUID> docIds = configs.stream()
                .map(Configuration::getDocumentId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        Map<UUID, Boolean> lockMap = configurationLockRepository.findAllByDocumentIdIn(docIds)
                .stream()
                .collect(Collectors.toMap(ConfigurationLock::getDocumentId, ConfigurationLock::isLocked));
        configs.forEach(c -> {
            if (c.getDocumentId() != null) {
                c.setLocked(lockMap.getOrDefault(c.getDocumentId(), false));
            }
        });
    }

    // --- Item-level audit (ITEM_ADD / ITEM_DELETE) ------------------------------

    private void auditItemChanges(Configuration before, Configuration after, String userLogin) {
        Map<String, Set<String>> beforeMap = collectItemKeys(before);
        Map<String, Set<String>> afterMap = collectItemKeys(after);
        Set<String> sections = new HashSet<>();
        sections.addAll(beforeMap.keySet());
        sections.addAll(afterMap.keySet());
        for (String sec : sections) {
            Set<String> b = beforeMap.getOrDefault(sec, Set.of());
            Set<String> a = afterMap.getOrDefault(sec, Set.of());
            for (String added : new TreeSet<>(a)) {
                if (!b.contains(added)) writeItemAudit(after, sec, added, AuditLogEntityOperation.ITEM_ADD, userLogin);
            }
            for (String removed : new TreeSet<>(b)) {
                if (!a.contains(removed)) writeItemAudit(after, sec, removed, AuditLogEntityOperation.ITEM_DELETE, userLogin);
            }
        }
    }

    private Map<String, Set<String>> collectItemKeys(Configuration c) {
        Map<String, Set<String>> out = new HashMap<>();
        if (c == null || c.getData() == null) return out;
        c.getData().forEach((k, v) -> out.put(k, v == null ? Set.of() : new HashSet<>(v.keySet())));
        return out;
    }

    private void writeItemAudit(Configuration cfg, String sectionKey, String itemName, AuditLogEntityOperation op, String user) {
        AuditLog entry = new AuditLog();
        entry.setType(AuditLogType.ENTITY_CHANGE);
        entry.setSeverity(AuditLogSeverity.INFO);
        entry.setOperation(op);
        entry.setCollectionName("configurations");
        entry.setEntityId(cfg.getDocumentId() != null ? cfg.getDocumentId().toString() : cfg.getId());
        entry.setEntityClass(Configuration.class.getName());
        entry.setTimestamp(Instant.now());
        entry.setUserLogin(user);
        entry.setData(Map.of("sectionKey", sectionKey, "itemName", itemName));
        auditLogRepository.save(entry);
    }

    private String currentUserLogin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }
}
