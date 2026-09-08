package solutions.onz.platform.strato.creator.domain;

import solutions.onz.platform.strato.creator.domain.enums.CatalogItemType;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ToString
public class CatalogDefinition {
    private CatalogItemType itemType;
    private String resourceClassId; // Used if itemType is RESOURCE_CLASS
}
