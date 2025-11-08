-- Migration: Add service_statuses table
-- Created: 2025-11-09
-- Description: Create table for managing service order statuses dynamically

-- Create service_statuses table
CREATE TABLE IF NOT EXISTS service_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'gray',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default statuses
INSERT INTO service_statuses (name, color, is_default, display_order) VALUES
  ('Baru', 'blue', true, 1),
  ('Diproses', 'yellow', false, 2),
  ('Menunggu Spare Part', 'orange', false, 3),
  ('Selesai', 'green', true, 4),
  ('Dibatalkan', 'red', true, 5)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_service_statuses_active ON service_statuses(is_active);
CREATE INDEX IF NOT EXISTS idx_service_statuses_order ON service_statuses(display_order);

-- Enable RLS
ALTER TABLE service_statuses ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read statuses
CREATE POLICY service_statuses_select_authenticated 
ON service_statuses FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Only admins can insert statuses
CREATE POLICY service_statuses_insert_admin 
ON service_statuses FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

-- Policy: Only admins can update statuses
CREATE POLICY service_statuses_update_admin 
ON service_statuses FOR UPDATE 
TO authenticated 
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

-- Policy: Only admins can delete (archive) statuses that are not default
-- Note: Application uses hard delete (actual DELETE) not soft delete
-- Pre-validation ensures status is not in use before deletion
-- FK constraint ON DELETE RESTRICT provides database-level protection
CREATE POLICY service_statuses_delete_admin 
ON service_statuses FOR DELETE 
TO authenticated 
USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  ) AND is_default = false
);

-- Add comment
COMMENT ON TABLE service_statuses IS 'Dynamic service order statuses managed by admin';

-- ===================================
-- Remove old CHECK constraint and add foreign key
-- ===================================

-- Remove the old hardcoded CHECK constraint that blocks dynamic statuses
ALTER TABLE service_orders 
DROP CONSTRAINT IF EXISTS service_orders_status_check;

-- Add foreign key constraint to validate status against service_statuses table
-- ON UPDATE CASCADE: If status name changes, update all orders automatically
-- ON DELETE RESTRICT: Prevent deleting a status that's still in use
ALTER TABLE service_orders 
ADD CONSTRAINT service_orders_status_fkey 
FOREIGN KEY (status) 
REFERENCES service_statuses(name) 
ON UPDATE CASCADE 
ON DELETE RESTRICT;

-- Add index for better performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
