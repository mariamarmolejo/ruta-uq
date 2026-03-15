package com.rutauq.backend.modules.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RegisterResponse {
    private String email;
    private String firstName;
    private String lastName;
}
