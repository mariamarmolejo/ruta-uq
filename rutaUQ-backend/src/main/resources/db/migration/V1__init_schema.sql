-- =============================================================
-- Ruta Compartida UQ - Initial Schema Baseline
-- Migration: V1__init_schema.sql
-- Description: Establishes the schema baseline for the platform.
--              Tables will be added in subsequent migrations.
-- =============================================================

-- Create schema comment (PostgreSQL does not have schema descriptions
-- natively, so we use a dedicated metadata table)
CREATE TABLE IF NOT EXISTS schema_metadata (
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(100) NOT NULL UNIQUE,
    value       TEXT         NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO schema_metadata (key, value) VALUES
    ('platform',    'Ruta Compartida UQ'),
    ('version',     '1.0.0'),
    ('initialized', NOW()::TEXT);
