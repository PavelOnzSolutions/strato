package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.UserAccount;
import solutions.onz.platform.strato.creator.domain.UserConfiguration;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import solutions.onz.platform.strato.creator.repositories.UserConfigurationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@RequiredArgsConstructor
@Service
public class UserConfigurationService {

    private final UserConfigurationRepository userConfigurationRepository;
    private final UserAccountRepository userAccountRepository;

    /**
     * Returns the default user configuration.
     * @return
     */
    public Optional<UserConfiguration> getDefaultUserConfiguration() {
        return userConfigurationRepository.findByName("_default");
    }

    /**
     * Retrieves the configuration for a specific user.
     * @param username current username
     * @return UserConfiguration
     */
    public Optional<UserConfiguration> getConfigurationForUser(String username) {
        return userAccountRepository.findByUsername(username)
                .map(UserAccount::getPreferences);
    }

    /**
     * Updates the user configuration.
     * @param username current username
     * @param configuration new configuration object
     * @return updated UserConfiguration
     */
    public UserConfiguration setUserConfiguration(String username, UserConfiguration configuration) {
        UserAccount user = userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        UserConfiguration currentConfig = user.getPreferences();
        if (currentConfig == null) {
            // Should not happen if user was created via UserManagementService, but for safety:
            configuration.setName(username);
            currentConfig = userConfigurationRepository.save(configuration);
            user.setPreferences(currentConfig);
            userAccountRepository.save(user);
        } else {
            // Update existing
            currentConfig.setLanguage(configuration.getLanguage())
                    .setTheme(configuration.getTheme())
                    .setColor(configuration.getColor())
                    .setRadiusType(configuration.getRadiusType())
                    .setDefaultFont(configuration.getDefaultFont())
                    .setCodeFont(configuration.getCodeFont())
                    .setBackgroundType(configuration.getBackgroundType());
            currentConfig = userConfigurationRepository.save(currentConfig);
        }

        return currentConfig;
    }

    /**
     * Deletes the configuration settings associated with a specific user.
     * This method removes any stored preferences for the user identified by the given username.
     *
     * @param username the username of the user whose configuration is being deleted
     */
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE) or #username == authentication.name")
    public void deleteUserConfiguration(String username) {
        userAccountRepository.findByUsername(username)
                .ifPresent(user -> {
                    userConfigurationRepository.deleteById(user.getPreferences().getId());
                    userAccountRepository.save(user);
                });

    }
}
