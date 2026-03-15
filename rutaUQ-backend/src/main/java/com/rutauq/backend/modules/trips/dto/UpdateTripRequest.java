package com.rutauq.backend.modules.trips.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
public class UpdateTripRequest {

    @Size(max = 255)
    private String origin;

    @Size(max = 255)
    private String destination;

    @Future(message = "Departure time must be in the future")
    private Instant departureTime;

    @Min(value = 1, message = "Must offer at least 1 seat")
    @Max(value = 10, message = "Cannot offer more than 10 seats")
    private Integer availableSeats;

    @DecimalMin(value = "0.0", inclusive = true, message = "Price cannot be negative")
    @Digits(integer = 8, fraction = 2, message = "Invalid price format")
    private BigDecimal pricePerSeat;

    @Size(max = 500)
    private String description;
}
