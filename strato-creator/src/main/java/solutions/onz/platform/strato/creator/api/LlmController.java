package solutions.onz.platform.strato.creator.api;

import solutions.onz.platform.strato.creator.services.LlmService;
import solutions.onz.platform.strato.creator.services.dto.llm.ConfirmationRequest;
import solutions.onz.platform.strato.creator.services.dto.llm.PromptRequest;
import solutions.onz.platform.strato.creator.services.dto.llm.PromptResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/llm")
@RequiredArgsConstructor
@Tag(name = "Assistant API", description = "LLM-powered assistant for DevOps and Azure architecture")
public class LlmController {
    private final LlmService llmService;

    @PostMapping("/prompt")
    public ResponseEntity<PromptResponse> prompt(@RequestBody PromptRequest request) {
        PromptResponse response = llmService.processPrompt(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/confirm")
    public ResponseEntity<String> confirm(@RequestBody ConfirmationRequest request) {
        String result = llmService.executeConfirmedActions(request.getActions());
        return ResponseEntity.ok(result);
    }
}
