-- ================================================
-- NOTIFICATION SYSTEM TRIGGERS
-- ================================================
-- Automatically creates notifications when:
-- 1. New service order is created
-- 2. Service order status is updated
-- 3. Inventory item stock is low (< 10)
-- ================================================

-- Function to notify admins about new orders
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify all admin users
  INSERT INTO notifications (user_id, title, message, type, link_to, is_read)
  SELECT 
    id,
    'Order Baru',
    'Order baru dari ' || NEW.customer_name || ' - ' || NEW.device_type,
    'new_order',
    '/',  -- Admin dashboard is root
    false
  FROM users
  WHERE role = 'admin';
  
  -- Also notify receptionist
  INSERT INTO notifications (user_id, title, message, type, link_to, is_read)
  SELECT 
    id,
    'Order Baru',
    'Order baru dari ' || NEW.customer_name || ' - ' || NEW.device_type,
    'new_order',
    '/',  -- Receptionist dashboard is also root
    false
  FROM users
  WHERE role = 'receptionist';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new orders
DROP TRIGGER IF EXISTS trigger_notify_new_order ON service_orders;
CREATE TRIGGER trigger_notify_new_order
  AFTER INSERT ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_order();

-- Function to notify when order status changes
CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify admins
    INSERT INTO notifications (user_id, title, message, type, link_to, is_read)
    SELECT 
      id,
      'Status Order Berubah',
      'Order ' || NEW.customer_name || ' (' || NEW.device_type || ') - Status: ' || OLD.status || ' → ' || NEW.status,
      'status_update',
      '/',  -- Admin dashboard is root
      false
    FROM users
    WHERE role = 'admin';
    
    -- Notify assigned technician if exists
    IF NEW.technician_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link_to, is_read)
      VALUES (
        NEW.technician_id,
        'Status Order Berubah',
        'Order ' || NEW.customer_name || ' (' || NEW.device_type || ') - Status: ' || OLD.status || ' → ' || NEW.status,
        'status_update',
        '/',  -- Technician dashboard is root
        false
      );
    END IF;
    
    -- If order is completed, also notify receptionist
    IF NEW.status IN ('Selesai', 'Diambil') THEN
      INSERT INTO notifications (user_id, title, message, type, link_to, is_read)
      SELECT 
        id,
        'Order Selesai',
        'Order ' || NEW.customer_name || ' (' || NEW.device_type || ') sudah ' || NEW.status,
        'order_complete',
        '/',  -- Receptionist dashboard is root
        false
      FROM users
      WHERE role = 'receptionist';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for status changes
DROP TRIGGER IF EXISTS trigger_notify_status_change ON service_orders;
CREATE TRIGGER trigger_notify_status_change
  AFTER UPDATE ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_status_change();

-- TODO: Add inventory low stock notification when inventory table is created
-- CREATE OR REPLACE FUNCTION notify_low_stock() ...

-- ================================================
-- GRANT PERMISSIONS
-- ================================================
-- Drop restrictive insert policy and create permissive one for triggers
DROP POLICY IF EXISTS notifications_insert_own ON notifications;

CREATE POLICY notifications_insert_system
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow triggers to insert notifications for any user

-- ================================================
-- DELETE POLICY (for clearing read notifications)
-- ================================================
CREATE POLICY notifications_delete_own
  ON notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ================================================
-- COMMENTS
-- ================================================
COMMENT ON FUNCTION notify_new_order() IS 'Creates notification for admins when new order is created';
COMMENT ON FUNCTION notify_status_change() IS 'Creates notification when order status changes';
