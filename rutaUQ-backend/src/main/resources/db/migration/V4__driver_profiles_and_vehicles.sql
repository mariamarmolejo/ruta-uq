-- =============================================================
-- Ruta Compartida UQ - Driver Profiles and Vehicles
-- Migration: V4__driver_profiles_and_vehicles.sql
-- Description: Driver-specific data and vehicle registry.
-- =============================================================

CREATE TABLE driver_profiles (
    id              UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    license_number  VARCHAR(50)  NOT NULL UNIQUE,
    license_expiry  DATE         NOT NULL,
    is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    verified_at     TIMESTAMP,
    rating          DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_trips     INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicles (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand       VARCHAR(100) NOT NULL,
    model       VARCHAR(100) NOT NULL,
    year        INTEGER      NOT NULL,
    color       VARCHAR(50)  NOT NULL,
    plate       VARCHAR(20)  NOT NULL UNIQUE,
    seats       INTEGER      NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX idx_vehicles_plate     ON vehicles(plate);
