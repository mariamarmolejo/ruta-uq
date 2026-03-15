package com.rutauq.backend.modules.payments.domain;

public enum PaymentStatus {
    PENDING,    // Order created on MP — awaiting payer action
    APPROVED,   // Transaction approved/accredited
    REJECTED,   // Transaction rejected
    CANCELLED,  // Order or transaction cancelled (expired, voided)
    REFUNDED    // Payment was refunded
}
