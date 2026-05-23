CREATE TABLE ratings (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL UNIQUE REFERENCES reservations(id),
    rater_id       UUID NOT NULL REFERENCES users(id),
    stars          INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
    comment        VARCHAR(500),
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
