package com.rutauq.backend.modules.chat.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "groq")
@Getter
@Setter
public class GroqProperties {

    private String apiKey = "";
    private String model = "llama-3.1-8b-instant";
    private String apiBaseUrl = "https://api.groq.com/openai/v1";
}
