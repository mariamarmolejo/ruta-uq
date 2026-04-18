package com.rutauq.backend.modules.refunds.domain;

public enum RefundStatus {
    PENDING,    // Refund record created; MP call in progress
    PROCESSED,  // MP confirmed the refund
    FAILED      // MP rejected the refund or call failed
}
