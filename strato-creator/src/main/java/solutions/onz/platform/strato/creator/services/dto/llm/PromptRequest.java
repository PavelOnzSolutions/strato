package solutions.onz.platform.strato.creator.services.dto.llm;

import lombok.Data;
import java.util.List;

@Data
public class PromptRequest {
    private String prompt;
    private List<Message> history; // Previous conversation messages (user/assistant)
}
