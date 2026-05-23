package com.rutauq.backend.modules.ratings.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateRatingRequest {

    @NotNull(message = "reservationId is required")
    private UUID reservationId;

    @NotNull(message = "stars is required")
    @Min(value = 1, message = "Minimum rating is 1 star")
    @Max(value = 5, message = "Maximum rating is 5 stars")
    private Integer stars;

    @Size(max = 500, message = "Comment must not exceed 500 characters")
    private String comment;
}
