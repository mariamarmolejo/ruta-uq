package com.rutauq.backend.modules.vehicles.service;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.vehicles.domain.Vehicle;
import com.rutauq.backend.modules.vehicles.dto.VehicleRequest;
import com.rutauq.backend.modules.vehicles.dto.VehicleResponse;
import com.rutauq.backend.modules.vehicles.mapper.VehicleMapper;
import com.rutauq.backend.modules.vehicles.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final VehicleMapper vehicleMapper;

    @Transactional(readOnly = true)
    public List<VehicleResponse> getMyVehicles(User driver) {
        return vehicleMapper.toResponseList(
                vehicleRepository.findByDriverIdAndActiveTrue(driver.getId())
        );
    }

    @Transactional
    public VehicleResponse registerVehicle(User driver, VehicleRequest request) {
        if (vehicleRepository.existsByPlate(request.getPlate())) {
            throw new AppException(ErrorCode.RESOURCE_ALREADY_EXISTS,
                    "A vehicle with plate '" + request.getPlate() + "' is already registered");
        }

        Vehicle vehicle = Vehicle.builder()
                .driver(driver)
                .brand(request.getBrand())
                .model(request.getModel())
                .year(request.getYear())
                .color(request.getColor())
                .plate(request.getPlate().toUpperCase())
                .seats(request.getSeats())
                .active(true)
                .build();

        vehicleRepository.save(vehicle);
        log.info("Vehicle {} registered for driver {}", vehicle.getPlate(), driver.getEmail());
        return vehicleMapper.toResponse(vehicle);
    }

    @Transactional
    public VehicleResponse updateVehicle(User driver, UUID vehicleId, VehicleRequest request) {
        Vehicle vehicle = vehicleRepository.findByIdAndDriverId(vehicleId, driver.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Vehicle not found"));

        if (!vehicle.getPlate().equals(request.getPlate()) && vehicleRepository.existsByPlate(request.getPlate())) {
            throw new AppException(ErrorCode.RESOURCE_ALREADY_EXISTS,
                    "A vehicle with plate '" + request.getPlate() + "' is already registered");
        }

        vehicle.setBrand(request.getBrand());
        vehicle.setModel(request.getModel());
        vehicle.setYear(request.getYear());
        vehicle.setColor(request.getColor());
        vehicle.setPlate(request.getPlate().toUpperCase());
        vehicle.setSeats(request.getSeats());

        vehicleRepository.save(vehicle);
        return vehicleMapper.toResponse(vehicle);
    }

    @Transactional
    public void deactivateVehicle(User driver, UUID vehicleId) {
        Vehicle vehicle = vehicleRepository.findByIdAndDriverId(vehicleId, driver.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Vehicle not found"));

        vehicle.setActive(false);
        vehicleRepository.save(vehicle);
        log.info("Vehicle {} deactivated by driver {}", vehicle.getPlate(), driver.getEmail());
    }
}
