package solutions.onz.platform.strato.creator.services.dto.llm;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ToolCall {
    private String pluginName;
    private String functionName;
    private Map<String, Object> arguments;
}
