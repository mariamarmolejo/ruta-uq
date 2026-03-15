package com.rutauq.backend.modules.trips.repository;

import com.rutauq.backend.modules.trips.domain.Trip;
import com.rutauq.backend.modules.trips.domain.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TripRepository extends JpaRepository<Trip, UUID>, JpaSpecificationExecutor<Trip> {

    List<Trip> findByDriverIdOrderByDepartureTimeDesc(UUID driverId);

    Optional<Trip> findByIdAndDriverId(UUID id, UUID driverId);

    boolean existsByVehicleIdAndStatus(UUID vehicleId, TripStatus status);
}
