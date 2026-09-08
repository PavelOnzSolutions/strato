package solutions.onz.platform.strato.creator.services;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConfigurationDataValidatorMapTest {

    private final ConfigurationDataValidator validator = new ConfigurationDataValidator();

    /** Materialized schema for a section "sectionA" whose item has one MAP_OF_STRING field "props". */
    private Map<String, Object> materializedWithMapField() {
        return Map.of("properties", Map.of(
                "sectionA", Map.of(
                        "additionalProperties", Map.of(
                                "properties", Map.of(
                                        "props", Map.of(
                                                "type", "object",
                                                "additionalProperties", Map.of("type", "string")))))));
    }

    @Test
    void validate_acceptsMapValueForMapField() {
        Map<String, Map<String, Map<String, Object>>> data = Map.of("sectionA",
                Map.of("item1", Map.of("props", Map.of("DIA_PARTY_API", "FXC(bw-party)"))));

        assertThatCode(() -> validator.validateConfigurationData(data, materializedWithMapField()))
                .doesNotThrowAnyException();
    }

    @Test
    void validate_rejectsNonMapValueForMapField() {
        Map<String, Map<String, Map<String, Object>>> data = Map.of("sectionA",
                Map.of("item1", Map.of("props", List.of("not", "a", "map"))));

        assertThatThrownBy(() -> validator.validateConfigurationData(data, materializedWithMapField()))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
