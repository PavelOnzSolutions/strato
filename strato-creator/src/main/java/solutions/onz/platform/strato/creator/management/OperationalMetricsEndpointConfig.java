/*
 * YAKOAI
 * Copyright (c) 2025 Pavel Onz @ Nekorporát s.r.o.
 * All rights reserved.
 */
package solutions.onz.platform.strato.creator.management;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.boot.actuate.autoconfigure.endpoint.condition.ConditionalOnAvailableEndpoint;
import org.springframework.boot.actuate.autoconfigure.metrics.MetricsEndpointAutoConfiguration;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
// @ConditionalOnClass(Timed.class)
@AutoConfigureAfter(MetricsEndpointAutoConfiguration.class)
public class OperationalMetricsEndpointConfig {
    @Bean
    @ConditionalOnBean(MeterRegistry.class)
    @ConditionalOnMissingBean
    @ConditionalOnAvailableEndpoint
    public OperationalMetricsEndpoint stratoMetricsEndpoint(MeterRegistry registry) {
        return new OperationalMetricsEndpoint(registry);
    }
}
