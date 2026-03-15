-- =============================================================
-- Ruta Compartida UQ - User Profiles
-- Migration: V3__user_profiles.sql
-- Description: Extended profile info for all users.
--              Uses shared primary key with users (one-to-one).
-- =============================================================

CREATE TABLE user_profiles (
    id                  UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio                 TEXT,
    avatar_url          VARCHAR(500),
    birth_date          DATE,
    privacy_accepted    BOOLEAN      NOT NULL DEFAULT FALSE,
    privacy_accepted_at TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);
