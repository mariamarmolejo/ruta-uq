package com.rutauq.backend.modules.trips.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class TripResponse {

    private UUID id;
    private String origin;
    private String destination;
    private Instant departureTime;
    private int availableSeats;
    private BigDecimal pricePerSeat;
    private String status;
    private String description;
    private Instant startedAt;
    private Instant completedAt;
    private Instant createdAt;
    private Instant updatedAt;

    private DriverSummary driver;
    private VehicleSummary vehicle;

    @Getter
    @Builder
    public static class DriverSummary {
        private UUID id;
        private String firstName;
        private String lastName;
        private String email;
    }

    @Getter
    @Builder
    public static class VehicleSummary {
        private UUID id;
        private String brand;
        private String model;
        private int year;
        private String color;
        private String plate;
        private int seats;
    }
}
