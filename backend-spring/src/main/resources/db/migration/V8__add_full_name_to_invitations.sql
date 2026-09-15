-- V8: Add full_name column to team_invitations table
ALTER TABLE team_invitations
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
