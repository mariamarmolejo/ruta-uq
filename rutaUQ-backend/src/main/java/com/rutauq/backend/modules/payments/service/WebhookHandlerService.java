package com.rutauq.backend.modules.payments.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.payments.domain.Payment;
import com.rutauq.backend.modules.payments.domain.PaymentEventLog;
import com.rutauq.backend.modules.payments.domain.PaymentStatus;
import com.rutauq.backend.modules.payments.dto.mp.MpPaymentResponse;
import com.rutauq.backend.modules.payments.dto.mp.MpWebhookNotification;
import com.rutauq.backend.modules.payments.repository.PaymentEventLogRepository;
import com.rutauq.backend.modules.payments.repository.PaymentRepository;
import com.rutauq.backend.modules.payments.webhook.WebhookSignatureValidator;
import com.rutauq.backend.modules.reservations.domain.Reservation;
import com.rutauq.backend.modules.reservations.domain.ReservationStatus;
import com.rutauq.backend.modules.reservations.repository.ReservationRepository;
import com.rutauq.backend.modules.trips.domain.Trip;
import com.rutauq.backend.modules.trips.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Processes incoming Mercado Pago webhook notifications (Payments API v1).
 *
 * Webhook payload type: "payment", action: "payment.created" | "payment.updated"
 * data.id = numeric MP payment ID
 *
 * Idempotency: notifications already successfully processed (processed=true)
 * are silently skipped. Failed attempts (processed=false) are retried.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookHandlerService {

    private final PaymentRepository paymentRepository;
    private final PaymentEventLogRepository eventLogRepository;
    private final ReservationRepository reservationRepository;
    private final TripRepository tripRepository;
    private final MercadoPagoService mercadoPagoService;
    private final WebhookSignatureValidator signatureValidator;
    private final ObjectMapper objectMapper;

    @Transactional
    public void handleWebhook(String rawPayload, String xSignature, String xRequestId) {
        MpWebhookNotification notification = parseNotification(rawPayload);
        String notificationId = notification.getId();
        String mpPaymentId = notification.getData() != null ? notification.getData().getId() : null;

        log.info("Webhook received — notificationId={} action={} mpPaymentId={}",
                notificationId, notification.getAction(), mpPaymentId);

        // 1. Idempotency: skip if already successfully processed
        if (notificationId != null
                && eventLogRepository.existsByNotificationIdAndProcessedTrue(notificationId)) {
            log.info("Notification {} already processed — skipping", notificationId);
            return;
        }

        // 2. Validate signature (skipped if webhook secret is blank — dev mode)
        if (mpPaymentId != null && !signatureValidator.validate(xSignature, xRequestId, mpPaymentId)) {
            log.warn("Invalid webhook signature for notification {} mpPaymentId={}",
                    notificationId, mpPaymentId);
            saveEventLog(null, notificationId, notification.getAction(), rawPayload, false);
            throw new AppException(ErrorCode.ACCESS_DENIED, "Invalid webhook signature");
        }

        if (mpPaymentId == null) {
            log.warn("Webhook notification {} has no data.id — ignoring", notificationId);
            saveEventLog(null, notificationId, notification.getAction(), rawPayload, true);
            return;
        }

        // 3. Find our local payment record by MP payment ID
        Payment payment = paymentRepository.findByMercadoPagoPaymentId(mpPaymentId).orElse(null);

        PaymentEventLog eventLog = saveEventLog(
                payment, notificationId, notification.getAction(), rawPayload, false);

        if (payment == null) {
            log.warn("No local payment found for mpPaymentId={} — marking as processed (no-op)", mpPaymentId);
            eventLog.setProcessed(true);
            eventLogRepository.save(eventLog);
            return;
        }

        // 4. Fetch current payment state from MP (GET /v1/payments/{id})
        MpPaymentResponse mpPaymentResponse = mercadoPagoService.getPayment(mpPaymentId);

        // 5. Update local payment status
        PaymentStatus newStatus = PaymentService.mapPaymentStatus(mpPaymentResponse);
        payment.setStatus(newStatus);
        paymentRepository.save(payment);

        // 6. Sync reservation and trip state
        syncReservation(payment.getReservation(), newStatus);

        // 7. Mark event as processed
        eventLog.setProcessed(true);
        eventLogRepository.save(eventLog);

        log.info("Webhook processed — mpPaymentId={} newStatus={} reservationId={}",
                mpPaymentId, newStatus, payment.getReservation().getId());
    }

    // ---- Private helpers ----

    private void syncReservation(Reservation reservation, PaymentStatus paymentStatus) {
        switch (paymentStatus) {
            case APPROVED -> {
                reservation.setStatus(ReservationStatus.CONFIRMED);
                reservationRepository.save(reservation);
                log.info("Reservation {} CONFIRMED after payment approval", reservation.getId());
            }
            case REJECTED, CANCELLED, REFUNDED -> {
                // Release seats only if they haven't been released already
                if (reservation.getStatus() != ReservationStatus.PAYMENT_FAILED
                        && reservation.getStatus() != ReservationStatus.CANCELLED) {
                    Trip trip = reservation.getTrip();
                    trip.setAvailableSeats(trip.getAvailableSeats() + reservation.getSeatsReserved());
                    tripRepository.save(trip);
                    log.info("Released {} seat(s) back to trip {} after payment failure",
                            reservation.getSeatsReserved(), trip.getId());
                }
                reservation.setStatus(ReservationStatus.PAYMENT_FAILED);
                reservationRepository.save(reservation);
            }
            default -> { /* PENDING — no reservation change */ }
        }
    }

    private PaymentEventLog saveEventLog(
            Payment payment, String notificationId, String eventType,
            String payload, boolean processed) {
        PaymentEventLog log = PaymentEventLog.builder()
                .payment(payment)
                .notificationId(notificationId)
                .eventType(eventType)
                .payload(payload)
                .processed(processed)
                .build();
        return eventLogRepository.save(log);
    }

    private MpWebhookNotification parseNotification(String rawPayload) {
        try {
            return objectMapper.readValue(rawPayload, MpWebhookNotification.class);
        } catch (Exception e) {
            log.error("Failed to parse webhook payload: {}", rawPayload, e);
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Invalid webhook payload");
        }
    }
}
