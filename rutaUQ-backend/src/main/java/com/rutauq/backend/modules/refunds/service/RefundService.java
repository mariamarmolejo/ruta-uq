package com.rutauq.backend.modules.refunds.service;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.auth.domain.Role;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.auth.email.EmailSender;
import com.rutauq.backend.modules.payments.domain.Payment;
import com.rutauq.backend.modules.payments.domain.PaymentStatus;
import com.rutauq.backend.modules.payments.repository.PaymentRepository;
import com.rutauq.backend.modules.refunds.domain.Refund;
import com.rutauq.backend.modules.refunds.domain.RefundStatus;
import com.rutauq.backend.modules.refunds.dto.RefundResponse;
import com.rutauq.backend.modules.refunds.repository.RefundRepository;
import com.rutauq.backend.modules.reservations.domain.Reservation;
import com.rutauq.backend.modules.reservations.domain.ReservationStatus;
import com.rutauq.backend.modules.reservations.repository.ReservationRepository;
import com.rutauq.backend.modules.trips.domain.TripStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class RefundService {

    private final RefundRepository refundRepository;
    private final ReservationRepository reservationRepository;
    private final PaymentRepository paymentRepository;
    private final EmailSender emailSender;
    private final RestTemplate mercadoPagoRestTemplate;

    public RefundService(
            RefundRepository refundRepository,
            ReservationRepository reservationRepository,
            PaymentRepository paymentRepository,
            EmailSender emailSender,
            @Qualifier("mercadoPagoRestTemplate") RestTemplate mercadoPagoRestTemplate) {
        this.refundRepository = refundRepository;
        this.reservationRepository = reservationRepository;
        this.paymentRepository = paymentRepository;
        this.emailSender = emailSender;
        this.mercadoPagoRestTemplate = mercadoPagoRestTemplate;
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Request a refund for a reservation.
     * Called either by the passenger (manual request) or internally when a
     * driver/admin cancels a trip (automatic trigger for all paid reservations).
     */
    @Transactional
    public RefundResponse requestRefund(UUID reservationId, User requestingUser) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new AppException(ErrorCode.RESERVATION_NOT_FOUND));

        assertCanRequestRefund(reservation, requestingUser);

        Payment payment = paymentRepository.findByReservationId(reservationId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND,
                        "No payment found for this reservation"));

        if (payment.getStatus() != PaymentStatus.APPROVED) {
            throw new AppException(ErrorCode.OPERATION_NOT_PERMITTED,
                    "Only APPROVED payments can be refunded. Current status: " + payment.getStatus());
        }

        if (refundRepository.existsByReservationId(reservationId)) {
            throw new AppException(ErrorCode.RESOURCE_ALREADY_EXISTS,
                    "A refund has already been requested for this reservation");
        }

        Refund refund = Refund.builder()
                .reservation(reservation)
                .payment(payment)
                .amount(payment.getAmount())
                .reason("Trip cancelled")
                .build();

        refund = refundRepository.save(refund);

        // Call Mercado Pago and update status in the same transaction
        refund = callMpRefund(refund, payment);
        refund = refundRepository.save(refund);

        // Mark payment as REFUNDED if MP accepted it
        if (refund.getStatus() == RefundStatus.PROCESSED) {
            payment.setStatus(PaymentStatus.REFUNDED);
            paymentRepository.save(payment);
        }

        sendRefundEmail(reservation, refund);

        log.info("Refund {} status={} reservationId={} mpRefundId={}",
                refund.getId(), refund.getStatus(), reservationId, refund.getMpRefundId());

        return toResponse(refund);
    }

    /** List all refunds for the authenticated user's reservations. */
    @Transactional(readOnly = true)
    public List<RefundResponse> getMyRefunds(User currentUser) {
        return refundRepository
                .findByReservationPassengerIdOrderByRequestedAtDesc(currentUser.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /** List all refunds — ADMIN only. */
    @Transactional(readOnly = true)
    public List<RefundResponse> getAllRefunds() {
        return refundRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // -------------------------------------------------------------------------
    // Internal trigger — called by TripService when a trip is cancelled
    // -------------------------------------------------------------------------

    /**
     * Automatically requests refunds for all APPROVED payments on a cancelled trip.
     * Skips reservations that already have a refund or no payment.
     */
    @Transactional
    public void refundAllForCancelledTrip(UUID tripId) {
        List<Reservation> reservations = reservationRepository.findByTripId(tripId);
        for (Reservation r : reservations) {
            if (r.getStatus() != ReservationStatus.CONFIRMED &&
                r.getStatus() != ReservationStatus.PENDING_PAYMENT) {
                continue;
            }
            paymentRepository.findByReservationId(r.getId()).ifPresent(payment -> {
                if (payment.getStatus() == PaymentStatus.APPROVED &&
                    !refundRepository.existsByReservationId(r.getId())) {
                    try {
                        requestRefundInternal(r, payment);
                    } catch (Exception e) {
                        // Log and continue — don't let one failure block others
                        log.error("Auto-refund failed for reservation {}: {}", r.getId(), e.getMessage());
                    }
                }
            });
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private void assertCanRequestRefund(Reservation reservation, User requestingUser) {
        boolean isPassenger = reservation.getPassenger().getId().equals(requestingUser.getId());
        boolean isDriver    = reservation.getTrip().getDriver().getId().equals(requestingUser.getId());
        boolean isAdmin     = requestingUser.getRole() == Role.ADMIN;

        if (!isPassenger && !isDriver && !isAdmin) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }

        // The trip must be cancelled OR the reservation was manually cancelled
        boolean tripCancelled = reservation.getTrip().getStatus() == TripStatus.CANCELLED;
        boolean reservationCancelled = reservation.getStatus() == ReservationStatus.CANCELLED;
        if (!tripCancelled && !reservationCancelled) {
            throw new AppException(ErrorCode.OPERATION_NOT_PERMITTED,
                    "Refunds can only be requested for cancelled trips or reservations");
        }
    }

    private void requestRefundInternal(Reservation reservation, Payment payment) {
        Refund refund = Refund.builder()
                .reservation(reservation)
                .payment(payment)
                .amount(payment.getAmount())
                .reason("Trip cancelled by driver/admin")
                .build();

        refund = refundRepository.save(refund);
        refund = callMpRefund(refund, payment);
        refundRepository.save(refund);

        if (refund.getStatus() == RefundStatus.PROCESSED) {
            payment.setStatus(PaymentStatus.REFUNDED);
            paymentRepository.save(payment);
        }

        sendRefundEmail(reservation, refund);
        log.info("Auto-refund {} status={} for reservation {}", refund.getId(), refund.getStatus(), reservation.getId());
    }

    @SuppressWarnings("unchecked")
    private Refund callMpRefund(Refund refund, Payment payment) {
        String url = "https://api.mercadopago.com/v1/payments/" + payment.getMercadoPagoPaymentId() + "/refunds";
        try {
            ResponseEntity<Map> response = mercadoPagoRestTemplate.postForEntity(url, HttpEntity.EMPTY, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object mpId = response.getBody().get("id");
                refund.setMpRefundId(mpId != null ? String.valueOf(mpId) : null);
                refund.setStatus(RefundStatus.PROCESSED);
                refund.setProcessedAt(Instant.now());
            } else {
                refund.setStatus(RefundStatus.FAILED);
            }
        } catch (HttpClientErrorException e) {
            log.warn("MP refund API error for payment {}: {} — {}",
                    payment.getMercadoPagoPaymentId(), e.getStatusCode(), e.getResponseBodyAsString());
            refund.setStatus(RefundStatus.FAILED);
        } catch (Exception e) {
            log.error("Unexpected error calling MP refund API for payment {}: {}",
                    payment.getMercadoPagoPaymentId(), e.getMessage());
            refund.setStatus(RefundStatus.FAILED);
        }
        return refund;
    }

    private void sendRefundEmail(Reservation reservation, Refund refund) {
        String to = reservation.getPassenger().getEmail();
        String name = reservation.getPassenger().getFirstName();
        String trip = reservation.getTrip().getOrigin() + " → " + reservation.getTrip().getDestination();

        if (refund.getStatus() == RefundStatus.PROCESSED) {
            emailSender.send(to,
                    "Tu reembolso ha sido procesado — RutaUQ",
                    "Hola " + name + ",\n\n"
                    + "Tu reembolso por el viaje " + trip + " ha sido procesado exitosamente.\n"
                    + "Monto: $" + refund.getAmount() + " COP\n"
                    + "El reembolso aparecerá en tu método de pago original en 3–10 días hábiles.\n\n"
                    + "— Equipo RutaUQ");
        } else {
            emailSender.send(to,
                    "No pudimos procesar tu reembolso — RutaUQ",
                    "Hola " + name + ",\n\n"
                    + "Hubo un problema al procesar el reembolso por el viaje " + trip + ".\n"
                    + "Nuestro equipo lo revisará y se pondrá en contacto contigo.\n\n"
                    + "— Equipo RutaUQ");
        }
    }

    private RefundResponse toResponse(Refund refund) {
        RefundResponse r = new RefundResponse();
        r.setId(refund.getId());
        r.setReservationId(refund.getReservation().getId());
        r.setPaymentId(refund.getPayment().getId());
        r.setAmount(refund.getAmount());
        r.setStatus(refund.getStatus());
        r.setReason(refund.getReason());
        r.setMpRefundId(refund.getMpRefundId());
        r.setRequestedAt(refund.getRequestedAt());
        r.setProcessedAt(refund.getProcessedAt());
        return r;
    }
}
