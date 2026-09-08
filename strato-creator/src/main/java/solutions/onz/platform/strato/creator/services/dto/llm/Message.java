package solutions.onz.platform.strato.creator.services.dto.llm;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Message {
    private String role; // "user" or "assistant"
    private String content;
}
