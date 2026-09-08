package solutions.onz.platform.strato.creator.services;

import com.fasterxml.jackson.databind.JsonNode;
import solutions.onz.platform.strato.creator.domain.DirectoryConfig;
import solutions.onz.platform.strato.creator.repositories.DirectoryConfigRepository;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import solutions.onz.platform.strato.creator.services.identity.GraphApiClient;
import solutions.onz.platform.strato.creator.api.dto.DirectoryDtos;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DirectoryService {

    private final DirectoryConfigRepository configRepo;
    private final UserAccountRepository userRepo;
    private final AzureIdentityService identityService;
    private final GraphApiClient graphClient;

    @PreAuthorize("hasAnyAuthority({@permissions.USER_WRITE, @permissions.USER_READ})")
    public Optional<DirectoryConfig> getConfig() {
        return configRepo.findById(DirectoryConfig.SINGLETON_ID);
    }

    @PreAuthorize("hasAuthority(@permissions.USER_WRITE)")
    public DirectoryConfig saveConfig(String credentialResourceId, String updatedBy) {
        DirectoryConfig cfg = configRepo.findById(DirectoryConfig.SINGLETON_ID)
                .orElseGet(DirectoryConfig::new);
        cfg.setId(DirectoryConfig.SINGLETON_ID);
        cfg.setEnabled(true);
        cfg.setCredentialResourceId(credentialResourceId);
        cfg.setUpdatedAt(Instant.now());
        cfg.setUpdatedBy(updatedBy);
        return configRepo.save(cfg);
    }

    @PreAuthorize("hasAuthority(@permissions.USER_WRITE)")
    public DirectoryDtos.EntraIdTestResponse testConnection() {
        Optional<DirectoryConfig> cfgOpt = configRepo.findById(DirectoryConfig.SINGLETON_ID);
        if (cfgOpt.isEmpty()) {
            return new DirectoryDtos.EntraIdTestResponse(false, "EntraID not configured", null);
        }
        DirectoryConfig cfg = cfgOpt.get();
        if (!cfg.isEnabled()) {
            return new DirectoryDtos.EntraIdTestResponse(false, "EntraID is disabled", null);
        }
        try {
            var validation = identityService.testCredential(cfg.getCredentialResourceId());
            if (!validation.isValid()) {
                return new DirectoryDtos.EntraIdTestResponse(false, "Credential validation failed", null);
            }
            var token = identityService.getTokenCredential(cfg.getCredentialResourceId());
            JsonNode count = graphClient.get(token, "users/$count");
            return new DirectoryDtos.EntraIdTestResponse(true, "Connection verified", count.asLong());
        } catch (Exception e) {
            log.warn("Entra test connection failed: {}", e.getMessage());
            return new DirectoryDtos.EntraIdTestResponse(false, e.getMessage(), null);
        }
    }

    private static final String USER_SELECT = "$select=id,displayName,mail,userPrincipalName,department";

    @PreAuthorize("hasAuthority(@permissions.USER_WRITE)")
    public List<DirectoryDtos.DirectoryUserDto> listUsers(int top) {
        DirectoryConfig cfg = requireEnabledConfig();
        String path = "users?$top=" + clampTop(top) + "&" + USER_SELECT;
        return fetchUsers(cfg, path);
    }

    @PreAuthorize("hasAuthority(@permissions.USER_WRITE)")
    public List<DirectoryDtos.DirectoryUserDto> searchUsers(String query, int top) {
        DirectoryConfig cfg = requireEnabledConfig();
        String safe = query == null ? "" : query.replace("\"", "");
        String encoded = URLEncoder.encode(
                "\"displayName:" + safe + "\" OR \"mail:" + safe + "\" OR \"userPrincipalName:" + safe + "\"",
                StandardCharsets.UTF_8);
        String path = "users?$search=" + encoded + "&$top=" + clampTop(top) + "&$count=true&" + USER_SELECT;
        return fetchUsers(cfg, path);
    }

    private DirectoryConfig requireEnabledConfig() {
        DirectoryConfig cfg = configRepo.findById(DirectoryConfig.SINGLETON_ID)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "EntraID not configured"));
        if (!cfg.isEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "EntraID is disabled");
        }
        return cfg;
    }

    private static int clampTop(int top) {
        return Math.clamp(top, 1, 100);
    }

    private List<DirectoryDtos.DirectoryUserDto> fetchUsers(DirectoryConfig cfg, String path) {
        try {
            var cred = identityService.getTokenCredential(cfg.getCredentialResourceId());
            JsonNode body = graphClient.get(cred, path);
            JsonNode value = body.path("value");
            List<DirectoryDtos.DirectoryUserDto> out = new ArrayList<>();
            value.forEach(node -> out.add(toDto(node)));
            log.debug("Raw result from Graph: {}", body);
            return out;
        } catch (Exception e) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Graph API error: " + e.getMessage());
        }
    }

    private DirectoryDtos.DirectoryUserDto toDto(JsonNode node) {
        String id = node.path("id").asText(null);
        String displayName = node.path("displayName").asText(null);
        String mail = node.path("mail").asText(null);
        String upn = node.path("mail").asText(null);
        String department = node.hasNonNull("department") ? node.path("department").asText() : null;
        boolean alreadyExists = upn != null && userRepo.findByUsername(upn).isPresent();
        return new DirectoryDtos.DirectoryUserDto(id, displayName, mail, upn, department, alreadyExists);
    }
}
