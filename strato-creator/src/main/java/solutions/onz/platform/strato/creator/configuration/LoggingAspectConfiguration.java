/*
 * YAKOAI
 * Copyright (c) 2025 Pavel Onz @ Nekorporát s.r.o.
 * All rights reserved.
 */
package solutions.onz.platform.strato.creator.configuration;

import solutions.onz.platform.strato.creator.aop.LoggingAspect;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;

@Configuration
@EnableAspectJAutoProxy
public class LoggingAspectConfiguration {
    @Bean
    @Profile({"dev", "local"})
    public LoggingAspect loggingAspect(Environment env) {
        return new LoggingAspect(env);
    }
}
