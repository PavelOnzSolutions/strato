package solutions.onz.platform.strato.creator.services;

import solutions.onz.platform.strato.creator.domain.UserAccount;
import solutions.onz.platform.strato.creator.domain.UserConfiguration;
import solutions.onz.platform.strato.creator.domain.enums.UserSource;
import solutions.onz.platform.strato.creator.repositories.UserAccountRepository;
import solutions.onz.platform.strato.creator.repositories.UserConfigurationRepository;
import solutions.onz.platform.strato.creator.services.dto.UserAccountView;
import solutions.onz.platform.strato.creator.api.dto.DirectoryDtos;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserManagementServiceTest {

    @Mock
    private UserAccountRepository userRepo;

    @Mock
    private UserConfigurationRepository userConfigurationRepo;

    private UserManagementService service;

    @BeforeEach
    void setUp() {
        try (var ignored = MockitoAnnotations.openMocks(this)) {
            service = new UserManagementService(userRepo, userConfigurationRepo);
        } catch (Exception e) {
            fail(e);
        }
    }

    @Test
    void updateRoles_shouldUpdateUserRoles() {
        // Given
        String username = "testuser";
        List<String> newRoles = List.of("ADMIN", "ENGINEER");
        UserAccount user = new UserAccount().setUsername(username).setRoles(List.of("USER"));
        
        when(userRepo.findByUsername(username)).thenReturn(Optional.of(user));
        when(userRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        UserAccountView result = service.updateRoles(username, newRoles);

        // Then
        assertNotNull(result);
        assertEquals(newRoles, result.roles());
        verify(userRepo).save(user);
        assertEquals("ADMIN,ENGINEER", user.getRolesCsv());
    }

    @Test
    void updateRoles_shouldThrowExceptionIfUserNotFound() {
        // Given
        String username = "nonexistent";
        when(userRepo.findByUsername(username)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(IllegalArgumentException.class, () -> service.updateRoles(username, List.of("ADMIN")));
    }

    @Test
    void importFromDirectoryCreatesSynchronizedUser() {
        when(userRepo.findByUsername("alice@example.com")).thenReturn(Optional.empty());
        when(userConfigurationRepo.save(any(UserConfiguration.class)))
                .thenAnswer(inv -> inv.getArgument(0, UserConfiguration.class).setId("cfg-1"));
        when(userRepo.save(any(UserAccount.class)))
                .thenAnswer(inv -> inv.getArgument(0, UserAccount.class).setId("user-1"));

        DirectoryDtos.ImportUserItem item = new DirectoryDtos.ImportUserItem(
                "dir-1", "Alice", "alice@example.com", "alice@example.com", "Eng");

        DirectoryDtos.ImportUserResult result = service.importFromDirectory(item);

        assertThat(result.status()).isEqualTo(DirectoryDtos.ImportStatus.CREATED);
        assertThat(result.upn()).isEqualTo("alice@example.com");
        ArgumentCaptor<UserAccount> captor = ArgumentCaptor.forClass(UserAccount.class);
        verify(userRepo).save(captor.capture());
        UserAccount saved = captor.getValue();
        assertThat(saved.getUsername()).isEqualTo("alice@example.com");
        assertThat(saved.getSource()).isEqualTo(UserSource.SYNCHRONIZED);
        assertThat(saved.getRoles()).containsExactly("USER");
        assertThat(saved.getEmail()).isEqualTo("alice@example.com");
        assertThat(saved.getDisplayName()).isEqualTo("Alice");
        assertThat(saved.isEnabled()).isTrue();
    }

    @Test
    void importFromDirectorySkipsWhenUsernameExists() {
        when(userRepo.findByUsername("alice@example.com"))
                .thenReturn(Optional.of(new UserAccount().setUsername("alice@example.com")));

        DirectoryDtos.ImportUserItem item = new DirectoryDtos.ImportUserItem(
                "dir-1", "Alice", "alice@example.com", "alice@example.com", "Eng");

        DirectoryDtos.ImportUserResult result = service.importFromDirectory(item);

        assertThat(result.status()).isEqualTo(DirectoryDtos.ImportStatus.ALREADY_EXISTS);
        verify(userRepo, never()).save(any());
    }

    @Test
    void importFromDirectoryReturnsFailedOnRepositoryError() {
        when(userRepo.findByUsername("alice@example.com")).thenReturn(Optional.empty());
        when(userConfigurationRepo.save(any(UserConfiguration.class)))
                .thenAnswer(inv -> inv.getArgument(0, UserConfiguration.class).setId("cfg-1"));
        when(userRepo.save(any(UserAccount.class)))
                .thenThrow(new RuntimeException("duplicate key"));

        DirectoryDtos.ImportUserItem item = new DirectoryDtos.ImportUserItem(
                "dir-1", "Alice", "alice@example.com", "alice@example.com", "Eng");

        DirectoryDtos.ImportUserResult result = service.importFromDirectory(item);

        assertThat(result.status()).isEqualTo(DirectoryDtos.ImportStatus.FAILED);
        assertThat(result.reason()).contains("duplicate key");
    }

    @Test
    void updateUser_shouldUpdateAllFieldsForLocalUser() {
        String username = "alice";
        UserAccount user = new UserAccount()
                .setUsername(username)
                .setSource(UserSource.LOCAL)
                .setDisplayName("Old Name")
                .setEmail("old@example.com")
                .setEnabled(true);

        when(userRepo.findByUsername(username)).thenReturn(Optional.of(user));
        when(userRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserAccountView result = service.updateUser(username, false, "New Name", "new@example.com");

        assertNotNull(result);
        assertEquals("New Name", result.displayName());
        assertEquals("new@example.com", result.email());
        assertFalse(result.enabled());
        verify(userRepo).save(user);
    }

    @Test
    void updateUser_shouldRejectDisplayNameChangeForSynchronizedUser() {
        String username = "bob";
        UserAccount user = new UserAccount()
                .setUsername(username)
                .setSource(UserSource.SYNCHRONIZED)
                .setDisplayName("Sync Name");
        when(userRepo.findByUsername(username)).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class,
                () -> service.updateUser(username, null, "Changed Name", null));
        verify(userRepo, never()).save(any());
    }

    @Test
    void updateUser_shouldAllowEnabledToggleForSynchronizedUser() {
        String username = "bob";
        UserAccount user = new UserAccount()
                .setUsername(username)
                .setSource(UserSource.SYNCHRONIZED)
                .setEnabled(true);
        when(userRepo.findByUsername(username)).thenReturn(Optional.of(user));
        when(userRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserAccountView result = service.updateUser(username, false, null, null);

        assertFalse(result.enabled());
        verify(userRepo).save(user);
    }

    @Test
    void updateUser_shouldThrowWhenUserNotFound() {
        when(userRepo.findByUsername("ghost")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class,
                () -> service.updateUser("ghost", true, null, null));
    }
}
