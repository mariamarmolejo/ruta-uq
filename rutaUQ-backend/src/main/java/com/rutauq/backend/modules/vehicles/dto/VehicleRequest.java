package com.rutauq.backend.modules.vehicles.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.Year;

@Data
public class VehicleRequest {

    @NotBlank(message = "Brand is required")
    @Size(max = 100)
    private String brand;

    @NotBlank(message = "Model is required")
    @Size(max = 100)
    private String model;

    @NotNull(message = "Year is required")
    @Min(value = 1990, message = "Year must be 1990 or later")
    @Max(value = 2100, message = "Year is not valid")
    private Integer year;

    @NotBlank(message = "Color is required")
    @Size(max = 50)
    private String color;

    @NotBlank(message = "License plate is required")
    @Size(max = 20)
    @Pattern(regexp = "^[A-Z0-9\\-]{3,10}$", message = "Plate must be 3-10 uppercase alphanumeric characters")
    private String plate;

    @NotNull(message = "Number of seats is required")
    @Min(value = 1, message = "Vehicle must have at least 1 seat")
    @Max(value = 10, message = "Vehicle cannot have more than 10 seats")
    private Integer seats;
}
