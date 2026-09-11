-- V6: Add team support, user privileges, password reset, and team audit logs
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS team_id VARCHAR(100) DEFAULT 'digitalia_workspace',
  ADD COLUMN IF NOT EXISTS privileges VARCHAR(500) DEFAULT 'create_roles,shortlist_candidates,manage_notes,source_candidates,export_data',
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_expiry TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS team_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  invited_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  role        VARCHAR(50)  NOT NULL DEFAULT 'RECRUITER',
  privileges  VARCHAR(500) NOT NULL DEFAULT 'shortlist_candidates,manage_notes,source_candidates',
  token       VARCHAR(255) NOT NULL UNIQUE,
  status      VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       VARCHAR(100) NOT NULL,
  actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name    VARCHAR(255) NOT NULL,
  actor_email   VARCHAR(255) NOT NULL,
  actor_role    VARCHAR(50)  NOT NULL,
  action_type   VARCHAR(100) NOT NULL,
  target_id     VARCHAR(255),
  target_title  VARCHAR(255),
  details       TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_team ON activity_logs(team_id, created_at DESC);
