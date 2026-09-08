package solutions.onz.platform.strato.creator.api.rest;

import solutions.onz.platform.strato.creator.constants.Permissions;
import solutions.onz.platform.strato.creator.provisioner.services.SectionCatalogService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SectionCatalogControllerSecurityIntTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SectionCatalogService sectionCatalogService;

    @Test
    @WithMockUser(authorities = {})
    void listReturns403WithoutReadPermission() throws Exception {
        mockMvc.perform(get("/api/section-catalog"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {Permissions.CONFIG_SECTIONS_READ})
    void listReturns200WithReadPermission() throws Exception {
        when(sectionCatalogService.findAllLatest(any())).thenReturn(List.of());
        mockMvc.perform(get("/api/section-catalog"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = {Permissions.CONFIG_SECTIONS_READ})
    void createReturns403WithoutWritePermission() throws Exception {
        mockMvc.perform(post("/api/section-catalog")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {Permissions.CONFIG_SECTIONS_READ})
    void updateReturns403WithoutWritePermission() throws Exception {
        mockMvc.perform(put("/api/section-catalog/some-id")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {Permissions.CONFIG_SECTIONS_READ})
    void deleteReturns403WithoutWritePermission() throws Exception {
        mockMvc.perform(delete("/api/section-catalog/some-id"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {Permissions.CONFIG_SECTIONS_READ})
    void cloneReturns403WithoutWritePermission() throws Exception {
        mockMvc.perform(post("/api/section-catalog/clone/some-id")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"X\",\"sectionKey\":\"x\"}"))
                .andExpect(status().isForbidden());
    }
}
