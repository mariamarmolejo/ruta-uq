package com.rutauq.backend.modules.users.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Builder
public class UserProfileResponse {

    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String role;

    // Profile fields
    private String bio;
    private String avatarUrl;
    private LocalDate birthDate;
    private boolean privacyAccepted;
    private Instant privacyAcceptedAt;

    private Instant createdAt;
}
