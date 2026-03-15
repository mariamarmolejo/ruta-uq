package com.rutauq.backend.modules.trips.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
public class CreateTripRequest {

    @NotNull(message = "Vehicle is required")
    private UUID vehicleId;

    @NotBlank(message = "Origin is required")
    @Size(max = 255)
    private String origin;

    @NotBlank(message = "Destination is required")
    @Size(max = 255)
    private String destination;

    @NotNull(message = "Departure time is required")
    @Future(message = "Departure time must be in the future")
    private Instant departureTime;

    @NotNull(message = "Available seats is required")
    @Min(value = 1, message = "Must offer at least 1 seat")
    @Max(value = 10, message = "Cannot offer more than 10 seats")
    private Integer availableSeats;

    @NotNull(message = "Price per seat is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Price cannot be negative")
    @Digits(integer = 8, fraction = 2, message = "Invalid price format")
    private BigDecimal pricePerSeat;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;
}
