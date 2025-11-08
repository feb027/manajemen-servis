-- ================================================
-- INITIAL SCHEMA FOR MANAJEMEN SERVIS
-- Created: 2025-11-06
-- ================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. USERS TABLE (Main user table, NOT profiles)
-- ================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'receptionist', 'technician')),
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for users
CREATE POLICY "Users are viewable by authenticated users" 
    ON public.users FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" 
    ON public.users FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ================================================
-- 2. CUSTOMERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers" 
    ON public.customers FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and receptionists can manage customers" 
    ON public.customers FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'receptionist')
        )
    );

-- ================================================
-- 3. SERVICE ORDERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.service_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_contact TEXT NOT NULL,
    technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    device_type TEXT NOT NULL,
    brand_model TEXT,
    serial_number TEXT,
    problem_description TEXT NOT NULL,
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    status TEXT NOT NULL DEFAULT 'Baru' CHECK (
        status IN ('Baru', 'Dikerjakan', 'Menunggu Sparepart', 'Selesai', 'Dibatalkan', 'Siap Diambil')
    ),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    notes TEXT,
    parts_used TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view service orders" 
    ON public.service_orders FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Technicians can view assigned orders" 
    ON public.service_orders FOR SELECT 
    USING (technician_id = auth.uid());

CREATE POLICY "Admins and receptionists can manage orders" 
    ON public.service_orders FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'receptionist')
        )
    );

CREATE POLICY "Technicians can update assigned orders" 
    ON public.service_orders FOR UPDATE 
    USING (technician_id = auth.uid());

-- ================================================
-- 4. INVENTORY TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_name TEXT NOT NULL,
    item_code TEXT UNIQUE,
    category TEXT,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit TEXT DEFAULT 'pcs',
    unit_price DECIMAL(10,2),
    reorder_level INTEGER DEFAULT 5,
    supplier TEXT,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inventory" 
    ON public.inventory FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage inventory" 
    ON public.inventory FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ================================================
-- 5. INVENTORY HISTORY TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.inventory_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL,
    reference_type TEXT CHECK (reference_type IN ('purchase', 'usage', 'return', 'adjustment')),
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inventory history" 
    ON public.inventory_history FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage inventory history" 
    ON public.inventory_history FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ================================================
-- 6. SERVICE ORDER LOGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.service_order_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (
        event_type IN ('CREATED', 'STATUS_CHANGED', 'TECHNICIAN_ASSIGNED', 'COST_UPDATED', 'NOTES_UPDATED', 'PARTS_UPDATED', 'DETAILS_EDITED')
    ),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.service_order_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view logs" 
    ON public.service_order_logs FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert logs" 
    ON public.service_order_logs FOR INSERT 
    WITH CHECK (true);

-- ================================================
-- 7. ACTIVITY LOGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs" 
    ON public.activity_logs FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ================================================
-- 8. SYSTEM SETTINGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    description TEXT,
    updated_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settings" 
    ON public.system_settings FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage settings" 
    ON public.system_settings FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================
CREATE INDEX IF NOT EXISTS idx_service_orders_customer ON public.service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_technician ON public.service_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON public.service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_created_at ON public.service_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_history_inventory ON public.inventory_history(inventory_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON public.service_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, 'receptionist');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- INITIAL DATA (Optional)
-- ================================================

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
    ('company_name', '"Manajemen Servis"', 'Nama perusahaan'),
    ('company_address', '""', 'Alamat perusahaan'),
    ('company_phone', '""', 'Nomor telepon perusahaan'),
    ('company_email', '""', 'Email perusahaan'),
    ('currency', '"IDR"', 'Mata uang default'),
    ('tax_rate', '0', 'Persentase pajak (%)'),
    ('receipt_footer', '""', 'Footer untuk receipt/invoice')
ON CONFLICT (key) DO NOTHING;
