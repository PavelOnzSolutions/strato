package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.configuration.ApplicationProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AzureArchitecturePluginTest {

    @Mock
    private ApplicationProperties properties;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ApplicationProperties.Llm llm;

    @Mock
    private ApplicationProperties.Llm.BingSearch bingSearch;

    @Mock
    private ApplicationProperties.Llm.DuckDuckGo duckDuckGo;

    @InjectMocks
    private AzureArchitecturePlugin azureArchitecturePlugin;

    @BeforeEach
    void setUp() {
        when(properties.getLlm()).thenReturn(llm);
        azureArchitecturePlugin.setRestTemplate(restTemplate);
    }

    @Test
    void testSearchArchitectureNoApiKeyBing() {
        when(llm.getDuckDuckGo()).thenReturn(duckDuckGo);
        when(duckDuckGo.isEnabled()).thenReturn(false);
        when(llm.getBingSearch()).thenReturn(bingSearch);
        when(bingSearch.getApiKey()).thenReturn("");

        String result = azureArchitecturePlugin.searchArchitecture("AKS");

        assertTrue(result.contains("According to Azure Architecture Center (MOCK)"));
        assertTrue(result.contains("Kubernetes"));
    }

    @Test
    void testSearchArchitectureDuckDuckGo() {
        when(llm.getDuckDuckGo()).thenReturn(duckDuckGo);
        when(duckDuckGo.isEnabled()).thenReturn(true);
        when(duckDuckGo.getEndpoint()).thenReturn("https://html.duckduckgo.com/html/");

        String fakeHtml = "<html><body>" +
                          "<a class=\"result__a\" href=\"url1\">Title 1</a>" +
                          "<a class=\"result__snippet\" href=\"url1\">Snippet 1</a>" +
                          "</body></html>";
        
        when(restTemplate.exchange(any(String.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
            .thenReturn(ResponseEntity.ok(fakeHtml));

        String result = azureArchitecturePlugin.searchArchitecture("AKS");

        assertTrue(result.contains("Title 1: Snippet 1"), "Result was: " + result);
    }
}
