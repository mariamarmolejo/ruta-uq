package com.rutauq.backend.modules.payments.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;

@Configuration
@RequiredArgsConstructor
public class MercadoPagoHttpConfig {

    private final MercadoPagoProperties properties;

    /**
     * RestTemplate pre-configured with the MP access token.
     * All requests to the Mercado Pago API must go through this bean.
     */
    @Bean("mercadoPagoRestTemplate")
    public RestTemplate mercadoPagoRestTemplate() {
        RestTemplate template = new RestTemplate();
        template.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().setBearerAuth(properties.getAccessToken());
            request.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            request.getHeaders().set("Accept", MediaType.APPLICATION_JSON_VALUE);
            return execution.execute(request, body);
        });
        return template;
    }
}
