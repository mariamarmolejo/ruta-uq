package com.rutauq.backend.modules.incidents.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class IncidentResponse {
    private UUID id;
    private UUID reservationId;
    private String description;
    private Instant createdAt;
}
