-- =============================================================
-- Ruta Compartida UQ - Reservations
-- Migration: V6__reservations.sql
-- Description: Passenger reservations for trips.
--              Seats are held (decremented) on creation.
--              One reservation per passenger per trip enforced by UNIQUE constraint.
-- =============================================================

CREATE TABLE reservations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id         UUID        NOT NULL REFERENCES trips(id),
    passenger_id    UUID        NOT NULL REFERENCES users(id),
    seats_reserved  INTEGER     NOT NULL DEFAULT 1,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_reservation_trip_passenger UNIQUE (trip_id, passenger_id)
);

CREATE INDEX idx_reservations_trip_id      ON reservations(trip_id);
CREATE INDEX idx_reservations_passenger_id ON reservations(passenger_id);
CREATE INDEX idx_reservations_status       ON reservations(status);
