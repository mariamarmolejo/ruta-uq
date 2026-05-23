CREATE TABLE incidents (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id),
    reporter_id    UUID NOT NULL REFERENCES users(id),
    description    TEXT NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_reservation_id ON incidents(reservation_id);
