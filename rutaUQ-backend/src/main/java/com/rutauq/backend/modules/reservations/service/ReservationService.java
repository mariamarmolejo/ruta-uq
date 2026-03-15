package com.rutauq.backend.modules.reservations.service;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.auth.domain.Role;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import com.rutauq.backend.modules.reservations.domain.Reservation;
import com.rutauq.backend.modules.reservations.domain.ReservationStatus;
import com.rutauq.backend.modules.reservations.dto.CreateReservationRequest;
import com.rutauq.backend.modules.reservations.dto.ReservationResponse;
import com.rutauq.backend.modules.reservations.mapper.ReservationMapper;
import com.rutauq.backend.modules.reservations.repository.ReservationRepository;
import com.rutauq.backend.modules.trips.domain.Trip;
import com.rutauq.backend.modules.trips.domain.TripStatus;
import com.rutauq.backend.modules.trips.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final ReservationMapper reservationMapper;

    @Transactional
    public ReservationResponse createReservation(User currentUser, CreateReservationRequest request) {
        User passenger = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Trip trip = tripRepository.findById(request.getTripId())
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));

        // Cannot reserve own trip
        if (trip.getDriver().getId().equals(passenger.getId())) {
            throw new AppException(ErrorCode.OPERATION_NOT_PERMITTED,
                    "Drivers cannot reserve seats on their own trips");
        }

        // Trip must be SCHEDULED
        if (trip.getStatus() != TripStatus.SCHEDULED) {
            throw new AppException(ErrorCode.TRIP_ALREADY_CLOSED);
        }

        // No duplicate active reservation for same trip.
        // PAYMENT_FAILED and CANCELLED reservations are excluded so the passenger can retry.
        boolean alreadyReserved = reservationRepository.existsByTripIdAndPassengerIdAndStatusIn(
                trip.getId(), passenger.getId(),
                List.of(ReservationStatus.PENDING_PAYMENT, ReservationStatus.PENDING,
                        ReservationStatus.CONFIRMED));
        if (alreadyReserved) {
            throw new AppException(ErrorCode.RESERVATION_ALREADY_EXISTS);
        }

        // Check seat availability
        int requested = request.getSeatsReserved();
        if (requested > trip.getAvailableSeats()) {
            throw new AppException(ErrorCode.TRIP_NO_SEATS_AVAILABLE,
                    "Only " + trip.getAvailableSeats() + " seat(s) available on this trip");
        }

        // Hold the seats
        trip.setAvailableSeats(trip.getAvailableSeats() - requested);
        tripRepository.save(trip);

        Reservation reservation = Reservation.builder()
                .trip(trip)
                .passenger(passenger)
                .seatsReserved(requested)
                .status(ReservationStatus.PENDING_PAYMENT)
                .build();

        reservationRepository.save(reservation);
        log.info("Reservation created: passenger {} reserved {} seat(s) on trip {}",
                passenger.getEmail(), requested, trip.getId());

        return reservationMapper.toResponse(reservation);
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> getMyReservations(User currentUser) {
        return reservationMapper.toResponseList(
                reservationRepository.findByPassengerIdOrderByCreatedAtDesc(currentUser.getId())
        );
    }

    @Transactional(readOnly = true)
    public ReservationResponse getReservationById(UUID reservationId, User currentUser) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new AppException(ErrorCode.RESERVATION_NOT_FOUND));

        boolean isPassenger = reservation.getPassenger().getId().equals(currentUser.getId());
        boolean isTripDriver = reservation.getTrip().getDriver().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;

        if (!isPassenger && !isTripDriver && !isAdmin) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        return reservationMapper.toResponse(reservation);
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> getTripReservations(UUID tripId, User currentUser) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));

        boolean isTripDriver = trip.getDriver().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;

        if (!isTripDriver && !isAdmin) {
            throw new AppException(ErrorCode.ACCESS_DENIED,
                    "Only the trip driver can view its reservations");
        }

        return reservationMapper.toResponseList(
                reservationRepository.findByTripId(tripId)
        );
    }

    @Transactional
    public void completeReservationsForTrip(UUID tripId) {
        reservationRepository.updateStatusByTripId(tripId, ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED);
        log.info("Completed all CONFIRMED reservations for trip {}", tripId);
    }

    @Transactional
    public ReservationResponse cancelReservation(UUID reservationId, User currentUser) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new AppException(ErrorCode.RESERVATION_NOT_FOUND));

        boolean isPassenger = reservation.getPassenger().getId().equals(currentUser.getId());
        boolean isTripDriver = reservation.getTrip().getDriver().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;

        if (!isPassenger && !isTripDriver && !isAdmin) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new AppException(ErrorCode.OPERATION_NOT_PERMITTED, "Reservation is already cancelled");
        }

        if (reservation.getStatus() == ReservationStatus.COMPLETED) {
            throw new AppException(ErrorCode.OPERATION_NOT_PERMITTED, "Cannot cancel a completed reservation");
        }

        // Only release seats if they are still held (PENDING/PENDING_PAYMENT/CONFIRMED).
        // PAYMENT_FAILED reservations already had their seats released by the webhook handler.
        boolean seatsHeld = reservation.getStatus() == ReservationStatus.PENDING
                || reservation.getStatus() == ReservationStatus.PENDING_PAYMENT
                || reservation.getStatus() == ReservationStatus.CONFIRMED;
        if (seatsHeld) {
            Trip trip = reservation.getTrip();
            trip.setAvailableSeats(trip.getAvailableSeats() + reservation.getSeatsReserved());
            tripRepository.save(trip);
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        log.info("Reservation {} cancelled by {} ({})",
                reservationId, currentUser.getEmail(), currentUser.getRole());

        return reservationMapper.toResponse(reservation);
    }
}
