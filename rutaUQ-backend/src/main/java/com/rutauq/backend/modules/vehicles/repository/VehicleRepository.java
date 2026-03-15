package com.rutauq.backend.modules.vehicles.repository;

import com.rutauq.backend.modules.vehicles.domain.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {

    List<Vehicle> findByDriverId(UUID driverId);

    List<Vehicle> findByDriverIdAndActiveTrue(UUID driverId);

    boolean existsByPlate(String plate);

    Optional<Vehicle> findByIdAndDriverId(UUID id, UUID driverId);
}
