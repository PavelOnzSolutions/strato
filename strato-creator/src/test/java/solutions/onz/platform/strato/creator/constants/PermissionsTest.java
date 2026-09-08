package solutions.onz.platform.strato.creator.constants;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PermissionsTest {

    @Test
    void configSectionsWriteImpliesRead() {
        Set<String> implied = Permissions.getImpliedPermissions(Permissions.CONFIG_SECTIONS_WRITE);
        assertThat(implied).containsExactlyInAnyOrder(
                Permissions.CONFIG_SECTIONS_WRITE,
                Permissions.CONFIG_SECTIONS_READ);
    }

    @Test
    void configSectionsReadIsLeaf() {
        Set<String> implied = Permissions.getImpliedPermissions(Permissions.CONFIG_SECTIONS_READ);
        assertThat(implied).containsExactly(Permissions.CONFIG_SECTIONS_READ);
    }

    @Test
    void expandAllIncludesNewScope() {
        Set<String> result = Permissions.expandAll(Set.of(Permissions.CONFIG_SECTIONS_WRITE));
        assertThat(result).containsExactlyInAnyOrder(
                Permissions.CONFIG_SECTIONS_WRITE,
                Permissions.CONFIG_SECTIONS_READ);
    }
}
