package solutions.onz.platform.strato.creator.workflow.handlers;

import solutions.onz.platform.strato.creator.workflow.domain.WorkflowDefinition.WorkflowStepDefinition;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class RestActionHandler implements ActionHandler {

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String getType() {
        return "REST_CALL";
    }

    @Override
    public ActionResult execute(WorkflowStepDefinition step, Map<String, Object> variables) {
        String url = (String) step.getConfig().get("url");
        String method = (String) step.getConfig().getOrDefault("method", "GET");
        Map<String, String> headers = (Map<String, String>) step.getConfig().get("headers");
        Object body = step.getConfig().get("body");

        // Resolve variables in URL (simple {{var}} replacement)
        if (url != null) {
            for (Map.Entry<String, Object> entry : variables.entrySet()) {
                url = url.replace("{{" + entry.getKey() + "}}", String.valueOf(entry.getValue()));
            }
        }

        try {
            HttpHeaders httpHeaders = new HttpHeaders();
            if (headers != null) {
                headers.forEach(httpHeaders::add);
            }
            if (!httpHeaders.containsKey(HttpHeaders.CONTENT_TYPE)) {
                httpHeaders.setContentType(MediaType.APPLICATION_JSON);
            }

            HttpEntity<Object> entity = new HttpEntity<>(body, httpHeaders);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.valueOf(method), entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                return ActionResult.success(response.getBody());
            } else {
                return ActionResult.failure("REST call failed with status: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("REST call to {} failed: {}", url, e.getMessage());
            return ActionResult.failure("REST call failed: " + e.getMessage());
        }
    }
}
