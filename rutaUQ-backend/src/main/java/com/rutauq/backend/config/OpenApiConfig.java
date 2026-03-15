package com.rutauq.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Value("${server.port:8080}")
    private String serverPort;

    @Bean
    public OpenAPI rutaUQOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Ruta Compartida UQ API")
                        .description("Backend REST API for the Ruta Compartida UQ carpooling platform. " +
                                "Connects passengers with drivers at Universidad de Quindío.")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("Ruta Compartida UQ Team")
                                .email("rutauq@uq.edu.co"))
                        .license(new License()
                                .name("Private")
                                .url("https://uq.edu.co")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:" + serverPort)
                                .description("Local Development Server")
                ))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .name("bearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
