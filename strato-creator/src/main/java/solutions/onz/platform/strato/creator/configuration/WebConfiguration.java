package solutions.onz.platform.strato.creator.configuration;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfiguration implements WebMvcConfigurer {
    private final ApplicationProperties applicationProperties;

    public WebConfiguration(ApplicationProperties applicationProperties) {
        this.applicationProperties = applicationProperties;
    }
}