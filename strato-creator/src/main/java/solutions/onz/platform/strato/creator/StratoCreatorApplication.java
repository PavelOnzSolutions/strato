package solutions.onz.platform.strato.creator;

import solutions.onz.platform.strato.creator.configuration.ApplicationProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.scheduling.annotation.EnableAsync;

import static org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO;

@Slf4j
@EnableConfigurationProperties({ ApplicationProperties.class })
@EnableAsync
@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)
@SpringBootApplication
public class StratoCreatorApplication {

    public static void main(String[] args) {
        SpringApplication.run(StratoCreatorApplication.class, args);
    }

}
