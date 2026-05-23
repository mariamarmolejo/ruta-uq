package com.rutauq.backend.modules.ratings.repository;

import com.rutauq.backend.modules.ratings.domain.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RatingRepository extends JpaRepository<Rating, UUID> {

    Optional<Rating> findByReservationId(UUID reservationId);

    boolean existsByReservationId(UUID reservationId);
}
