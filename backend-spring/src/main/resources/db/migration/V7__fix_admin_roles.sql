-- V7: Add missing columns and ensure admin accounts have HR_ADMIN role and full privileges
ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE users 
SET role = 'HR_ADMIN',
    privileges = 'create_roles,shortlist_candidates,manage_notes,source_candidates,export_data'
WHERE email ILIKE '%admin%' 
   OR email ILIKE '%hr@%' 
   OR email ILIKE 'hr.%' 
   OR email = 'hr@digitalia.io' 
   OR full_name ILIKE '%HR Admin%' 
   OR full_name ILIKE '%Admin%';

