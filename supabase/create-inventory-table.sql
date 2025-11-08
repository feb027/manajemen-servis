-- ================================================================
-- CREATE INVENTORY TABLES - Untuk fitur inventory management
-- Run di SQL Editor Supabase
-- ================================================================

-- 1. CREATE inventory_items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_name TEXT NOT NULL,
    item_code TEXT UNIQUE,
    category TEXT,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit TEXT DEFAULT 'pcs',
    price DECIMAL(10,2),  -- Menggunakan 'price' sesuai kode aplikasi
    reorder_level INTEGER DEFAULT 5,
    supplier TEXT,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "inventory_items_select_authenticated" 
    ON public.inventory_items FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "inventory_items_modify_admin" 
    ON public.inventory_items FOR ALL 
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

-- 2. CREATE inventory_history table
CREATE TABLE IF NOT EXISTS public.inventory_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL,
    reference_type TEXT CHECK (reference_type IN ('purchase', 'usage', 'return', 'adjustment')),
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "inventory_history_select_authenticated" 
    ON public.inventory_history FOR SELECT 
    TO authenticated
    USING (true);

CREATE POLICY "inventory_history_modify_admin" 
    ON public.inventory_history FOR ALL 
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

-- 3. CREATE indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON public.inventory_items(item_code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_history_inventory ON public.inventory_history(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_created ON public.inventory_history(created_at DESC);

-- 4. CREATE trigger for updated_at
CREATE OR REPLACE FUNCTION update_inventory_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_items_updated_at 
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW 
    EXECUTE FUNCTION update_inventory_items_updated_at();

-- 5. CREATE function to automatically log inventory changes (DISABLED - manual logging dari aplikasi)
-- Trigger ini di-comment karena menyebabkan error saat insert item baru
-- Logging dilakukan manual dari aplikasi saat diperlukan

-- CREATE OR REPLACE FUNCTION log_inventory_change()
-- RETURNS TRIGGER AS $$
-- DECLARE
--     change_qty INTEGER;
--     trans_type TEXT;
-- BEGIN
--     IF TG_OP = 'UPDATE' AND OLD.quantity IS DISTINCT FROM NEW.quantity THEN
--         change_qty := NEW.quantity - OLD.quantity;
--         
--         IF change_qty > 0 THEN
--             trans_type := 'in';
--         ELSIF change_qty < 0 THEN
--             trans_type := 'out';
--             change_qty := ABS(change_qty);
--         ELSE
--             RETURN NEW;
--         END IF;
--         
--         INSERT INTO public.inventory_history (
--             inventory_id,
--             transaction_type,
--             quantity,
--             reference_type,
--             notes,
--             created_by,
--             created_at
--         ) VALUES (
--             NEW.id,
--             trans_type,
--             change_qty,
--             'adjustment',
--             'Auto-logged quantity change',
--             auth.uid(),
--             NOW()
--         );
--     END IF;
--     
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- CREATE TRIGGER log_inventory_change_trigger
--     AFTER UPDATE ON public.inventory_items
--     FOR EACH ROW
--     EXECUTE FUNCTION log_inventory_change();

-- DONE! Tabel inventory_items dan inventory_history sudah siap digunakan
-- Aplikasi sekarang bisa menyimpan data inventory
