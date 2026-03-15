package com.rutauq.backend.modules.drivers.dto;

import com.rutauq.backend.modules.vehicles.dto.VehicleResponse;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class DriverProfileResponse {

    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private String licenseNumber;
    private LocalDate licenseExpiry;
    private boolean verified;
    private BigDecimal rating;
    private int totalTrips;
    private List<VehicleResponse> vehicles;
    private Instant createdAt;
}
