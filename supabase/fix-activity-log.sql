-- ================================================================
-- FIX ACTIVITY LOG - Auto-logging untuk service_orders
-- Run di SQL Editor Supabase
-- ================================================================

-- DROP existing trigger if exists
DROP TRIGGER IF EXISTS log_service_order_changes ON public.service_orders;
DROP FUNCTION IF EXISTS log_service_order_changes();

-- CREATE function to log service order changes
CREATE OR REPLACE FUNCTION log_service_order_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current authenticated user ID
    current_user_id := auth.uid();

    -- Log STATUS_CHANGED
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.service_order_logs (
            service_order_id,
            user_id,
            event_type,
            details,
            created_at
        ) VALUES (
            NEW.id,
            current_user_id,
            'STATUS_CHANGED',
            jsonb_build_object(
                'old', OLD.status,
                'new', NEW.status
            ),
            NOW()
        );
    END IF;

    -- Log TECHNICIAN_ASSIGNED
    IF TG_OP = 'UPDATE' AND (
        OLD.assigned_technician_id IS DISTINCT FROM NEW.assigned_technician_id
        OR OLD.technician_id IS DISTINCT FROM NEW.technician_id
    ) THEN
        INSERT INTO public.service_order_logs (
            service_order_id,
            user_id,
            event_type,
            details,
            created_at
        ) VALUES (
            NEW.id,
            current_user_id,
            'TECHNICIAN_ASSIGNED',
            jsonb_build_object(
                'old_id', COALESCE(OLD.assigned_technician_id, OLD.technician_id),
                'new_id', COALESCE(NEW.assigned_technician_id, NEW.technician_id)
            ),
            NOW()
        );
    END IF;

    -- Log COST_UPDATED
    IF TG_OP = 'UPDATE' AND (
        OLD.cost IS DISTINCT FROM NEW.cost
        OR OLD.final_cost IS DISTINCT FROM NEW.final_cost
        OR OLD.estimated_cost IS DISTINCT FROM NEW.estimated_cost
    ) THEN
        INSERT INTO public.service_order_logs (
            service_order_id,
            user_id,
            event_type,
            details,
            created_at
        ) VALUES (
            NEW.id,
            current_user_id,
            'COST_UPDATED',
            jsonb_build_object(
                'old', COALESCE(OLD.cost, OLD.final_cost, OLD.estimated_cost),
                'new', COALESCE(NEW.cost, NEW.final_cost, NEW.estimated_cost)
            ),
            NOW()
        );
    END IF;

    -- Log NOTES_UPDATED
    IF TG_OP = 'UPDATE' AND OLD.notes IS DISTINCT FROM NEW.notes THEN
        INSERT INTO public.service_order_logs (
            service_order_id,
            user_id,
            event_type,
            details,
            created_at
        ) VALUES (
            NEW.id,
            current_user_id,
            'NOTES_UPDATED',
            jsonb_build_object(
                'old', OLD.notes,
                'new', NEW.notes
            ),
            NOW()
        );
    END IF;

    -- Log PARTS_UPDATED
    IF TG_OP = 'UPDATE' AND OLD.parts_used IS DISTINCT FROM NEW.parts_used THEN
        INSERT INTO public.service_order_logs (
            service_order_id,
            user_id,
            event_type,
            details,
            created_at
        ) VALUES (
            NEW.id,
            current_user_id,
            'PARTS_UPDATED',
            jsonb_build_object(
                'old', OLD.parts_used,
                'new', NEW.parts_used
            ),
            NOW()
        );
    END IF;

    -- Log CREATED
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.service_order_logs (
            service_order_id,
            user_id,
            event_type,
            details,
            created_at
        ) VALUES (
            NEW.id,
            current_user_id,
            'CREATED',
            jsonb_build_object(
                'customer_name', NEW.customer_name,
                'device_type', NEW.device_type,
                'status', NEW.status
            ),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CREATE trigger to log changes
CREATE TRIGGER log_service_order_changes
    AFTER INSERT OR UPDATE ON public.service_orders
    FOR EACH ROW
    EXECUTE FUNCTION log_service_order_changes();

-- DONE! Sekarang setiap perubahan status akan otomatis tercatat dengan benar
