-- Migration: Add RLS policy for admin to update all users
-- Created: 2025-11-09
-- Description: Allow admin users to update any user in the users table

-- Add policy for admin to update all users
CREATE POLICY users_update_admin
ON users
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

-- Verify policies
COMMENT ON POLICY users_update_admin ON users IS 'Allow admin users to update any user record';
