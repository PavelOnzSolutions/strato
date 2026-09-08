package solutions.onz.platform.strato.creator.domain;

import solutions.onz.platform.strato.creator.domain.enums.CatalogItemType;
import solutions.onz.platform.strato.creator.domain.enums.ResourceType;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ResourceClassTest {

    @Test
    void testCatalogResourceClass() {
        CatalogDefinition catalogDefinition = CatalogDefinition.builder()
                .itemType(CatalogItemType.STRING)
                .build();

        ResourceClass resourceClass = new ResourceClass()
                .setName("String Catalog")
                .setType(ResourceType.CATALOG)
                .setCatalogDefinition(catalogDefinition);

        assertEquals("String Catalog", resourceClass.getName());
        assertEquals(ResourceType.CATALOG, resourceClass.getType());
        assertNotNull(resourceClass.getCatalogDefinition());
        assertEquals(CatalogItemType.STRING, resourceClass.getCatalogDefinition().getItemType());
    }

    @Test
    void testCatalogWithResourceClassReference() {
        CatalogDefinition catalogDefinition = CatalogDefinition.builder()
                .itemType(CatalogItemType.RESOURCE_CLASS)
                .resourceClassId("target-resource-class-id")
                .build();

        ResourceClass resourceClass = new ResourceClass()
                .setName("Complex Catalog")
                .setType(ResourceType.CATALOG)
                .setCatalogDefinition(catalogDefinition);

        assertEquals(CatalogItemType.RESOURCE_CLASS, resourceClass.getCatalogDefinition().getItemType());
        assertEquals("target-resource-class-id", resourceClass.getCatalogDefinition().getResourceClassId());
    }

    @Test
    void testProcessResourceClass() {
        ResourceClass resourceClass = new ResourceClass()
                .setName("Onboarding Process")
                .setType(ResourceType.PROCESS)
                .setWorkflowDefinitionId("workflow-123")
                .setInputMappings(Map.of("wf_var1", "{{name}}", "wf_var2", "{{defaults_var}}"))
                .setOutputMappings(Map.of("res_out1", "wf_out1"));

        assertEquals("Onboarding Process", resourceClass.getName());
        assertEquals(ResourceType.PROCESS, resourceClass.getType());
        assertEquals("workflow-123", resourceClass.getWorkflowDefinitionId());
        assertEquals("{{name}}", resourceClass.getInputMappings().get("wf_var1"));
        assertEquals("wf_out1", resourceClass.getOutputMappings().get("res_out1"));
    }
}
