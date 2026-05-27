-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. DEVICES TABLE (admin-only access)
CREATE TABLE IF NOT EXISTS public.devices (
  serial TEXT PRIMARY KEY,
  customer TEXT NOT NULL,
  device_type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year TEXT,
  specs TEXT,
  date_added DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. REVIEWS TABLE (public can read approved + submit new; admin can read/manage all)
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  serial TEXT NOT NULL,
  rating INTEGER NOT NULL,
  text TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR DEVICES (admin-only)
CREATE POLICY "Devices are viewable by authenticated users only"
  ON public.devices FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Devices are insertable by authenticated users only"
  ON public.devices FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Devices are updatable by authenticated users only"
  ON public.devices FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Devices are deletable by authenticated users only"
  ON public.devices FOR DELETE
  USING (auth.role() = 'authenticated');

-- 5. RLS POLICIES FOR REVIEWS
--    - Anyone can read approved reviews
--    - Anyone can submit a new review
--    - Only authenticated admin can approve/delete reviews
CREATE POLICY "Approved reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING (approved = true OR auth.role() = 'authenticated');

CREATE POLICY "Anyone can submit a review"
  ON public.reviews FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Reviews are updatable by authenticated users only"
  ON public.reviews FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Reviews are deletable by authenticated users only"
  ON public.reviews FOR DELETE
  USING (auth.role() = 'authenticated');

-- 6. RPC FUNCTION: Check if a serial number exists (for review validation)
--    Runs with DEFINER permissions so the public can verify serials
--    without seeing the actual device data.
CREATE OR REPLACE FUNCTION public.check_serial_exists(p_serial TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.devices WHERE serial = p_serial);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_serial_exists TO anon;
GRANT EXECUTE ON FUNCTION public.check_serial_exists TO authenticated;

-- 7. SAMPLE DATA (matches existing devices/reviews JSON data)
INSERT INTO public.devices (serial, customer, device_type, brand, model, year, specs, date_added) VALUES
  ('SN-DELL-001', 'James M.', 'Laptop', 'Dell', 'XPS 15 9570', '2018', 'Intel i7-8750H, 16GB RAM, 512GB SSD, NVIDIA GTX 1050 Ti', '2026-05-15'),
  ('SN-CUSTOM-002', 'Maria G.', 'Desktop', 'Custom', 'Custom Build', '2020', 'AMD Ryzen 5 3600, 32GB RAM, 1TB NVMe + 1TB HDD, RTX 2060', '2026-05-10')
ON CONFLICT (serial) DO NOTHING;

INSERT INTO public.reviews (id, name, serial, rating, text, date, approved) VALUES
  ('review-001', 'James M.', 'SN-DELL-001', 5, 'Sosa saved my laptop! I thought it was completely dead and was ready to buy a new one. He explained exactly what was wrong and had it fixed in two days. Works better than before. Highly recommend!', '2026-05-17', true),
  ('review-002', 'Maria G.', 'SN-CUSTOM-002', 5, 'Wow, what a difference! My PC feels brand new. Sosa was professional, fast, and explained everything clearly. Boots in seconds now. Will definitely come back for any future repairs.', '2026-05-12', true)
ON CONFLICT (id) DO NOTHING;
