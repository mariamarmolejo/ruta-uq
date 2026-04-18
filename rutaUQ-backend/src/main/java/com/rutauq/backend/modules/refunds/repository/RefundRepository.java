package com.rutauq.backend.modules.refunds.repository;

import com.rutauq.backend.modules.refunds.domain.Refund;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefundRepository extends JpaRepository<Refund, UUID> {

    boolean existsByReservationId(UUID reservationId);

    Optional<Refund> findByReservationId(UUID reservationId);

    List<Refund> findByReservationPassengerIdOrderByRequestedAtDesc(UUID passengerId);
}
