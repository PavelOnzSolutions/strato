package solutions.onz.platform.strato.creator.services;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatCode;

class ConfigurationDataValidatorOrphanTest {

    private final ConfigurationDataValidator validator = new ConfigurationDataValidator();

    @Test
    void validate_does_not_throw_on_field_outside_schema() {
        java.util.Map<String, Object> materializedSchema = java.util.Map.of(
                "properties", java.util.Map.of(
                        "sectionA", java.util.Map.of(
                                "additionalProperties", java.util.Map.of(
                                        "properties", java.util.Map.of(
                                                "known", java.util.Map.of("type", "string"))))));
        java.util.Map<String, java.util.Map<String, java.util.Map<String, Object>>> data =
                java.util.Map.of("sectionA",
                        java.util.Map.of("item1",
                                java.util.Map.of("known", "x", "orphan", "y")));

        assertThatCode(() -> validator.validateConfigurationData(data, materializedSchema))
                .doesNotThrowAnyException();
    }
}
