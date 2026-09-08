package solutions.onz.platform.strato.creator.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserAccountTest {

    @Test
    void exposesDisplayNameAndEmail() {
        UserAccount user = new UserAccount()
                .setUsername("alice@example.com")
                .setDisplayName("Alice Liddell")
                .setEmail("alice@example.com");

        assertThat(user.getDisplayName()).isEqualTo("Alice Liddell");
        assertThat(user.getEmail()).isEqualTo("alice@example.com");
    }
}
