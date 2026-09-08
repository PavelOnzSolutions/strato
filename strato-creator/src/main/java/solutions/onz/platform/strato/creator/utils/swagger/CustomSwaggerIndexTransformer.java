package solutions.onz.platform.strato.creator.utils.swagger;

import org.springdoc.core.customizers.SpringDocCustomizers;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springdoc.core.properties.SwaggerUiOAuthProperties;
import org.springdoc.core.providers.ObjectMapperProvider;
import org.springdoc.webmvc.ui.SwaggerIndexPageTransformer;
import org.springdoc.webmvc.ui.SwaggerWelcomeCommon;
import org.springframework.stereotype.Component;


@Component
public class CustomSwaggerIndexTransformer extends SwaggerIndexPageTransformer {

    public CustomSwaggerIndexTransformer(SwaggerUiConfigProperties swaggerUiConfig,
                                         SwaggerUiOAuthProperties swaggerUiOAuthProperties,
                                         SwaggerWelcomeCommon swaggerWelcomeCommon,
                                         ObjectMapperProvider objectMapperProvider) {
        super(swaggerUiConfig, swaggerUiOAuthProperties, swaggerWelcomeCommon, objectMapperProvider );
    }

    @Override
    protected String overwriteSwaggerDefaultUrl(String html) {
        String result = super.overwriteSwaggerDefaultUrl(html);

        // Inject token from query parameter
        String tokenScript = """
            <script>
            (function() {
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token');
                if (token) {
                    const originalFetch = window.fetch;
                    window.fetch = function(url, options = {}) {
                        options.headers = options.headers || {};
                        options.headers['Authorization'] = 'Bearer ' + token;
                        return originalFetch(url, options);
                    };
                }
            })();
            </script>
            """;

        return result.replace("</head>", tokenScript + "</head>");
    }
}