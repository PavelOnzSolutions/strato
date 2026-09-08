package solutions.onz.platform.strato.creator.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public final class DirectoryDtos {

    private DirectoryDtos() {}

    public record DirectoryConfigDto(boolean enabled, String credentialResourceId) {}

    public record DirectoryUserDto(
            String directoryId,
            String displayName,
            String email,
            String upn,
            String department,
            boolean alreadyExists
    ) {}

    public record ImportUserItem(
            @NotNull String directoryId,
            String displayName,
            String email,
            @NotBlank String upn,
            String department
    ) {}

    public record ImportRequest(@NotNull List<ImportUserItem> users) {}

    public record ImportUserResult(String directoryId, String upn, ImportStatus status, String reason) {}

    public record EntraIdTestResponse(boolean success, String message, Long userCount) {}

    public enum ImportStatus { CREATED, ALREADY_EXISTS, FAILED }
}
