package com.rutauq.backend.modules.ratings.service;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.ratings.domain.Rating;
import com.rutauq.backend.modules.ratings.dto.RatingResponse;
import com.rutauq.backend.modules.ratings.repository.RatingRepository;
import com.rutauq.backend.modules.reservations.domain.Reservation;
import com.rutauq.backend.modules.reservations.domain.ReservationStatus;
import com.rutauq.backend.modules.reservations.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RatingService {

    private final RatingRepository ratingRepository;
    private final ReservationRepository reservationRepository;

    @Transactional
    public RatingResponse rate(UUID reservationId, int stars, String comment, User rater) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new AppException(ErrorCode.RESERVATION_NOT_FOUND));

        if (!reservation.getPassenger().getId().equals(rater.getId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        if (reservation.getStatus() != ReservationStatus.COMPLETED) {
            throw new AppException(ErrorCode.OPERATION_NOT_PERMITTED,
                    "You can only rate a completed reservation");
        }

        if (ratingRepository.existsByReservationId(reservationId)) {
            throw new AppException(ErrorCode.RATING_ALREADY_EXISTS);
        }

        Rating rating = Rating.builder()
                .reservation(reservation)
                .rater(rater)
                .stars(stars)
                .comment(comment)
                .build();

        rating = ratingRepository.save(rating);
        log.info("Rating {} ({} stars) saved for reservation {}", rating.getId(), stars, reservationId);
        return toResponse(rating);
    }

    @Transactional(readOnly = true)
    public Optional<RatingResponse> getByReservation(UUID reservationId) {
        return ratingRepository.findByReservationId(reservationId)
                .map(this::toResponse);
    }

    private RatingResponse toResponse(Rating rating) {
        return RatingResponse.builder()
                .id(rating.getId())
                .reservationId(rating.getReservation().getId())
                .stars(rating.getStars())
                .comment(rating.getComment())
                .createdAt(rating.getCreatedAt())
                .build();
    }
}
