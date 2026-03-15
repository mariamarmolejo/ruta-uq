package com.rutauq.backend.modules.drivers.repository;

import com.rutauq.backend.modules.drivers.domain.DriverProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DriverProfileRepository extends JpaRepository<DriverProfile, UUID> {

    Optional<DriverProfile> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);

    boolean existsByLicenseNumber(String licenseNumber);
}
