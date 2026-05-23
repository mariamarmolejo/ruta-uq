package com.rutauq.backend.modules.incidents.repository;

import com.rutauq.backend.modules.incidents.domain.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, UUID> {

    List<Incident> findByReservationId(UUID reservationId);

    Optional<Incident> findFirstByReservationId(UUID reservationId);
}
