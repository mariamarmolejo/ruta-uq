package com.rutauq.backend.modules.trips.mapper;

import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.trips.domain.Trip;
import com.rutauq.backend.modules.trips.dto.TripResponse;
import com.rutauq.backend.modules.vehicles.domain.Vehicle;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TripMapper {

    @Mapping(expression = "java(trip.getStatus().name())", target = "status")
    @Mapping(source = "driver", target = "driver")
    @Mapping(source = "vehicle", target = "vehicle")
    TripResponse toResponse(Trip trip);

    List<TripResponse> toResponseList(List<Trip> trips);

    @Mapping(source = "id",        target = "id")
    @Mapping(source = "firstName", target = "firstName")
    @Mapping(source = "lastName",  target = "lastName")
    @Mapping(source = "email",     target = "email")
    TripResponse.DriverSummary toDriverSummary(User user);

    @Mapping(source = "id",    target = "id")
    @Mapping(source = "brand", target = "brand")
    @Mapping(source = "model", target = "model")
    @Mapping(source = "year",  target = "year")
    @Mapping(source = "color", target = "color")
    @Mapping(source = "plate", target = "plate")
    @Mapping(source = "seats", target = "seats")
    TripResponse.VehicleSummary toVehicleSummary(Vehicle vehicle);
}
