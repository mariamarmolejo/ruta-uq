package com.rutauq.backend.modules.auth.dto;

import com.rutauq.backend.modules.auth.domain.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must not exceed 100 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must not exceed 100 characters")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
    private String password;

    @Pattern(
        regexp = "^(\\+?[0-9]{7,15})?$",
        message = "Phone number must be valid (7-15 digits, optional leading +)"
    )
    private String phone;

    // Optional: defaults to CLIENT if not provided
    private Role role;

    // Captcha token — validated by CaptchaValidator abstraction
    private String captchaToken;
}
