package com.rutauq.backend.modules.payments.repository;

import com.rutauq.backend.modules.payments.domain.PaymentEventLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentEventLogRepository extends JpaRepository<PaymentEventLog, UUID> {

    Optional<PaymentEventLog> findByNotificationId(String notificationId);

    boolean existsByNotificationIdAndProcessedTrue(String notificationId);
}
