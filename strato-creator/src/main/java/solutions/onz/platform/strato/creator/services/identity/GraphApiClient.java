package solutions.onz.platform.strato.creator.services.identity;

import com.fasterxml.jackson.databind.JsonNode;
import com.azure.core.credential.TokenCredential;

/** Pluggable HTTP transport for Microsoft Graph GET calls so the lookup service can be unit-tested. */
public interface GraphApiClient {
    /**
     * GET https://graph.microsoft.com/v1.0/{path}. Throws on non-2xx responses.
     * @param credential token source; implementations are responsible for token acquisition + caching as needed.
     * @param path Graph path beginning after {@code /v1.0/}, e.g., "organization" or "me".
     */
    JsonNode get(TokenCredential credential, String path) throws Exception;
}
