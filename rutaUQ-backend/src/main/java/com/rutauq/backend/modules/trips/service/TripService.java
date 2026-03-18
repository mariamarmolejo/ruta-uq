package com.rutauq.backend.modules.trips.service;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.auth.repository.UserRepository;
import com.rutauq.backend.modules.trips.domain.Trip;
import com.rutauq.backend.modules.trips.domain.TripStatus;
import com.rutauq.backend.modules.trips.dto.CreateTripRequest;
import com.rutauq.backend.modules.trips.dto.TripFilter;
import com.rutauq.backend.modules.trips.dto.TripResponse;
import com.rutauq.backend.modules.trips.dto.UpdateTripRequest;
import com.rutauq.backend.modules.trips.mapper.TripMapper;
import com.rutauq.backend.modules.trips.repository.TripRepository;
import com.rutauq.backend.modules.trips.repository.TripSpecification;
import com.rutauq.backend.modules.reservations.service.ReservationService;
import com.rutauq.backend.modules.vehicles.domain.Vehicle;
import com.rutauq.backend.modules.vehicles.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final TripMapper tripMapper;
    private final ReservationService reservationService;

    @Transactional
    public TripResponse createTrip(User currentUser, CreateTripRequest request) {
        User driver = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Vehicle vehicle = vehicleRepository.findByIdAndDriverId(request.getVehicleId(), driver.getId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Vehicle not found or does not belong to you"));

        if (!vehicle.isActive()) {
            throw new AppException(ErrorCode.OPERATION_NOT_PERMITTED, "Cannot use a deactivated vehicle");
        }

        if (request.getAvailableSeats() > vehicle.getSeats()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Available seats (" + request.getAvailableSeats() +
                    ") cannot exceed vehicle capacity (" + vehicle.getSeats() + ")");
        }

        if (tripRepository.existsByVehicleIdAndStatus(vehicle.getId(), TripStatus.SCHEDULED)) {
            throw new AppException(ErrorCode.OPERATION_NOT_PERMITTED,
                    "This vehicle already has an active scheduled trip");
        }

        Trip trip = Trip.builder()
                .driver(driver)
                .vehicle(vehicle)
                .origin(request.getOrigin().trim())
                .destination(request.getDestination().trim())
                .departureTime(request.getDepartureTime())
                .availableSeats(request.getAvailableSeats())
                .pricePerSeat(integerCOP(request.getPricePerSeat()))
                .description(request.getDescription())
                .status(TripStatus.SCHEDULED)
                .build();

        tripRepository.save(trip);
        log.info("Trip created by driver {} from {} to {}", driver.getEmail(), trip.getOrigin(), trip.getDestination());
        return tripMapper.toResponse(trip);
    }

    @Transactional(readOnly = true)
    public List<TripResponse> listTrips(TripFilter filter) {
        return tripMapper.toResponseList(
                tripRepository.findAll(TripSpecification.withFilter(filter))
        );
    }

    @Transactional(readOnly = true)
    public TripResponse getTripById(UUID tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));
        return tripMapper.toResponse(trip);
    }

    @Transactional(readOnly = true)
    public List<TripResponse> getMyTrips(User currentUser) {
        return tripMapper.toResponseList(
                tripRepository.findByDriverIdOrderByDepartureTimeDesc(currentUser.getId())
        );
    }

    @Transactional
    public TripResponse updateTrip(User currentUser, UUID tripId, UpdateTripRequest request) {
        Trip trip = tripRepository.findByIdAndDriverId(tripId, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));

        requireScheduled(trip);

        if (request.getOrigin() != null) trip.setOrigin(request.getOrigin().trim());
        if (request.getDestination() != null) trip.setDestination(request.getDestination().trim());
        if (request.getDepartureTime() != null) trip.setDepartureTime(request.getDepartureTime());
        if (request.getPricePerSeat() != null) {
            trip.setPricePerSeat(integerCOP(request.getPricePerSeat()));
        }
        if (request.getDescription() != null) trip.setDescription(request.getDescription());
        if (request.getAvailableSeats() != null) {
            if (request.getAvailableSeats() > trip.getVehicle().getSeats()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Available seats cannot exceed vehicle capacity (" + trip.getVehicle().getSeats() + ")");
            }
            trip.setAvailableSeats(request.getAvailableSeats());
        }

        tripRepository.save(trip);
        log.info("Trip {} updated by driver {}", tripId, currentUser.getEmail());
        return tripMapper.toResponse(trip);
    }

    @Transactional
    public TripResponse startTrip(User currentUser, UUID tripId) {
        Trip trip = tripRepository.findByIdAndDriverId(tripId, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));

        if (trip.getStatus() != TripStatus.SCHEDULED) {
            throw new AppException(ErrorCode.TRIP_INVALID_STATUS,
                    "Only SCHEDULED trips can be started. Current status: " + trip.getStatus());
        }

        trip.setStatus(TripStatus.IN_PROGRESS);
        trip.setStartedAt(Instant.now());
        tripRepository.save(trip);
        log.info("Trip {} started by driver {}", tripId, currentUser.getEmail());
        return tripMapper.toResponse(trip);
    }

    @Transactional
    public TripResponse completeTrip(User currentUser, UUID tripId) {
        Trip trip = tripRepository.findByIdAndDriverId(tripId, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));

        if (trip.getStatus() != TripStatus.IN_PROGRESS) {
            throw new AppException(ErrorCode.TRIP_INVALID_STATUS,
                    "Only IN_PROGRESS trips can be completed. Current status: " + trip.getStatus());
        }

        trip.setStatus(TripStatus.COMPLETED);
        trip.setCompletedAt(Instant.now());
        tripRepository.save(trip);
        reservationService.completeReservationsForTrip(tripId);
        log.info("Trip {} completed by driver {}", tripId, currentUser.getEmail());
        return tripMapper.toResponse(trip);
    }

    @Transactional
    public void cancelTrip(User currentUser, UUID tripId) {
        Trip trip = tripRepository.findByIdAndDriverId(tripId, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.TRIP_NOT_FOUND));

        requireScheduled(trip);

        trip.setStatus(TripStatus.CANCELLED);
        tripRepository.save(trip);
        log.info("Trip {} cancelled by driver {}", tripId, currentUser.getEmail());
    }

    /** COP amounts for Mercado Pago must be whole pesos (no decimals). */
    private static BigDecimal integerCOP(BigDecimal value) {
        return value.setScale(0, RoundingMode.HALF_UP);
    }

    private void requireScheduled(Trip trip) {
        if (trip.getStatus() != TripStatus.SCHEDULED) {
            throw new AppException(ErrorCode.TRIP_ALREADY_CLOSED,
                    "Only SCHEDULED trips can be modified. Current status: " + trip.getStatus());
        }
    }
}
