package solutions.onz.platform.strato.creator.api.rest;

import solutions.onz.platform.strato.creator.constants.Permissions;
import solutions.onz.platform.strato.creator.provisioner.domain.Configuration;
import solutions.onz.platform.strato.creator.provisioner.repositories.ConfigurationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end integration test verifying that the real ConfigurationService.save()
 * OCC block raises ConfigurationVersionConflictException when the client's
 * baseVersion is stale, and that VersionConflictControllerAdvice translates it
 * into a structured HTTP 409 response.
 *
 * <p>A v2 document is seeded directly via ConfigurationRepository (bypassing the
 * OCC check in the service). The POST request then supplies baseVersion=1, which
 * is stale, triggering the conflict path in the real service implementation.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ConfigurationControllerConflictIntTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ConfigurationRepository configurationRepository;

    /** documentId used for the seeded record; cleaned up after each test. */
    private UUID seededDocumentId;

    @AfterEach
    void cleanup() {
        if (seededDocumentId != null) {
            configurationRepository.deleteAllByDocumentId(seededDocumentId);
        }
    }

    @Test
    @WithMockUser(authorities = {Permissions.CONFIG_PROVIDER_WRITE})
    void post_with_stale_baseVersion_returns_409_with_latest() throws Exception {
        // --- Seed a v2 Configuration directly via the repository ---
        // The VersioningMongoEventListener fires for this save too (id=null → new doc),
        // but: documentId is already non-null (not overridden) and version=2 > 1
        // (not overridden by the listener's "v.getVersion() == null || v.getVersion() <= 1" guard).
        // Result: a document with documentId=seededDocumentId, version=2 is persisted.
        seededDocumentId = UUID.randomUUID();
        String schemaId = UUID.randomUUID().toString();

        Configuration seed = Configuration.builder()
                .name("c")
                .schemaId(schemaId)
                .build();
        seed.setDocumentId(seededDocumentId);
        seed.setVersion(2);
        seed.setCreatedDate(Instant.now());
        seed.setCreatedBy("test-seed");

        configurationRepository.save(seed);

        // --- POST with baseVersion=1 (stale against the seeded v2) ---
        String body = String.format(
                "{\"documentId\":\"%s\",\"name\":\"c\",\"schemaId\":\"%s\",\"data\":{},\"baseVersion\":1}",
                seededDocumentId, schemaId);

        mockMvc.perform(post("/api/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFIG_VERSION_CONFLICT"))
                .andExpect(jsonPath("$.latestVersion").value(2))
                .andExpect(jsonPath("$.latest.version").value(2));
    }
}
