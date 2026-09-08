package solutions.onz.platform.strato.creator.services.identity;

import com.azure.core.credential.AccessToken;
import com.azure.core.credential.TokenCredential;
import com.azure.core.credential.TokenRequestContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Component
public class HttpGraphApiClient implements GraphApiClient {

    private static final String BASE = "https://graph.microsoft.com/v1.0/";
    private static final String SCOPE = "https://graph.microsoft.com/.default";

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public JsonNode get(TokenCredential credential, String path) throws Exception {
        AccessToken token = credential
                .getTokenSync(new TokenRequestContext().addScopes(SCOPE));

        HttpRequest.Builder reqBuilder = HttpRequest.newBuilder(URI.create(BASE + path))
                .header("Authorization", "Bearer " + token.getToken())
                .header("Accept", "application/json")
                .timeout(Duration.ofSeconds(10))
                .GET();
        if (path.contains("$search") || path.contains("$count")) reqBuilder.header("ConsistencyLevel", "eventual");

        HttpRequest request = reqBuilder.build();

        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new RuntimeException("Graph " + path + " returned HTTP " + response.statusCode()
                    + ": " + truncate(response.body()));
        }
        return mapper.readTree(response.body());
    }

    private static String truncate(String body) {
        if (body == null) return "";
        return body.length() > 200 ? body.substring(0, 200) + "…" : body;
    }
}
