package com.rutauq.backend.modules.vehicles.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class VehicleResponse {

    private UUID id;
    private String brand;
    private String model;
    private int year;
    private String color;
    private String plate;
    private int seats;
    private boolean active;
    private Instant createdAt;
}
