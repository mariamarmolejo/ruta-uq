package com.rutauq.backend.modules.payments.service;

import com.rutauq.backend.common.exception.AppException;
import com.rutauq.backend.common.exception.ErrorCode;
import com.rutauq.backend.modules.payments.config.MercadoPagoProperties;
import com.rutauq.backend.modules.payments.dto.mp.MpCreatePaymentRequest;
import com.rutauq.backend.modules.payments.dto.mp.MpPaymentResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MercadoPagoServiceTest {

    @Mock private RestTemplate restTemplate;

    private MercadoPagoService mercadoPagoService;

    @BeforeEach
    void setUp() {
        MercadoPagoProperties properties = new MercadoPagoProperties();
        properties.setApiBaseUrl("https://api.mercadopago.com");
        properties.setAccessToken("TEST-token");
        mercadoPagoService = new MercadoPagoService(restTemplate, properties);
    }

    // ---- createPayment ----

    @Test
    void createPayment_success_returnsPaymentResponse() {
        MpPaymentResponse mpResponse = new MpPaymentResponse();
        mpResponse.setId(123456789L);
        mpResponse.setStatus("pending");
        mpResponse.setPaymentMethodId("visa");

        when(restTemplate.exchange(
                eq("https://api.mercadopago.com/v1/payments"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(MpPaymentResponse.class)))
                .thenReturn(ResponseEntity.ok(mpResponse));

        MpCreatePaymentRequest request = MpCreatePaymentRequest.builder()
                .transactionAmount(new BigDecimal("10000.00"))
                .token("TEST_CARD_TOKEN")
                .paymentMethodId("visa")
                .installments(1)
                .externalReference("reservation-uuid")
                .payer(MpCreatePaymentRequest.MpPayer.builder()
                        .email("passenger@test.com")
                        .build())
                .build();

        MpPaymentResponse result = mercadoPagoService.createPayment(request, "reservation-uuid");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(123456789L);
        assertThat(result.getStatus()).isEqualTo("pending");
    }

    @Test
    void createPayment_clientError_throwsMercadoPagoError() {
        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(MpPaymentResponse.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.UNPROCESSABLE_ENTITY, "invalid card"));

        MpCreatePaymentRequest request = MpCreatePaymentRequest.builder()
                .externalReference("res-uuid")
                .build();

        assertThatThrownBy(() -> mercadoPagoService.createPayment(request, "res-uuid"))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MERCADO_PAGO_ERROR);
    }

    @Test
    void createPayment_serverError_throwsMercadoPagoError() {
        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(MpPaymentResponse.class)))
                .thenThrow(new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR));

        MpCreatePaymentRequest request = MpCreatePaymentRequest.builder()
                .externalReference("res-uuid")
                .build();

        assertThatThrownBy(() -> mercadoPagoService.createPayment(request, "res-uuid"))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MERCADO_PAGO_ERROR);
    }

    // ---- getPayment ----

    @Test
    void getPayment_success_returnsPaymentResponse() {
        MpPaymentResponse mpResponse = new MpPaymentResponse();
        mpResponse.setId(123456789L);
        mpResponse.setStatus("approved");

        when(restTemplate.exchange(
                eq("https://api.mercadopago.com/v1/payments/123456789"),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(MpPaymentResponse.class)))
                .thenReturn(ResponseEntity.ok(mpResponse));

        MpPaymentResponse result = mercadoPagoService.getPayment("123456789");

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo("approved");
    }

    @Test
    void getPayment_notFound_throwsPaymentNotFound() {
        when(restTemplate.exchange(
                anyString(),
                eq(HttpMethod.GET),
                any(HttpEntity.class),
                eq(MpPaymentResponse.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.NOT_FOUND, "not found"));

        assertThatThrownBy(() -> mercadoPagoService.getPayment("UNKNOWN"))
                .isInstanceOf(AppException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PAYMENT_NOT_FOUND);
    }
}
