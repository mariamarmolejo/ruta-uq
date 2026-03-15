package com.rutauq.backend.modules.reservations.mapper;

import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.reservations.domain.Reservation;
import com.rutauq.backend.modules.reservations.dto.ReservationResponse;
import com.rutauq.backend.modules.trips.domain.Trip;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ReservationMapper {

    @Mapping(expression = "java(reservation.getStatus().name())", target = "status")
    @Mapping(source = "trip",      target = "trip")
    @Mapping(source = "passenger", target = "passenger")
    @Mapping(
        expression = "java(reservation.getTrip().getPricePerSeat()" +
                     ".multiply(java.math.BigDecimal.valueOf(reservation.getSeatsReserved())))",
        target = "totalPrice"
    )
    ReservationResponse toResponse(Reservation reservation);

    List<ReservationResponse> toResponseList(List<Reservation> reservations);

    @Mapping(source = "id",            target = "id")
    @Mapping(source = "origin",        target = "origin")
    @Mapping(source = "destination",   target = "destination")
    @Mapping(source = "departureTime", target = "departureTime")
    @Mapping(source = "pricePerSeat",  target = "pricePerSeat")
    @Mapping(expression = "java(trip.getStatus().name())", target = "status")
    ReservationResponse.TripSummary toTripSummary(Trip trip);

    @Mapping(source = "id",        target = "id")
    @Mapping(source = "firstName", target = "firstName")
    @Mapping(source = "lastName",  target = "lastName")
    @Mapping(source = "email",     target = "email")
    ReservationResponse.PassengerSummary toPassengerSummary(User user);
}
