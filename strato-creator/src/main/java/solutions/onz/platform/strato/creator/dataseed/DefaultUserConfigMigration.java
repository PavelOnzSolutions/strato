package solutions.onz.platform.strato.creator.dataseed;

import solutions.onz.platform.strato.creator.domain.UserConfiguration;
import solutions.onz.platform.strato.creator.repositories.UserConfigurationRepository;
import io.mongock.api.annotations.RollbackExecution;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Creates a UserConfiguration with the name "_default", dark theme, en-US language and Fidoo color
 */
@Slf4j
@RequiredArgsConstructor
public class DefaultUserConfigMigration {

    private final UserConfigurationRepository userConfigurationRepository;

    public void run() {
        log.info("Creating default user configuration");
        UserConfiguration defaultConfig = new UserConfiguration().setName("_default").setColor("fidoo").setLanguage("en-US").setTheme("dark");
        userConfigurationRepository.save(defaultConfig);
    }

    @RollbackExecution
    public void rollback() {
        userConfigurationRepository.deleteByName("_default");
    }
}
