package com.rutauq.backend.modules.payments.service;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.auth.domain.Role;
import com.rutauq.backend.modules.auth.domain.User;
import com.rutauq.backend.modules.payments.config.MercadoPagoProperties;
import com.rutauq.backend.modules.payments.domain.Payment;
import com.rutauq.backend.modules.payments.domain.PaymentStatus;
import com.rutauq.backend.modules.payments.dto.CreatePaymentRequest;
import com.rutauq.backend.modules.payments.dto.PaymentResponse;
import com.rutauq.backend.modules.payments.dto.mp.MpCreatePaymentRequest;
import com.rutauq.backend.modules.payments.dto.mp.MpPaymentResponse;
import com.rutauq.backend.modules.payments.mapper.PaymentMapper;
import com.rutauq.backend.modules.payments.repository.PaymentRepository;
import com.rutauq.backend.modules.reservations.domain.Reservation;
import com.rutauq.backend.modules.reservations.domain.ReservationStatus;
import com.rutauq.backend.modules.reservations.repository.ReservationRepository;
import com.rutauq.backend.modules.trips.domain.Trip;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final ReservationRepository reservationRepository;
    private final MercadoPagoService mercadoPagoService;
    private final MercadoPagoProperties properties;
    private final PaymentMapper paymentMapper;

    /**
     * Initiates a payment for a reservation via Mercado Pago Payments API v1.
     * Creates a POST /v1/payments request with the card token and stores the result.
     */
    @Transactional
    public PaymentResponse createPayment(User currentUser, CreatePaymentRequest request) {
        Reservation reservation = reservationRepository.findById(request.getReservationId())
                .orElseThrow(() -> new AppException(ErrorCode.RESERVATION_NOT_FOUND));

        if (!reservation.getPassenger().getId().equals(currentUser.getId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED,
                    "Only the passenger of this reservation can initiate payment");
        }

        if (reservation.getStatus() != ReservationStatus.PENDING_PAYMENT) {
            throw new AppException(ErrorCode.PAYMENT_INVALID_STATUS,
                    "Reservation must be in PENDING_PAYMENT status. Current status: " + reservation.getStatus());
        }

        if (paymentRepository.existsByReservationId(reservation.getId())) {
            throw new AppException(ErrorCode.RESOURCE_ALREADY_EXISTS,
                    "A payment already exists for this reservation");
        }

        Trip trip = reservation.getTrip();
        // COP: Mercado Pago rejects decimal transaction_amount (e.g. 51.00)
        BigDecimal amount = trip.getPricePerSeat()
                .multiply(BigDecimal.valueOf(reservation.getSeatsReserved()))
                .setScale(0, RoundingMode.HALF_UP);

        String externalRef = reservation.getId().toString();
        String payerEmail = (request.getPayerEmail() != null && !request.getPayerEmail().isBlank())
                ? request.getPayerEmail()
                : currentUser.getEmail();

        MpCreatePaymentRequest paymentRequest = buildPaymentRequest(
                request, trip, reservation, amount, externalRef, payerEmail);

        MpPaymentResponse mpResponse = mercadoPagoService.createPayment(paymentRequest, externalRef);

        Payment payment = Payment.builder()
                .reservation(reservation)
                .mercadoPagoPaymentId(String.valueOf(mpResponse.getId()))
                .status(mapPaymentStatus(mpResponse))
                .amount(amount)
                .currency("COP")
                .paymentMethod(mpResponse.getPaymentMethodId())
                .externalReference(externalRef)
                .build();

        payment = paymentRepository.save(payment);
        log.info("Payment created: id={} reservationId={} mpPaymentId={} status={}",
                payment.getId(), reservation.getId(), mpResponse.getId(), mpResponse.getStatus());

        return paymentMapper.toResponse(payment);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(UUID paymentId, User currentUser) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
        assertCanViewPayment(payment, currentUser);
        return paymentMapper.toResponse(payment);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentByReservationId(UUID reservationId, User currentUser) {
        Payment payment = paymentRepository.findByReservationId(reservationId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
        assertCanViewPayment(payment, currentUser);
        return paymentMapper.toResponse(payment);
    }

    // ---- Private helpers ----

    private MpCreatePaymentRequest buildPaymentRequest(
            CreatePaymentRequest req,
            Trip trip,
            Reservation reservation,
            BigDecimal amount,
            String externalRef,
            String payerEmail) {

        String itemTitle = "Seat Reservation: " + trip.getOrigin() + " → " + trip.getDestination();

        return MpCreatePaymentRequest.builder()
                .transactionAmount(amount)
                .token(req.getCardToken())
                .description(itemTitle)
                .installments(req.getInstallments())
                .paymentMethodId(req.getPaymentMethodId())
                .payer(MpCreatePaymentRequest.MpPayer.builder()
                        .email(payerEmail)
                        .build())
                .externalReference(externalRef)
                .notificationUrl(properties.getNotificationUrl())
                .additionalInfo(MpCreatePaymentRequest.MpAdditionalInfo.builder()
                        .items(List.of(MpCreatePaymentRequest.MpItem.builder()
                                .id(trip.getId().toString())
                                .title(itemTitle)
                                .unitPrice(trip.getPricePerSeat().setScale(0, RoundingMode.HALF_UP))
                                .quantity(reservation.getSeatsReserved())
                                .build()))
                        .build())
                .build();
    }

    /**
     * Maps Mercado Pago v1 payment status to our PaymentStatus.
     *
     * MP status → Our status:
     *   "approved"       → APPROVED
     *   "rejected"       → REJECTED
     *   "cancelled"      → CANCELLED
     *   "refunded"       → REFUNDED
     *   "charged_back"   → REFUNDED
     *   "pending"        → PENDING
     *   "in_process"     → PENDING
     *   "in_mediation"   → PENDING
     *   "authorized"     → PENDING
     */
    static PaymentStatus mapPaymentStatus(MpPaymentResponse mpResponse) {
        if (mpResponse.getStatus() == null) return PaymentStatus.PENDING;
        return switch (mpResponse.getStatus().toLowerCase()) {
            case "approved"     -> PaymentStatus.APPROVED;
            case "rejected"     -> PaymentStatus.REJECTED;
            case "cancelled"    -> PaymentStatus.CANCELLED;
            case "refunded", "charged_back" -> PaymentStatus.REFUNDED;
            default             -> PaymentStatus.PENDING;
        };
    }

    private void assertCanViewPayment(Payment payment, User currentUser) {
        boolean isPassenger = payment.getReservation().getPassenger().getId().equals(currentUser.getId());
        boolean isDriver = payment.getReservation().getTrip().getDriver().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        if (!isPassenger && !isDriver && !isAdmin) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
    }
}
