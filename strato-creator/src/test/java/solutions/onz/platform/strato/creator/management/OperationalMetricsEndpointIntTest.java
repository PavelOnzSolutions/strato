package solutions.onz.platform.strato.creator.management;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class OperationalMetricsEndpointIntTest {

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private MeterRegistry meterRegistry;

    @Autowired
    private OperationalMetricsEndpoint metricsEndpoint;

    @Test
    void shouldCollectHttpMetrics() {
        // Trigger some HTTP requests
        webTestClient.get().uri("/api/dashboard/stats").exchange().expectStatus().isUnauthorized(); // 401
        webTestClient.get().uri("/api/non-existent").exchange().expectStatus().isNotFound(); // 404

        // Wait a bit for metrics to be recorded (though usually it's synchronous in Micrometer for timers)
        
        // Directly check MeterRegistry to see if metrics are being recorded
        Timer timer401 = meterRegistry.find("http.server.requests")
                .tag("uri", "/api/dashboard/stats")
                .tag("status", "401")
                .timer();
        
        // In some environments, URI might be templated or "NOT_FOUND" for 404
        Timer timer404 = meterRegistry.find("http.server.requests")
                .tag("status", "404")
                .timer();

        Map<String, Object> allMetrics = metricsEndpoint.allMetrics();
        assertThat(allMetrics).containsKey("httpMetrics");
        
        Map<String, Map<String, Number>> httpMetrics = (Map<String, Map<String, Number>>) allMetrics.get("httpMetrics");
        
        // We expect only the "cumulative" entry
        assertThat(httpMetrics).containsKey("cumulative");
        assertThat(httpMetrics).hasSize(1);
        
        Map<String, Number> cumulative = httpMetrics.get("cumulative");
        assertThat(cumulative.get("total.count").longValue()).isGreaterThanOrEqualTo(1);
        
        // Check if we have specific status codes in cumulative
        boolean has401 = cumulative.containsKey("count.401");
        boolean has404 = cumulative.containsKey("count.404");
        
        assertThat(has401 || has404).as("Should have recorded either 401 or 404 in cumulative metrics").isTrue();
        
        if (has401) {
            assertThat(cumulative.get("count.401").longValue()).isGreaterThanOrEqualTo(1);
            assertThat(cumulative.get("mean.401").doubleValue()).isGreaterThanOrEqualTo(0);
        }
        
        // Client errors should be tracked
        assertThat(cumulative.get("errors.client").longValue()).isGreaterThanOrEqualTo(1);
    }
}
