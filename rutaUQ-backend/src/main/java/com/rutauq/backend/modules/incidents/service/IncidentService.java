package com.rutauq.backend.modules.incidents.service;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.incidents.domain.Incident;
import com.rutauq.backend.modules.incidents.dto.IncidentResponse;
import com.rutauq.backend.modules.incidents.repository.IncidentRepository;
import com.rutauq.backend.modules.reservations.domain.Reservation;
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
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final ReservationRepository reservationRepository;

    @Transactional
    public IncidentResponse report(UUID reservationId, String description, User reporter) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new AppException(ErrorCode.RESERVATION_NOT_FOUND));

        if (!reservation.getPassenger().getId().equals(reporter.getId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        Incident incident = Incident.builder()
                .reservation(reservation)
                .reporter(reporter)
                .description(description)
                .build();

        incident = incidentRepository.save(incident);
        log.info("Incident {} reported for reservation {}", incident.getId(), reservationId);
        return toResponse(incident);
    }

    @Transactional(readOnly = true)
    public Optional<IncidentResponse> getByReservation(UUID reservationId) {
        return incidentRepository.findFirstByReservationId(reservationId)
                .map(this::toResponse);
    }

    private IncidentResponse toResponse(Incident incident) {
        return IncidentResponse.builder()
                .id(incident.getId())
                .reservationId(incident.getReservation().getId())
                .description(incident.getDescription())
                .createdAt(incident.getCreatedAt())
                .build();
    }
}
