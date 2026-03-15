package com.rutauq.backend.modules.trips.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class TripFilter {

    private String origin;
    private String destination;
    private LocalDate departureDate;
    private Integer minSeats;
}
