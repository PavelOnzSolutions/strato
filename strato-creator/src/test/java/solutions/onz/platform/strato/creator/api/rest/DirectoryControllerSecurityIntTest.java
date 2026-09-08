package solutions.onz.platform.strato.creator.api.rest;

import solutions.onz.platform.strato.creator.domain.DirectoryConfig;
import solutions.onz.platform.strato.creator.services.DirectoryService;
import solutions.onz.platform.strato.creator.services.UserManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.equalTo;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DirectoryControllerSecurityIntTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DirectoryService directoryService;

    @MockBean
    private UserManagementService userManagementService;

    @Test
    @WithAnonymousUser
    void anonymousGetConfigIs401or403() throws Exception {
        mockMvc.perform(get("/api/directory/config"))
                .andExpect(status().is(anyOf(equalTo(401), equalTo(403))));
    }

    @Test
    @WithMockUser(authorities = "PERM_USER_READ")
    void readerCanGetConfigButNotSave() throws Exception {
        // GET is allowed for USER_READ; PUT is not
        mockMvc.perform(get("/api/directory/config"))
                .andExpect(status().is(anyOf(equalTo(200), equalTo(404)))); // 404 if no doc

        mockMvc.perform(put("/api/directory/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credentialResourceId\":\"x\"}"))
                .andExpect(status().is(anyOf(equalTo(401), equalTo(403))));
    }

    @Test
    @WithMockUser(authorities = "PERM_USER_WRITE")
    void writerCanSaveConfig() throws Exception {
        DirectoryConfig saved = new DirectoryConfig();
        saved.setId(DirectoryConfig.SINGLETON_ID);
        saved.setEnabled(true);
        saved.setCredentialResourceId("cred-1");

        when(directoryService.saveConfig(anyString(), anyString())).thenReturn(saved);

        mockMvc.perform(put("/api/directory/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credentialResourceId\":\"cred-1\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "PERM_USER_READ")
    void readerCannotImport() throws Exception {
        mockMvc.perform(post("/api/directory/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"users\":[]}"))
                .andExpect(status().is(anyOf(equalTo(401), equalTo(403))));
    }
}
