package com.rutauq.backend.modules.reservations.repository;

import com.rutauq.backend.modules.reservations.domain.Reservation;
import com.rutauq.backend.modules.reservations.domain.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, UUID> {

    List<Reservation> findByPassengerIdOrderByCreatedAtDesc(UUID passengerId);

    List<Reservation> findByTripId(UUID tripId);

    Optional<Reservation> findByIdAndPassengerId(UUID id, UUID passengerId);

    boolean existsByTripIdAndPassengerIdAndStatusNot(
            UUID tripId, UUID passengerId, ReservationStatus status);

    boolean existsByTripIdAndPassengerIdAndStatusIn(
            UUID tripId, UUID passengerId, List<ReservationStatus> statuses);

    // Sum of seats held for a trip across active reservations
    // Used to cross-check available seats
    long countByTripIdAndStatusIn(UUID tripId, List<ReservationStatus> statuses);

    @Modifying
    @Query("UPDATE Reservation r SET r.status = :to WHERE r.trip.id = :tripId AND r.status = :from")
    void updateStatusByTripId(@Param("tripId") UUID tripId,
                              @Param("from")   ReservationStatus from,
                              @Param("to")     ReservationStatus to);
}
