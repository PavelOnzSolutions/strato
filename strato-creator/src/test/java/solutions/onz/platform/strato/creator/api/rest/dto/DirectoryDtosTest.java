package solutions.onz.platform.strato.creator.api.rest.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import solutions.onz.platform.strato.creator.api.dto.DirectoryDtos;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DirectoryDtosTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void serialisesDirectoryUserDto() throws Exception {
        DirectoryDtos.DirectoryUserDto dto = new DirectoryDtos.DirectoryUserDto(
                "id-1", "Alice", "alice@example.com", "alice@example.com",
                "Engineering", false);

        String json = mapper.writeValueAsString(dto);

        assertThat(json).contains("\"alreadyExists\":false");
        assertThat(json).contains("\"upn\":\"alice@example.com\"");
    }

    @Test
    void importStatusValuesAreStable() {
        assertThat(DirectoryDtos.ImportStatus.values())
                .extracting(Enum::name)
                .containsExactly("CREATED", "ALREADY_EXISTS", "FAILED");
    }
}
