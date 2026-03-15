package com.rutauq.backend.modules.vehicles.mapper;

import com.rutauq.backend.modules.vehicles.domain.Vehicle;
import com.rutauq.backend.modules.vehicles.dto.VehicleResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface VehicleMapper {

    @Mapping(source = "active", target = "active")
    VehicleResponse toResponse(Vehicle vehicle);

    List<VehicleResponse> toResponseList(List<Vehicle> vehicles);
}
