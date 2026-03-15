package com.rutauq.backend.modules.users.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateProfileRequest {

    @Size(max = 100, message = "First name must not exceed 100 characters")
    private String firstName;

    @Size(max = 100, message = "Last name must not exceed 100 characters")
    private String lastName;

    @Pattern(
        regexp = "^(\\+?[0-9]{7,15})?$",
        message = "Phone number must be valid (7-15 digits, optional leading +)"
    )
    private String phone;

    @Size(max = 1000, message = "Bio must not exceed 1000 characters")
    private String bio;

    @Size(max = 500, message = "Avatar URL must not exceed 500 characters")
    private String avatarUrl;

    private LocalDate birthDate;

    // Habeas Data / privacy consent
    private Boolean privacyAccepted;
}
