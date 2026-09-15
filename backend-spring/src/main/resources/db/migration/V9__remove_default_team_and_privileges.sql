-- V9: Remove default team_id and privileges to enforce invitation-based team access
-- This ensures users who self-register cannot access team data without a valid invitation

-- Remove default values for team_id and privileges
ALTER TABLE users
  ALTER COLUMN team_id DROP DEFAULT,
  ALTER COLUMN privileges DROP DEFAULT;

-- Only remove the old vulnerable default workspace (digitalia_workspace), preserve legitimate teams
UPDATE users
SET team_id = NULL, privileges = NULL
WHERE team_id = 'digitalia_workspace';
