package solutions.onz.platform.strato.creator.api.rest;

import solutions.onz.platform.strato.creator.constants.Permissions;
import solutions.onz.platform.strato.creator.domain.ResourceClass;
import solutions.onz.platform.strato.creator.services.ResourceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ResourceClassesControllerSecurityIntTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ResourceService resourceService;

    @Test
    @WithMockUser(authorities = {})
    void listCompactPagedReturns403WithoutReadPermission() throws Exception {
        mockMvc.perform(get("/api/resources/list")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {})
    void listCompactFullReturns403WithoutReadPermission() throws Exception {
        mockMvc.perform(get("/api/resources/listFull")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {})
    void listFullReturns403WithoutReadPermission() throws Exception {
        mockMvc.perform(get("/api/resources")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {Permissions.RESOURCE_READ})
    void listCompactPagedReturns200WithReadPermission() throws Exception {
        when(resourceService.findAllResourcesCompactPaged(any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of()));
        mockMvc.perform(get("/api/resources/list")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = {Permissions.RESOURCE_READ})
    void listCompactFullReturns200WithReadPermission() throws Exception {
        when(resourceService.findAllResources()).thenReturn(List.of());
        mockMvc.perform(get("/api/resources/listFull")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = {Permissions.RESOURCE_READ})
    void listFullReturns200WithReadPermission() throws Exception {
        when(resourceService.findAllResources()).thenReturn(List.of());
        when(resourceService.maskCredentialFields(org.mockito.ArgumentMatchers.<List<ResourceClass>>any())).thenReturn(List.of());
        mockMvc.perform(get("/api/resources")).andExpect(status().isOk());
    }
}
