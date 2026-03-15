package com.rutauq.backend.modules.reservations.domain;

public enum ReservationStatus {
    PENDING,          // Legacy — migrated to PENDING_PAYMENT by V7 migration
    PENDING_PAYMENT,  // Created — seats held, awaiting payment
    CONFIRMED,        // Payment approved
    PAYMENT_FAILED,   // Payment rejected, cancelled, or expired — seats released
    CANCELLED,        // Cancelled by passenger or driver — seats released
    COMPLETED         // Trip finished (Phase 7)
}
