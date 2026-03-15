package com.rutauq.backend.modules.reservations.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateReservationRequest {

    @NotNull(message = "Trip ID is required")
    private UUID tripId;

    @NotNull(message = "Seats reserved is required")
    @Min(value = 1, message = "Must reserve at least 1 seat")
    @Max(value = 8, message = "Cannot reserve more than 8 seats at once")
    private Integer seatsReserved;
}
