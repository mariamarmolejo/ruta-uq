CREATE TABLE refunds (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id),
    payment_id     UUID NOT NULL REFERENCES payments(id),
    amount         NUMERIC(12,2) NOT NULL,
    status         VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    reason         VARCHAR(255),
    mp_refund_id   VARCHAR(100),
    requested_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at   TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_refunds_reservation_id ON refunds(reservation_id);
CREATE INDEX idx_refunds_payment_id     ON refunds(payment_id);
