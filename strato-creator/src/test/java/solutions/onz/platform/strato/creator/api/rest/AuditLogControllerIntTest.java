package solutions.onz.platform.strato.creator.api.rest;

import solutions.onz.platform.strato.creator.domain.enums.AuditLogEntityOperation;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogSeverity;
import solutions.onz.platform.strato.creator.domain.enums.AuditLogType;
import solutions.onz.platform.strato.creator.services.AuditLogService;
import solutions.onz.platform.strato.creator.services.AuditLogService.CompactAuditLog;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuditLogControllerIntTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuditLogService auditLogService;

    @Test
    @WithMockUser
    void shouldListAuditLogs() throws Exception {
        CompactAuditLog compactLog = new CompactAuditLog(
                "1",
                AuditLogType.ENTITY_CHANGE,
                AuditLogSeverity.INFO,
                "collection",
                AuditLogEntityOperation.CREATE,
                "entityId",
                "entityClass",
                Instant.now(),
                "user"
        );
        Page<CompactAuditLog> page = new PageImpl<>(Collections.singletonList(compactLog), PageRequest.of(0, 10), 1);

        when(auditLogService.findCompact(any(), any(), any(), any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/audit-logs")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").exists())
                .andExpect(jsonPath("$.page").exists());
    }
}
