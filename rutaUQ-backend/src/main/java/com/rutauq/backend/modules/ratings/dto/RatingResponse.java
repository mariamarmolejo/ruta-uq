package com.rutauq.backend.modules.ratings.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class RatingResponse {
    private UUID id;
    private UUID reservationId;
    private int stars;
    private String comment;
    private Instant createdAt;
}
