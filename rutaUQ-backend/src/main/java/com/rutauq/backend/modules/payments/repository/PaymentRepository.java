package com.rutauq.backend.modules.payments.repository;

import com.rutauq.backend.modules.payments.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByReservationId(UUID reservationId);

    /** Lookup by the numeric MP payment ID (e.g. "123456789") */
    Optional<Payment> findByMercadoPagoPaymentId(String mercadoPagoPaymentId);

    boolean existsByReservationId(UUID reservationId);
}
