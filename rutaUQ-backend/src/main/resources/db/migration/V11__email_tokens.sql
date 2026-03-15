-- Add email verification flag to users
-- Existing users are marked as verified so they keep access
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
UPDATE users SET email_verified = true;

-- Tokens for email verification and password reset
CREATE TABLE email_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL UNIQUE,
    type        VARCHAR(50) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_tokens_token   ON email_tokens(token);
CREATE INDEX idx_email_tokens_user_id ON email_tokens(user_id);
