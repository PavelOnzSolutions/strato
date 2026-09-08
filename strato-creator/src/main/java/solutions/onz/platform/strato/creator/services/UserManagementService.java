package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.UserAccount;
import solutions.onz.platform.strato.creator.domain.UserConfiguration;
import solutions.onz.platform.strato.creator.domain.enums.UserSource;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import solutions.onz.platform.strato.creator.repositories.UserConfigurationRepository;
import solutions.onz.platform.strato.creator.services.dto.UserAccountView;
import solutions.onz.platform.strato.creator.utils.PasswordUtils;
import solutions.onz.platform.strato.creator.api.dto.DirectoryDtos;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service for managing user accounts.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserManagementService {

    private final UserAccountRepository userRepo;
    private final UserConfigurationRepository userConfigurationRepo;

    /**
     * Retrieves all user accounts.
     * @return List of user account views
     */
    @PreAuthorize("hasAnyAuthority({@permissions.USER_WRITE, @permissions.USER_READ})")
    public List<UserAccountView> listAll() {
        return userRepo.findAll().stream()
                .map(UserAccountView::of)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a user account by username.
     * @param username The username to search for
     * @return Optional user account view
     */
    @PreAuthorize("hasAnyAuthority({@permissions.USER_WRITE, @permissions.USER_READ}) or #username == authentication.name")
    public Optional<UserAccountView> getByUsername(String username) {
        if (!StringUtils.hasText(username))
            return Optional.empty();

        return userRepo.findByUsername(username).map(UserAccountView::of);
    }

    /**
     * Changes the password of a user account.
     * @param username The username of the user account
     * @param oldPassword The current password of the user account
     * @param newPassword The new password for the user account
     * @return true if the password was changed successfully, false otherwise
     */
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE) or #username == authentication.name")
    public boolean changePassword(String username, String oldPassword, String newPassword) {
        Objects.requireNonNull(username, "username is required");
        validateNewPassword(newPassword);
        UserAccount user = userRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        ensureLocalAccount(user);
        if (!PasswordUtils.matches(Optional.ofNullable(oldPassword).orElse(""), user.getPasswordHash())) {
            return false;
        }
        user.setPasswordHash(PasswordUtils.hash(newPassword));
        userRepo.save(user);
        return true;
    }

    /**
     * Changes the password of an Admin user account.
     * @param username The username of the user account
     * @param newPassword The new password for the user account
     */
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE)")
    public void changePasswordAdmin(String username, String newPassword) {
        Objects.requireNonNull(username, "username is required");
        validateNewPassword(newPassword);
        UserAccount user = userRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        ensureLocalAccount(user);
        user.setPasswordHash(PasswordUtils.hash(newPassword));
        userRepo.save(user);
    }

    /**
     * Creates a new user account. Assigns a default configuration from a template named _default.
     * In case the _default template is missing, add a new empty config
     * @param username The username for the new user account
     * @param password The password for the new user account
     * @param roles The roles for the new user account
     * @return The created user account view
     */
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE)")
    public UserAccountView createUser(String username, String password, List<String> roles) {
        Objects.requireNonNull(username, "username is required");
        Objects.requireNonNull(password, "password is required");
        validateNewPassword(password);

        if (userRepo.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("User already exists");
        }

        UserConfiguration defaultConfig = defaultUserConfiguration(username);

        UserAccount user = new UserAccount()
                .setUsername(username)
                .setPasswordHash(PasswordUtils.hash(password))
                .setRoles(roles != null ? roles : List.of("USER"))
                .setSource(UserSource.LOCAL)
                .setEnabled(true)
                .setPreferences(
                        userConfigurationRepo.save(defaultConfig)
                );


        return UserAccountView.of(userRepo.save(user));
    }

    /**
     * Updates the roles of a user account.
     * @param username The username of the user account
     * @param roles The new roles for the user account
     * @return The updated user account view
     */
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE) or #username == authentication.name")
    public UserAccountView updateRoles(String username, List<String> roles) {
        Objects.requireNonNull(username, "username is required");
        UserAccount user = userRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setRoles(roles);
        return UserAccountView.of(userRepo.save(user));
    }

    /**
     * Partially updates a user account. Null fields are ignored.
     * displayName and email may only be changed for LOCAL users.
     * enabled is always allowed.
     */
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE)")
    public UserAccountView updateUser(String username, Boolean enabled, String displayName, String email) {
        Objects.requireNonNull(username, "username is required");
        UserAccount user = userRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (displayName != null || email != null) {
            if (user.getSource() != UserSource.LOCAL) {
                throw new IllegalArgumentException("displayName and email can only be changed for LOCAL users");
            }
        }

        if (enabled != null) {
            user.setEnabled(enabled);
        }
        if (displayName != null) {
            user.setDisplayName(displayName);
        }
        if (email != null) {
            user.setEmail(email.isBlank() ? null : email);
        }

        return UserAccountView.of(userRepo.save(user));
    }

    /**
     * Deletes a user account.
     * @param username The username of the user account
     */
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE) or #username == authentication.name")
    public void deleteUser(String username) {
        userRepo.deleteByUsername(username);
    }


    /**
     * Imports a single user from the directory. Idempotent: if a user with the same UPN
     * already exists, returns ALREADY_EXISTS without touching the database.
     */
    @PreAuthorize("hasAuthority(@permissions.USER_WRITE)")
    public DirectoryDtos.ImportUserResult importFromDirectory(DirectoryDtos.ImportUserItem item) {
        Objects.requireNonNull(item, "item is required");
        Objects.requireNonNull(item.upn(), "upn is required");

        if (userRepo.findByUsername(item.upn()).isPresent()) {
            return new DirectoryDtos.ImportUserResult(
                    item.directoryId(), item.upn(),
                    DirectoryDtos.ImportStatus.ALREADY_EXISTS, null);
        }

        try {
            UserConfiguration savedConfig = userConfigurationRepo.save(defaultUserConfiguration(item.upn()));
            UserAccount user = new UserAccount()
                    .setUsername(item.upn())
                    .setDisplayName(item.displayName())
                    .setEmail(item.email())
                    .setRoles(List.of("USER"))
                    .setSource(UserSource.SYNCHRONIZED)
                    .setEnabled(true)
                    .setPreferences(savedConfig);
            userRepo.save(user);
            return new DirectoryDtos.ImportUserResult(
                    item.directoryId(), item.upn(),
                    DirectoryDtos.ImportStatus.CREATED, null);
        } catch (Exception e) {
            log.warn("Failed to import directory user {}: {}", item.upn(), e.getMessage());
            return new DirectoryDtos.ImportUserResult(
                    item.directoryId(), item.upn(),
                    DirectoryDtos.ImportStatus.FAILED, e.getMessage());
        }
    }

    private static UserConfiguration defaultUserConfiguration(String name) {
        return new UserConfiguration()
                .setTheme("dark")
                .setColor("fidoo")
                .setLanguage("en-US")
                .setDefaultFont("Sansation")
                .setCodeFont("Fira Code")
                .setBackgroundType("forest")
                .setRadiusType("large")
                .setName(name);
    }

    private static void validateNewPassword(String newPassword) {
        if (!StringUtils.hasText(newPassword) || newPassword.length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters long");
        }
    }

    private static void ensureLocalAccount(UserAccount user) {
        if (user.getSource() == UserSource.OAUTH2 || user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw new IllegalStateException("Password change is allowed only for local accounts");
        }
    }
}
