-- ================================================================
-- FIX ERRORS - RUN DI SQL EDITOR SUPABASE
-- ================================================================

-- 1. FIX INFINITE RECURSION - Drop dan buat ulang policies users
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;

-- Policies baru tanpa infinite recursion
CREATE POLICY "users_select_authenticated" 
    ON public.users FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "users_update_own" 
    ON public.users FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "users_insert_admin" 
    ON public.users FOR INSERT 
    TO authenticated
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

CREATE POLICY "users_delete_admin" 
    ON public.users FOR DELETE 
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

-- 2. ADD MISSING COLUMNS ke service_orders
ALTER TABLE public.service_orders 
    ADD COLUMN IF NOT EXISTS customer_complaint TEXT,
    ADD COLUMN IF NOT EXISTS assigned_technician_id UUID REFERENCES public.users(id),
    ADD COLUMN IF NOT EXISTS created_by_receptionist_id UUID REFERENCES public.users(id),
    ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2);

-- ADD MISSING COLUMNS ke customers
ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 3. Migrate data dari kolom lama ke baru (jika ada data)
-- Service Orders
UPDATE public.service_orders 
SET customer_complaint = problem_description 
WHERE customer_complaint IS NULL;

UPDATE public.service_orders 
SET assigned_technician_id = technician_id 
WHERE assigned_technician_id IS NULL;

UPDATE public.service_orders 
SET created_by_receptionist_id = created_by 
WHERE created_by_receptionist_id IS NULL;

UPDATE public.service_orders 
SET cost = final_cost 
WHERE cost IS NULL;

-- Customers
UPDATE public.customers
SET full_name = name
WHERE full_name IS NULL;

UPDATE public.customers
SET phone_number = phone
WHERE phone_number IS NULL;

-- 4. FIX service_orders policies - hapus yang error
DROP POLICY IF EXISTS "orders_select" ON public.service_orders;
DROP POLICY IF EXISTS "orders_manage" ON public.service_orders;
DROP POLICY IF EXISTS "orders_tech_update" ON public.service_orders;
DROP POLICY IF EXISTS "orders_select_authenticated" ON public.service_orders;
DROP POLICY IF EXISTS "orders_insert_staff" ON public.service_orders;
DROP POLICY IF EXISTS "orders_update_staff" ON public.service_orders;
DROP POLICY IF EXISTS "orders_delete_admin" ON public.service_orders;

-- Policies baru tanpa infinite recursion
CREATE POLICY "orders_select_authenticated" 
    ON public.service_orders FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "orders_insert_staff" 
    ON public.service_orders FOR INSERT 
    TO authenticated
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role IN ('admin', 'receptionist')
        )
    );

CREATE POLICY "orders_update_staff" 
    ON public.service_orders FOR UPDATE 
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role IN ('admin', 'receptionist')
        )
        OR assigned_technician_id = auth.uid()
        OR technician_id = auth.uid()
    );

CREATE POLICY "orders_delete_admin" 
    ON public.service_orders FOR DELETE 
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

-- 5. FIX customers policies
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_manage" ON public.customers;
DROP POLICY IF EXISTS "customers_select_authenticated" ON public.customers;
DROP POLICY IF EXISTS "customers_modify_staff" ON public.customers;

CREATE POLICY "customers_select_authenticated" 
    ON public.customers FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "customers_modify_staff" 
    ON public.customers FOR ALL 
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role IN ('admin', 'receptionist')
        )
    );

-- 6. FIX inventory policies
DROP POLICY IF EXISTS "inventory_select" ON public.inventory;
DROP POLICY IF EXISTS "inventory_admin" ON public.inventory;
DROP POLICY IF EXISTS "inventory_select_authenticated" ON public.inventory;
DROP POLICY IF EXISTS "inventory_modify_admin" ON public.inventory;

CREATE POLICY "inventory_select_authenticated" 
    ON public.inventory FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "inventory_modify_admin" 
    ON public.inventory FOR ALL 
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

-- 7. FIX inventory_history policies
DROP POLICY IF EXISTS "inv_history_select" ON public.inventory_history;
DROP POLICY IF EXISTS "inv_history_admin" ON public.inventory_history;
DROP POLICY IF EXISTS "inv_history_select_authenticated" ON public.inventory_history;
DROP POLICY IF EXISTS "inv_history_modify_admin" ON public.inventory_history;

CREATE POLICY "inv_history_select_authenticated" 
    ON public.inventory_history FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "inv_history_modify_admin" 
    ON public.inventory_history FOR ALL 
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

-- 8. FIX activity_logs policies
DROP POLICY IF EXISTS "activity_admin" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_select_admin" ON public.activity_logs;

CREATE POLICY "activity_select_admin" 
    ON public.activity_logs FOR SELECT 
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

-- 9. FIX system_settings policies
DROP POLICY IF EXISTS "settings_select" ON public.system_settings;
DROP POLICY IF EXISTS "settings_admin" ON public.system_settings;
DROP POLICY IF EXISTS "settings_select_authenticated" ON public.system_settings;
DROP POLICY IF EXISTS "settings_modify_admin" ON public.system_settings;

CREATE POLICY "settings_select_authenticated" 
    ON public.system_settings FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "settings_modify_admin" 
    ON public.system_settings FOR ALL 
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

-- 10. FIX service_order_logs policies (sudah OK, tapi pastikan)
DROP POLICY IF EXISTS "logs_select" ON public.service_order_logs;
DROP POLICY IF EXISTS "logs_insert" ON public.service_order_logs;
DROP POLICY IF EXISTS "logs_select_authenticated" ON public.service_order_logs;
DROP POLICY IF EXISTS "logs_insert_authenticated" ON public.service_order_logs;

CREATE POLICY "logs_select_authenticated" 
    ON public.service_order_logs FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "logs_insert_authenticated" 
    ON public.service_order_logs FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- DONE! Refresh aplikasi dan error harusnya hilang.
