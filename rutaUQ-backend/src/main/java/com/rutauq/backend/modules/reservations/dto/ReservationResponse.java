package com.rutauq.backend.modules.reservations.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class ReservationResponse {

    private UUID id;
    private String status;
    private int seatsReserved;
    private BigDecimal totalPrice;
    private Instant createdAt;
    private Instant updatedAt;

    private TripSummary trip;
    private PassengerSummary passenger;

    @Getter
    @Builder
    public static class TripSummary {
        private UUID id;
        private String origin;
        private String destination;
        private Instant departureTime;
        private BigDecimal pricePerSeat;
        private String status;
    }

    @Getter
    @Builder
    public static class PassengerSummary {
        private UUID id;
        private String firstName;
        private String lastName;
        private String email;
    }
}
