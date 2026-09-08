package solutions.onz.platform.strato.creator.domain;

import lombok.*;
import lombok.experimental.Accessors;

@ToString
@EqualsAndHashCode
@Builder
@Getter
@Accessors(chain = true)
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Coordinates2D {
    private int x;
    private int y;
}
