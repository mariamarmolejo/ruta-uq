package com.rutauq.backend.modules.incidents.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateIncidentRequest {

    @NotNull(message = "reservationId is required")
    private UUID reservationId;

    @NotBlank(message = "description is required")
    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;
}
