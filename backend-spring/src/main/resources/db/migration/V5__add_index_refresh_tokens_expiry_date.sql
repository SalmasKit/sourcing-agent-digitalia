CREATE INDEX idx_rt_expiry_date ON refresh_tokens(expiry_date);
CREATE INDEX idx_rt_revoked ON refresh_tokens(revoked) WHERE revoked = TRUE;
