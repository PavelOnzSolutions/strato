package solutions.onz.platform.strato.creator.configuration;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

@Getter
@ConfigurationProperties(prefix = "strato", ignoreUnknownFields = false)
public class ApplicationProperties {

    private final Security security = new Security();
    private final Frontend frontend = new Frontend();
    private final AzureArm azureArm = new AzureArm();
    private final Llm llm = new Llm();

    @Setter
    @Getter
    public static class Frontend {
        private String baseUrl = "http://localhost:5173";
    }

    @Getter
    public static class Security {
        private final Jwt jwt = new Jwt();
        private final Issuance issuance = new Issuance();
        private final Azure azure = new Azure();
        private final Csp csp = new Csp();
        private final Encryption encryption = new Encryption();

        @Setter
        @Getter
        public static class Csp {
            private String policyDirectives = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';";
        }

        @Setter
        @Getter
        public static class Jwt {
            private String issuer = "http://localhost:8080";
            private long ttlSeconds = 3600;
            private long apiTokenTtlSeconds = 315360000; // 10 years by default
            private String privateKeyLocation = "classpath:keys/private.pem";
            private String publicKeyLocation = "classpath:keys/public.pem";
            private int maxRefreshCount = 10;
            private long absoluteExpirationSeconds = 28800; // 8 hours

        }

        @Setter
        @Getter
        public static class Issuance {
            private String apiKey = "change-me"; // In production place in Key Vault

        }

        @Setter
        @Getter
        public static class Azure {
            private String issuerUri = ""; // e.g., https://login.microsoftonline.com/{tenantId}/v2.0
            /**
             * Name of the Azure Key Vault instance to use (without protocol/domain).
             */
            private String keyVaultName = ""; // e.g., my-key-vault
            /**
             * Secret name that stores the encryption master key.
             */
            private String masterKeySecretName = "strato-master-key";
            /**
             * Secret name that stores the backup encryption master key. Used for seamless key rotation.
             */
            private String masterKeyBackupSecretName = "strato-master-key-backup";
            /**
             * Azure AD tenant ID used for app-only Graph authentication.
             */
            private String tenantId = "";
            /**
             * Client ID of the Azure AD app used for app-only Graph authentication.
             */
            private String clientId = "";
            /**
             * Client secret of the Azure AD app used for app-only Graph authentication.
             */
            private String clientSecret = "";
        }

        @Setter
        @Getter
        public static class Encryption {
            /**
             * Master key for secret config values encryption (if provided, it takes precedence over Key Vault) <b>Never ever use in production !!!</b>.
             */
            private String masterKeyConfig = "";
            /**
             * Master key for backup signing (if provided, it takes precedence over Key Vault) <b>Never ever use in production !!!</b>.
             */
            private String masterKeyBackup = "";
        }
    }

    @Setter
    @Getter
    public static class AzureArm {
        /**
         * Default subscription if not supplied in EnvironmentConfig.
         */
        private String subscriptionId = "";
        /**
         * Default region if not supplied in EnvironmentConfig.
         */
        private String defaultRegion = "westeurope";
    }

    @Getter
    @Setter
    public static class Llm {
        private String deploymentName = "gpt-4o";
        private String endpoint = "";
        private String apiKey = "";
        private String systemPrompt = "You are Mr. Strato Man, an expert in DevOps and Azure architecture. " +
                "You help users manage environments and design cloud infrastructure.";
        private final BingSearch bingSearch = new BingSearch();
        private final DuckDuckGo duckDuckGo = new DuckDuckGo();

        @Getter
        @Setter
        public static class BingSearch {
            private String apiKey = "";
            private String endpoint = "https://api.bing.microsoft.com/v7.0/search";
        }

        @Getter
        @Setter
        public static class DuckDuckGo {
            private String endpoint = "https://html.duckduckgo.com/html/";
            private boolean enabled = true;
        }
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

}
