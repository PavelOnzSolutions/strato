package solutions.onz.platform.strato.creator.api.rest;

import solutions.onz.platform.strato.creator.constants.Permissions;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ConfigurationControllerSecurityIntTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ConfigurationService configurationService;

    @Test
    @WithMockUser(authorities = {})
    void listReturns403WithoutReadPermission() throws Exception {
        mockMvc.perform(get("/api/configurations")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {Permissions.CONFIG_PROVIDER_READ})
    void listReturns200WithReadPermission() throws Exception {
        when(configurationService.findAllLatestVersions()).thenReturn(List.of());
        mockMvc.perform(get("/api/configurations")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = {Permissions.CONFIG_PROVIDER_READ})
    void createReturns403WithoutWritePermission() throws Exception {
        mockMvc.perform(post("/api/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {Permissions.CONFIG_PROVIDER_READ})
    void deleteReturns403WithoutWritePermission() throws Exception {
        mockMvc.perform(delete("/api/configurations/some-id"))
                .andExpect(status().isForbidden());
    }
}
