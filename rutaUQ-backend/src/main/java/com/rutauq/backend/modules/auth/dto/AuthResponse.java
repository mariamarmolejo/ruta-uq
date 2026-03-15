package com.rutauq.backend.modules.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthResponse {

    private final String token;

    @Builder.Default
    private final String tokenType = "Bearer";

    private final long expiresIn;

    private final String email;
    private final String firstName;
    private final String lastName;
    private final String role;
}
