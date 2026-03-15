-- =============================================================
-- Ruta Compartida UQ
-- Migration: V9__fix_reservation_unique_constraint.sql
-- Description: Replace the unconditional UNIQUE constraint on
--              (trip_id, passenger_id) with a partial unique index
--              that only covers active reservations.
--              This allows a passenger to re-book the same trip
--              after their previous reservation was CANCELLED or
--              PAYMENT_FAILED.
-- =============================================================

-- Drop the old table-level constraint
ALTER TABLE reservations
    DROP CONSTRAINT uq_reservation_trip_passenger;

-- Partial unique index: only one active reservation per (trip, passenger)
CREATE UNIQUE INDEX uq_active_reservation_trip_passenger
    ON reservations (trip_id, passenger_id)
    WHERE status NOT IN ('CANCELLED', 'PAYMENT_FAILED', 'COMPLETED');
