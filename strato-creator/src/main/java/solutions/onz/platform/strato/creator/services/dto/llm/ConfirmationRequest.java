package solutions.onz.platform.strato.creator.services.dto.llm;

import lombok.Data;
import java.util.List;

@Data
public class ConfirmationRequest {
    private List<ToolCall> actions;
}
