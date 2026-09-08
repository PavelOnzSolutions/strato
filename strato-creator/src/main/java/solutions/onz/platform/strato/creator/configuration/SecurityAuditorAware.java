package solutions.onz.platform.strato.creator.configuration;

import solutions.onz.platform.strato.creator.utils.SecurityUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;

import java.util.Optional;

@Configuration
public class SecurityAuditorAware {

    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> Optional.ofNullable(SecurityUtils.getCurrentUserLogin());
    }
}
