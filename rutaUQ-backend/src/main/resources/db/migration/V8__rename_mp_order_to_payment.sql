-- =============================================================
-- Ruta Compartida UQ - Payments refactor
-- Migration: V8__rename_mp_order_to_payment.sql
-- Description: Rename mercado_pago_order_id → mercado_pago_payment_id
--              to reflect the switch from Orders API v2 to Payments API v1.
--              The Payments API v1 (POST /v1/payments) returns a numeric
--              payment ID, not an order ID.
-- =============================================================

ALTER TABLE payments
    RENAME COLUMN mercado_pago_order_id TO mercado_pago_payment_id;
