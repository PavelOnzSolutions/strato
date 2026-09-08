package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.configuration.ApplicationProperties;
import com.microsoft.semantickernel.semanticfunctions.annotations.DefineKernelFunction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Azure Architecture Plugin for Semantic Kernel, utilizing Azure Architecture Center for best practices.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AzureArchitecturePlugin {

    private final ApplicationProperties properties;
    private RestTemplate restTemplate = new RestTemplate();

    // For testing
    void setRestTemplate(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Searches Azure Architecture Center for best practices using Bing Search API.
     * If Bing Search API key is missing, falls back to DuckDuckGo search.
     */
    @PreAuthorize("isAuthenticated()")
    @DefineKernelFunction(name = "search_azure_architecture", description = "Searches Azure Architecture Center for best practices")
    public String searchArchitecture(String query) {
        if (properties.getLlm().getDuckDuckGo().isEnabled()) {
            return searchWithDuckDuckGo(query);
        }

        String apiKey = properties.getLlm().getBingSearch().getApiKey();
        String endpoint = properties.getLlm().getBingSearch().getEndpoint();

        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("Bing Search API Key is missing and DuckDuckGo is disabled. Returning mock response.");
            return "According to Azure Architecture Center (MOCK), a basic Kubernetes setup should include " +
                   "a managed control plane, specialized node pools for different workloads, " +
                   "and integration with Azure Monitor and Azure Policy.";
        }

        return searchWithBing(query, apiKey, endpoint);
    }

    private String searchWithDuckDuckGo(String query) {
        try {
            String endpoint = properties.getLlm().getDuckDuckGo().getEndpoint();
            String siteFilter = "site:learn.microsoft.com/en-us/azure/architecture/";
            String fullQuery = query + " " + siteFilter;
            String url = endpoint + "?q=" + java.net.URLEncoder.encode(fullQuery, "UTF-8");

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            var response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            String html = response.getBody();

            if (html == null) {
                return "No results found (empty response) in Azure Architecture Center for: " + query;
            }

            // Simple regex to extract search results from DDG HTML
            // Looking for <a class="result__a" href="...">Title</a> and <a class="result__snippet" ...>Snippet</a>
            List<String> results = new ArrayList<>();
            Pattern resultPattern = Pattern.compile("<a[^>]*class=\"result__a\"[^>]*>(.*?)</a>.*?<a[^>]*class=\"result__snippet\"[^>]*>(.*?)</a>", Pattern.DOTALL);
            Matcher matcher = resultPattern.matcher(html);

            int count = 0;
            while (matcher.find() && count < 5) {
                String title = matcher.group(1).replaceAll("<[^>]*>", "").trim();
                String snippet = matcher.group(2).replaceAll("<[^>]*>", "").trim();
                results.add(title + ": " + snippet);
                count++;
            }

            if (results.isEmpty()) {
                // Try a fallback regex if the one above is too strict
                Pattern fallbackPattern = Pattern.compile("class=\"result__a\"[^>]*>(.*?)</a>", Pattern.DOTALL);
                Matcher fallbackMatcher = fallbackPattern.matcher(html);
                while (fallbackMatcher.find() && count < 5) {
                    String title = fallbackMatcher.group(1).replaceAll("<[^>]*>", "").trim();
                    results.add(title);
                    count++;
                }
            }

            return results.isEmpty() ? "No results found in Azure Architecture Center for: " + query : String.join("\n\n", results);
        } catch (Exception e) {
            log.error("Error searching Azure Architecture Center via DuckDuckGo: {}", e.getMessage());
            return "Error searching Azure Architecture Center: " + e.getMessage();
        }
    }

    private String searchWithBing(String query, String apiKey, String endpoint) {
        try {
            String siteFilter = "site:learn.microsoft.com/en-us/azure/architecture/";
            String fullQuery = query + " " + siteFilter;
            String url = endpoint + "?q=" + java.net.URLEncoder.encode(fullQuery, "UTF-8") + "&count=5";

            HttpHeaders headers = new HttpHeaders();
            headers.set("Ocp-Apim-Subscription-Key", apiKey);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            var response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = response.getBody();

            if (body != null && body.containsKey("webPages")) {
                Map<String, Object> webPages = (Map<String, Object>) body.get("webPages");
                List<Map<String, Object>> values = (List<Map<String, Object>>) webPages.get("value");

                return values.stream()
                    .map(v -> v.get("name") + ": " + v.get("snippet"))
                    .collect(Collectors.joining("\n\n"));
            }

            return "No results found in Azure Architecture Center for: " + query;
        } catch (Exception e) {
            log.error("Error searching Azure Architecture Center via Bing: {}", e.getMessage());
            return "Error searching Azure Architecture Center: " + e.getMessage();
        }
    }
}
