package solutions.onz.platform.strato.creator.services.dto.llm;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PromptResponse {
    private String answer;
    private List<ToolCall> actions;
}
