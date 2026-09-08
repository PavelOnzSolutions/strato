package solutions.onz.platform.strato.creator.services.dto;

import solutions.onz.platform.strato.creator.domain.UserAccount;
import solutions.onz.platform.strato.creator.domain.enums.UserSource;

import java.util.List;

public record UserAccountView(
        String id,
        String username,
        String displayName,
        String email,
        List<String> roles,
        String imageUrl,
        boolean enabled,
        UserSource source
) {
    public static UserAccountView of(UserAccount ua) {
        return new UserAccountView(
                ua.getId(),
                ua.getUsername(),
                ua.getDisplayName(),
                ua.getEmail(),
                ua.getRoles(),
                ua.getImageUrl(),
                ua.isEnabled(),
                ua.getSource()
        );
    }
}
