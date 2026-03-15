-- =============================================================
-- Ruta Compartida UQ - Payments
-- Migration: V7__payments.sql
-- Description: Payment records linked to reservations (Phase 6).
--              Integrates with Mercado Pago Orders API v2.
--              Migrates reservation status PENDING → PENDING_PAYMENT.
-- =============================================================

-- 1. Migrate existing PENDING reservations to PENDING_PAYMENT
UPDATE reservations
SET status = 'PENDING_PAYMENT'
WHERE status = 'PENDING';

-- 2. Update column default for future rows
ALTER TABLE reservations
    ALTER COLUMN status SET DEFAULT 'PENDING_PAYMENT';

-- 3. Payments table (one payment per reservation)
CREATE TABLE payments (
    id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id          UUID           NOT NULL UNIQUE REFERENCES reservations(id),
    mercado_pago_order_id   VARCHAR(100),
    payment_status          VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    amount                  NUMERIC(12, 2) NOT NULL,
    currency                VARCHAR(10)    NOT NULL DEFAULT 'COP',
    payment_method          VARCHAR(50),
    external_reference      VARCHAR(100),
    created_at              TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_reservation_id        ON payments(reservation_id);
CREATE INDEX idx_payments_mp_order_id           ON payments(mercado_pago_order_id);
CREATE INDEX idx_payments_status                ON payments(payment_status);

-- 4. Payment event log — idempotency and audit trail for webhooks
CREATE TABLE payment_event_log (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id       UUID        REFERENCES payments(id),
    notification_id  VARCHAR(100),
    event_type       VARCHAR(50),
    payload          TEXT,
    processed        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_event_log_notification_id ON payment_event_log(notification_id);
CREATE INDEX idx_payment_event_log_payment_id      ON payment_event_log(payment_id);
