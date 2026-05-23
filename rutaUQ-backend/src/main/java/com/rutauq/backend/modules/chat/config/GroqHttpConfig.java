package com.rutauq.backend.modules.chat.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;

@Configuration
@RequiredArgsConstructor
public class GroqHttpConfig {

    private final GroqProperties properties;

    @Bean
    @Qualifier("groqRestTemplate")
    public RestTemplate groqRestTemplate() {
        RestTemplate template = new RestTemplate();
        template.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().setBearerAuth(properties.getApiKey());
            request.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            request.getHeaders().set("Accept", MediaType.APPLICATION_JSON_VALUE);
            return execution.execute(request, body);
        });
        return template;
    }
}
