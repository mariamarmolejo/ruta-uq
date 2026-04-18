package com.rutauq.backend.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(@NotBlank String idToken) {}
