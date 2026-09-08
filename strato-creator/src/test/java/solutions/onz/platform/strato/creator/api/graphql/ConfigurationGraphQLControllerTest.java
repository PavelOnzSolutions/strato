package solutions.onz.platform.strato.creator.api.graphql;

import solutions.onz.platform.strato.creator.provisioner.domain.Configuration;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationProviderService;
import solutions.onz.platform.strato.creator.provisioner.services.ConfigurationService;
import solutions.onz.platform.strato.creator.forge.services.EnvironmentsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.graphql.tester.AutoConfigureGraphQlTester;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.graphql.test.tester.GraphQlTester;

import java.util.Collections;
import java.util.Map;

import static org.mockito.Mockito.when;

@SpringBootTest
@AutoConfigureGraphQlTester
class ConfigurationGraphQLControllerTest {

    @Autowired
    private GraphQlTester graphQlTester;

    @MockBean
    private ConfigurationService configurationService;

    @MockBean
    private EnvironmentsService environmentsService;

    @MockBean
    private ConfigurationProviderService configurationProviderService;

    @Test
    void shouldListConfigurations() {
        Configuration config = new Configuration();
        config.setId("1");
        config.setName("Test Config");
        config.setData(Map.of("functions", Map.of("item1", Map.of("key", "value"))));

        when(configurationService.findAllLatestVersions()).thenReturn(Collections.singletonList(config));

        this.graphQlTester.documentName("configurations")
                .execute()
                .errors()
                .verify()
                .path("configurations")
                .entityList(Configuration.class)
                .hasSize(1);
    }
}
