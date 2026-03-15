-- =============================================================
-- Ruta Compartida UQ - Trips
-- Migration: V5__trips.sql
-- Description: Core trip table published by drivers.
-- =============================================================

CREATE TABLE trips (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id       UUID          NOT NULL REFERENCES users(id),
    vehicle_id      UUID          NOT NULL REFERENCES vehicles(id),
    origin          VARCHAR(255)  NOT NULL,
    destination     VARCHAR(255)  NOT NULL,
    departure_time  TIMESTAMP     NOT NULL,
    available_seats INTEGER       NOT NULL,
    price_per_seat  DECIMAL(10,2) NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'SCHEDULED',
    description     TEXT,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trips_driver_id      ON trips(driver_id);
CREATE INDEX idx_trips_status         ON trips(status);
CREATE INDEX idx_trips_departure_time ON trips(departure_time);
CREATE INDEX idx_trips_origin_dest    ON trips(origin, destination);
