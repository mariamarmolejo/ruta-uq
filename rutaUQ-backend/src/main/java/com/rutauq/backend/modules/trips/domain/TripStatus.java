package com.rutauq.backend.modules.trips.domain;

public enum TripStatus {
    SCHEDULED,    // Published, accepting reservations
    IN_PROGRESS,  // Trip has started (Phase 7)
    COMPLETED,    // Trip finished (Phase 7)
    CANCELLED     // Cancelled by driver or admin
}
