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
import com.rutauq.backend.modules.payments.dto.mp.MpPaymentResponse;
import com.rutauq.backend.modules.payments.mapper.PaymentMapper;
import com.rutauq.backend.modules.payments.repository.PaymentRepository;
import com.rutauq.backend.modules.reservations.domain.Reservation;
import com.rutauq.backend.modules.reservations.domain.ReservationStatus;
import com.rutauq.backend.modules.reservations.repository.ReservationRepository;
import com.rutauq.backend.modules.trips.domain.Trip;
import com.rutauq.backend.modules.payments.dto.mp.MpOrderResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private ReservationRepository reservationRepository;
    @Mock private MercadoPagoService mercadoPagoService;
    @Mock private MercadoPagoProperties mercadoPagoProperties;
    @Mock private PaymentMapper paymentMapper;


    @InjectMocks
    private PaymentService paymentService;

    private User passenger;
    private Trip trip;
    private Reservation reservation;
    private CreatePaymentRequest request;

    @BeforeEach
    void setUp() {
        passenger = User.builder()
                .id(UUID.randomUUID())
                .email("passenger@test.com")
                .role(Role.CLIENT)
                .build();

        trip = Trip.builder()
                .id(UUID.randomUUID())
                .origin("Armenia")
                .destination("Universidad de Quindío")
                .pricePerSeat(new BigDecimal("5000.00"))
                .availableSeats(3)
                .build();

        reservation = Reservation.builder()
                .id(UUID.randomUUID())
                .passenger(passenger)
                .trip(trip)
                .seatsReserved(2)
                .status(ReservationStatus.PENDING_PAYMENT)
                .build();

        request = new CreatePaymentRequest();
        request.setReservationId(reservation.getId());
        request.setCardToken("TEST_TOKEN_123");
        request.setPaymentMethodId("visa");
        request.setPaymentType("credit_card");
        request.setInstallments(1);
    }

    @Test
    void createPayment_success() {
        MpPaymentResponse mpResponse = new MpPaymentResponse();
        mpResponse.setId(123456789L);
        mpResponse.setStatus("pending");
        mpResponse.setPaymentMethodId("master");

        Payment savedPayment = Payment.builder()
                .id(UUID.randomUUID())
                .reservation(reservation)
                .mercadoPagoPaymentId("123456789")
                .status(PaymentStatus.PENDING)
                .amount(new BigDecimal("10000.00"))
                .currency("COP")
                .build();

        PaymentResponse expectedResponse = new PaymentResponse();
        expectedResponse.setId(savedPayment.getId());
        expectedResponse.setStatus(PaymentStatus.PENDING);

        when(reservationRepository.findById(reservation.getId())).thenReturn(Optional.of(reservation));
        when(paymentRepository.existsByReservationId(reservation.getId())).thenReturn(false);
        when(mercadoPagoProperties.getNotificationUrl()).thenReturn("http://localhost:8080/api/v1/payments/webhook");
        when(mercadoPagoService.createPayment(any(), anyString())).thenReturn(mpResponse);
        when(paymentRepository.save(any(Payment.class))).thenReturn(savedPayment);
        when(paymentMapper.toResponse(savedPayment)).thenReturn(expectedResponse);

        PaymentResponse result = paymentService.createPayment(passenger, request);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(PaymentStatus.PENDING);
        verify(mercadoPagoService).createPayment(any(), eq(reservation.getId().toString()));
        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    void createPayment_reservationNotFound_throws() {
        when(reservationRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.createPayment(passenger, request))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.RESERVATION_NOT_FOUND);
    }

    @Test
    void createPayment_wrongPassenger_throws() {
        User otherUser = User.builder().id(UUID.randomUUID()).build();
        when(reservationRepository.findById(reservation.getId())).thenReturn(Optional.of(reservation));

        assertThatThrownBy(() -> paymentService.createPayment(otherUser, request))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ACCESS_DENIED);
    }

    @Test
    void createPayment_invalidReservationStatus_throws() {
        reservation.setStatus(ReservationStatus.CONFIRMED);
        when(reservationRepository.findById(reservation.getId())).thenReturn(Optional.of(reservation));

        assertThatThrownBy(() -> paymentService.createPayment(passenger, request))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PAYMENT_INVALID_STATUS);
    }

    @Test
    void createPayment_duplicatePayment_throws() {
        when(reservationRepository.findById(reservation.getId())).thenReturn(Optional.of(reservation));
        when(paymentRepository.existsByReservationId(reservation.getId())).thenReturn(true);

        assertThatThrownBy(() -> paymentService.createPayment(passenger, request))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.RESOURCE_ALREADY_EXISTS);
    }


}
