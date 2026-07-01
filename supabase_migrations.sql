-- =============================================
-- CRAFTO MIGRATIONS
-- Run these in Supabase SQL Editor
-- =============================================

-- 1. Add extra image columns to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url_2 TEXT,
  ADD COLUMN IF NOT EXISTS image_url_3 TEXT;

-- 2. Allow admin (service role) to do full CRUD on products
-- (anon key cannot INSERT/UPDATE/DELETE products – only service role can)
-- No policy needed for service role – it bypasses RLS by default.

-- 3. Allow admin (service role) to read orders
-- Service role bypasses RLS, so no extra policy needed.

-- 4. Update seed products with placeholder images (optional – replace URLs with real ones)
UPDATE products SET
  image_url   = 'https://placehold.co/600x450?text=Blue+Pottery+1',
  image_url_2 = 'https://placehold.co/600x450?text=Blue+Pottery+2',
  image_url_3 = 'https://placehold.co/600x450?text=Blue+Pottery+3'
WHERE title = 'Handcrafted Blue Pottery Vase';

UPDATE products SET
  image_url   = 'https://placehold.co/600x450?text=Wall+Hanging+1',
  image_url_2 = 'https://placehold.co/600x450?text=Wall+Hanging+2',
  image_url_3 = 'https://placehold.co/600x450?text=Wall+Hanging+3'
WHERE title = 'Embroidered Wall Hanging';

UPDATE products SET
  image_url   = 'https://placehold.co/600x450?text=Side+Table+1',
  image_url_2 = 'https://placehold.co/600x450?text=Side+Table+2',
  image_url_3 = 'https://placehold.co/600x450?text=Side+Table+3'
WHERE title = 'Carved Wooden Side Table';

UPDATE products SET
  image_url   = 'https://placehold.co/600x450?text=Cushion+1',
  image_url_2 = 'https://placehold.co/600x450?text=Cushion+2',
  image_url_3 = 'https://placehold.co/600x450?text=Cushion+3'
WHERE title = 'Ralli Patchwork Cushion Cover';

UPDATE products SET
  image_url   = 'https://placehold.co/600x450?text=Jewelry+Box+1',
  image_url_2 = 'https://placehold.co/600x450?text=Jewelry+Box+2',
  image_url_3 = 'https://placehold.co/600x450?text=Jewelry+Box+3'
WHERE title = 'Camel Bone Jewelry Box';

-- =============================================
-- 5. Orders RLS — customers place orders; admin uses service key
-- =============================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can read orders" ON orders;
DROP POLICY IF EXISTS "Anon can update order status" ON orders;
DROP POLICY IF EXISTS "Anyone can place an order" ON orders;
DROP POLICY IF EXISTS "Anon can insert orders" ON orders;

CREATE POLICY "Anon can insert orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

-- =============================================
-- 6. Secure order tracking (order ID + phone must match)
-- =============================================

CREATE OR REPLACE FUNCTION get_order_status(p_order_id text, p_phone text)
RETURNS TABLE (
  id uuid,
  order_number text,
  created_at timestamptz,
  customer_name text,
  customer_phone text,
  customer_address text,
  items jsonb,
  total numeric,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, order_number, created_at, customer_name, customer_phone, customer_address, items, total, status
  FROM orders
  WHERE (id::text = p_order_id OR order_number = p_order_id)
    AND customer_phone = p_phone
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_order_status(text, text) TO anon;
GRANT EXECUTE ON FUNCTION get_order_status(text, text) TO authenticated;

-- =============================================
-- 7. Product reviews
-- =============================================

CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON reviews(product_id);
CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews(created_at DESC);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reviews" ON reviews;
DROP POLICY IF EXISTS "Anyone can post reviews" ON reviews;

CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can post reviews"
  ON reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(trim(author_name)) > 0
    AND char_length(trim(comment)) >= 10
    AND rating >= 1 AND rating <= 5
  );

GRANT SELECT, INSERT ON reviews TO anon;
GRANT SELECT, INSERT ON reviews TO authenticated;

-- =============================================
-- 8. Review pinning (admin pins via service key)
-- =============================================

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS reviews_pinned_idx ON reviews(pinned DESC, created_at DESC);

-- =============================================
-- 9. Customer cancel & return (order ID + phone verified)
-- =============================================

CREATE OR REPLACE FUNCTION cancel_order(p_order_id text, p_phone text)
RETURNS TABLE (
  id uuid,
  order_number text,
  created_at timestamptz,
  customer_name text,
  customer_phone text,
  customer_address text,
  items jsonb,
  total numeric,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec orders%ROWTYPE;
BEGIN
  UPDATE orders o
  SET status = 'cancelled'
  WHERE (o.id::text = p_order_id OR o.order_number = p_order_id)
    AND o.customer_phone = p_phone
    AND o.status = 'pending'
  RETURNING * INTO rec;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order cannot be cancelled. Only pending orders can be cancelled.';
  END IF;

  RETURN QUERY SELECT rec.id, rec.order_number, rec.created_at, rec.customer_name, rec.customer_phone,
                      rec.customer_address, rec.items, rec.total, rec.status;
END;
$$;

CREATE OR REPLACE FUNCTION request_return(p_order_id text, p_phone text)
RETURNS TABLE (
  id uuid,
  order_number text,
  created_at timestamptz,
  customer_name text,
  customer_phone text,
  customer_address text,
  items jsonb,
  total numeric,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec orders%ROWTYPE;
BEGIN
  UPDATE orders o
  SET status = 'return_requested'
  WHERE (o.id::text = p_order_id OR o.order_number = p_order_id)
    AND o.customer_phone = p_phone
    AND o.status IN ('confirmed', 'shipped', 'delivered')
  RETURNING * INTO rec;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Return not available. You can return confirmed, shipped, or delivered orders only.';
  END IF;

  RETURN QUERY SELECT rec.id, rec.order_number, rec.created_at, rec.customer_name, rec.customer_phone,
                      rec.customer_address, rec.items, rec.total, rec.status;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_order(text, text) TO anon;
GRANT EXECUTE ON FUNCTION cancel_order(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION request_return(text, text) TO anon;
GRANT EXECUTE ON FUNCTION request_return(text, text) TO authenticated;

-- =============================================
-- 10. Storage bucket for product images
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anon users to read (public bucket already does this, but explicit policy helps)
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'product-images');

-- Service role can upload (bypasses RLS by default, so this is informational)
-- Admin frontend uses the service key so no extra policy is needed for writes.

-- =============================================
-- 11. Add discount_percent to products
-- =============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percent INT DEFAULT 0;

-- =============================================
-- 12. Add featured flag to products
-- =============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- =============================================
-- 13. Coupon / discount codes (must be before place_order)
-- =============================================
CREATE TABLE IF NOT EXISTS coupons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,
  discount_percent INT NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 100),
  max_uses         INT DEFAULT 0,
  used_count       INT DEFAULT 0,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read coupons" ON coupons;
CREATE POLICY "Anyone can read coupons"
  ON coupons FOR SELECT TO anon USING (true);

-- Add coupon_code to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- =============================================
-- 12. Atomic checkout: validate stock → decrement → place order (updated with coupon support)
-- =============================================

-- Add order_number column for user-friendly tracking IDs
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_idx ON orders (order_number);

DROP FUNCTION IF EXISTS place_order();

CREATE OR REPLACE FUNCTION place_order(
  p_id               uuid,
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_address text,
  p_items            jsonb,
  p_total            numeric,
  p_coupon_code      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item       jsonb;
  prod_id    uuid;
  prod_qty   int;
  prod_rec   RECORD;
  coup_rec   coupons%ROWTYPE;
  ord_num    text;
  done       bool;
  rnd_str    text;
  chars      text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  -- Generate unique order_number (CRAFTOID-XXXXXX)
  done := false;
  WHILE NOT done LOOP
    rnd_str := '';
    FOR i IN 1..6 LOOP
      rnd_str := rnd_str || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    ord_num := 'CRAFTOID-' || rnd_str;
    BEGIN
      INSERT INTO orders (id, customer_name, customer_phone, customer_address, items, total, status, coupon_code, order_number)
      VALUES (p_id, p_customer_name, p_customer_phone, p_customer_address, p_items, p_total, 'pending',
              CASE WHEN p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN p_coupon_code ELSE NULL END,
              ord_num);
      done := true;
    EXCEPTION WHEN unique_violation THEN
      -- collision, retry
    END;
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    prod_id  := (item->>'id')::uuid;
    prod_qty := (item->>'qty')::int;

    SELECT * INTO prod_rec
    FROM products
    WHERE id = prod_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found: %', item->>'title';
    END IF;

    IF prod_rec.stock < prod_qty THEN
      RAISE EXCEPTION 'Insufficient stock for "%". Available: %, requested: %',
        prod_rec.title, prod_rec.stock, prod_qty;
    END IF;

    UPDATE products
    SET stock = stock - prod_qty
    WHERE id = prod_id;
  END LOOP;

  -- Apply coupon if provided
  IF p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN
    SELECT * INTO coup_rec FROM coupons WHERE LOWER(coupons.code) = LOWER(p_coupon_code) AND coupons.is_active = true FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid coupon code.';
    END IF;

    IF coup_rec.expires_at IS NOT NULL AND coup_rec.expires_at < now() THEN
      RAISE EXCEPTION 'Coupon has expired.';
    END IF;

    IF coup_rec.max_uses > 0 AND coup_rec.used_count >= coup_rec.max_uses THEN
      RAISE EXCEPTION 'Coupon usage limit reached.';
    END IF;

    UPDATE coupons SET used_count = used_count + 1 WHERE id = coup_rec.id;
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', p_id, 'order_number', ord_num);
END;
$$;

GRANT EXECUTE ON FUNCTION place_order(uuid, text, text, text, jsonb, numeric, text) TO anon;

-- validate_coupon: returns discount info or raises error
CREATE OR REPLACE FUNCTION validate_coupon(p_code TEXT)
RETURNS TABLE (id UUID, discount_percent INT, code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec coupons%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM coupons WHERE LOWER(coupons.code) = LOWER(p_code) AND coupons.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid coupon code.';
  END IF;

  IF rec.expires_at IS NOT NULL AND rec.expires_at < now() THEN
    RAISE EXCEPTION 'Coupon has expired.';
  END IF;

  IF rec.max_uses > 0 AND rec.used_count >= rec.max_uses THEN
    RAISE EXCEPTION 'Coupon usage limit reached.';
  END IF;

  RETURN QUERY SELECT rec.id, rec.discount_percent, rec.code;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_coupon(TEXT) TO anon;

-- =============================================
-- 13. Hero images for homepage slider
-- =============================================
CREATE TABLE IF NOT EXISTS hero_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hero_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read active hero" ON hero_images
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow service all hero" ON hero_images
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON hero_images TO anon;

-- =============================================
-- 15. Product variants (size/color/price/stock)
-- =============================================

CREATE TABLE IF NOT EXISTS product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size        TEXT,
  color       TEXT,
  price       NUMERIC,
  stock       INTEGER NOT NULL DEFAULT 0,
  sku         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants(product_id);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read variants" ON product_variants
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow service all variants" ON product_variants
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON product_variants TO anon;

-- =============================================
-- 16. Update place_order to handle variant stock
-- =============================================

DROP FUNCTION IF EXISTS place_order();

CREATE OR REPLACE FUNCTION place_order(
  p_id               uuid,
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_address text,
  p_items            jsonb,
  p_total            numeric,
  p_coupon_code      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item          jsonb;
  prod_id       uuid;
  var_id        uuid;
  prod_qty      int;
  prod_rec      RECORD;
  var_rec       RECORD;
  coup_rec      coupons%ROWTYPE;
  ord_num       text;
  done          bool;
  rnd_str       text;
  chars         text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  -- Generate unique order_number (CRAFTOID-XXXXXX)
  done := false;
  WHILE NOT done LOOP
    rnd_str := '';
    FOR i IN 1..6 LOOP
      rnd_str := rnd_str || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    ord_num := 'CRAFTOID-' || rnd_str;
    BEGIN
      INSERT INTO orders (id, customer_name, customer_phone, customer_address, items, total, status, coupon_code, order_number)
      VALUES (p_id, p_customer_name, p_customer_phone, p_customer_address, p_items, p_total, 'pending',
              CASE WHEN p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN p_coupon_code ELSE NULL END,
              ord_num);
      done := true;
    EXCEPTION WHEN unique_violation THEN
    END;
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    prod_id  := (item->>'id')::uuid;
    prod_qty := (item->>'qty')::int;
    var_id   := (item->>'variant_id')::uuid;

    IF var_id IS NOT NULL THEN
      -- Variant-based stock check
      SELECT * INTO var_rec
      FROM product_variants
      WHERE id = var_id AND product_id = prod_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variant not found for product "%"', item->>'title';
      END IF;

      IF var_rec.stock < prod_qty THEN
        RAISE EXCEPTION 'Insufficient stock for "%". Available: %, requested: %',
          item->>'title', var_rec.stock, prod_qty;
      END IF;

      UPDATE product_variants
      SET stock = stock - prod_qty
      WHERE id = var_id;
    ELSE
      -- Product-level stock check (backward compatible)
      SELECT * INTO prod_rec
      FROM products
      WHERE id = prod_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', item->>'title';
      END IF;

      IF prod_rec.stock < prod_qty THEN
        RAISE EXCEPTION 'Insufficient stock for "%". Available: %, requested: %',
          prod_rec.title, prod_rec.stock, prod_qty;
      END IF;

      UPDATE products
      SET stock = stock - prod_qty
      WHERE id = prod_id;
    END IF;
  END LOOP;

  -- Apply coupon if provided
  IF p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN
    SELECT * INTO coup_rec FROM coupons WHERE LOWER(coupons.code) = LOWER(p_coupon_code) AND coupons.is_active = true FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid coupon code.';
    END IF;

    IF coup_rec.expires_at IS NOT NULL AND coup_rec.expires_at < now() THEN
      RAISE EXCEPTION 'Coupon has expired.';
    END IF;

    IF coup_rec.max_uses > 0 AND coup_rec.used_count >= coup_rec.max_uses THEN
      RAISE EXCEPTION 'Coupon usage limit reached.';
    END IF;

    UPDATE coupons SET used_count = used_count + 1 WHERE id = coup_rec.id;
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', p_id, 'order_number', ord_num);
END;
$$;

GRANT EXECUTE ON FUNCTION place_order(uuid, text, text, text, jsonb, numeric, text) TO anon;

-- =============================================
-- 17. Performance indexes for faster queries
-- =============================================

-- Products: listing & sorting
CREATE INDEX IF NOT EXISTS products_created_at_idx ON products (created_at DESC);
CREATE INDEX IF NOT EXISTS products_featured_idx ON products (featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS products_category_gin_idx ON products USING GIN (category);

-- Orders: admin listing & RPC lookups
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_created_at_idx ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders (customer_phone);

-- Coupons: validation & listing
CREATE INDEX IF NOT EXISTS coupons_code_lower_idx ON coupons (LOWER(code));
CREATE INDEX IF NOT EXISTS coupons_created_at_idx ON coupons (created_at DESC);

-- Hero images: active lookup
CREATE INDEX IF NOT EXISTS hero_images_is_active_idx ON hero_images (is_active) WHERE is_active = true;

-- =============================================
-- 18. Migration: TEXT → TEXT[] for multi-category (safe to re-run)
-- =============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products'
      AND column_name = 'category'
      AND data_type = 'text'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE products ALTER COLUMN category TYPE TEXT[]
    USING CASE
      WHEN category IS NULL OR category = '' THEN ARRAY[]::TEXT[]
      ELSE string_to_array(category, ', ')
    END;
  END IF;
END $$;

-- 19. Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default categories
INSERT INTO categories (name, sort_order) VALUES
  ('Vase', 1),
  ('Jewelry boxes', 2),
  ('Lamps', 3),
  ('Tables', 4),
  ('Candle stands', 5),
  ('Planters', 6),
  ('Others', 7)
ON CONFLICT (name) DO NOTHING;

-- 20. Enable anon read access for categories
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_categories" ON categories;
CREATE POLICY "anon_read_categories" ON categories
  FOR SELECT USING (true);

-- =============================================
-- 21. (end)
-- =============================================

-- =============================================
-- 22. Add weight_kg to products for outstation delivery pricing
--     (Rs 150 per kg for cities outside Rawalpindi/Islamabad)
-- =============================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC DEFAULT 0;

-- =============================================
-- 23. Invoices table for automatic invoice generation
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  items jsonb NOT NULL,
  subtotal NUMERIC NOT NULL,
  discount_amount NUMERIC DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  coupon_code TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_order_id_idx ON invoices(order_id);
CREATE INDEX IF NOT EXISTS invoices_invoice_number_idx ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices(created_at DESC);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Anon can read invoices by order_id (for their own orders)
CREATE POLICY "Anon can read own invoices"
  ON invoices FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role can do everything
CREATE POLICY "Service role full access invoices"
  ON invoices FOR ALL
  USING (true) WITH CHECK (true);

GRANT SELECT ON invoices TO anon;
GRANT SELECT ON invoices TO authenticated;

-- =============================================
-- 24. Function to generate invoice number (INV-XXXXXX)
-- =============================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  inv_num TEXT;
  done BOOLEAN := false;
  rnd_str TEXT;
  chars TEXT := '0123456789';
BEGIN
  WHILE NOT done LOOP
    rnd_str := '';
    FOR i IN 1..6 LOOP
      rnd_str := rnd_str || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    inv_num := 'INV-' || rnd_str;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = inv_num);
  END LOOP;
  RETURN inv_num;
END;
$$;

-- =============================================
-- 25. Function to create invoice automatically after order placement
-- =============================================
CREATE OR REPLACE FUNCTION create_invoice(p_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_rec orders%ROWTYPE;
  inv_id UUID;
  inv_num TEXT;
  subtotal_calc NUMERIC;
  item jsonb;
  price_val TEXT;
  qty_val INT;
BEGIN
  SELECT * INTO order_rec FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  inv_num := generate_invoice_number();
  
  -- Calculate subtotal from items with robust JSON handling
  subtotal_calc := 0;
  FOR item IN SELECT * FROM jsonb_array_elements(order_rec.items)
  LOOP
    -- Extract price as text first
    price_val := NULL;
    IF item ? 'price' THEN
      IF jsonb_typeof(item->'price') = 'number' THEN
        price_val := (item->'price')::TEXT;
      ELSIF jsonb_typeof(item->'price') = 'string' THEN
        price_val := item->>'price';
      END IF;
    END IF;
    
    -- Extract qty
    qty_val := 1;
    IF item ? 'qty' THEN
      IF jsonb_typeof(item->'qty') = 'number' THEN
        qty_val := (item->'qty')::INT;
      ELSIF jsonb_typeof(item->'qty') = 'string' THEN
        qty_val := (item->>'qty')::INT;
      END IF;
    END IF;
    
    -- Convert price to numeric with error handling
    IF price_val IS NOT NULL THEN
      BEGIN
        subtotal_calc := subtotal_calc + (price_val::NUMERIC * qty_val);
      EXCEPTION WHEN OTHERS THEN
        -- If conversion fails, skip this item
        RAISE NOTICE 'Failed to parse price for item: %, price: %', item, price_val;
      END;
    END IF;
  END LOOP;
  
  INSERT INTO invoices (
    order_id, invoice_number, customer_name, customer_phone, customer_address,
    items, subtotal, discount_amount, delivery_fee, total, coupon_code, status
  )
  VALUES (
    p_order_id, inv_num, order_rec.customer_name, order_rec.customer_phone, order_rec.customer_address,
    order_rec.items, 
    subtotal_calc,
    0, -- discount_amount (will be calculated if coupon exists)
    0, -- delivery_fee (stored separately or calculated)
    order_rec.total,
    order_rec.coupon_code,
    'active'
  )
  RETURNING id INTO inv_id;
  
  RETURN inv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_invoice(UUID) TO anon;
GRANT EXECUTE ON FUNCTION create_invoice(UUID) TO authenticated;

-- =============================================
-- 26. Function to cancel invoice when order is cancelled
-- =============================================
CREATE OR REPLACE FUNCTION cancel_invoice(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE invoices
  SET status = 'cancelled', updated_at = now()
  WHERE order_id = p_order_id AND status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_invoice(UUID) TO anon;
GRANT EXECUTE ON FUNCTION cancel_invoice(UUID) TO authenticated;

-- =============================================
-- 27. Update place_order to automatically create invoice
-- =============================================
DROP FUNCTION IF EXISTS place_order();

CREATE OR REPLACE FUNCTION place_order(
  p_id               uuid,
  p_customer_name    text,
  p_customer_phone   text,
  p_customer_address text,
  p_items            jsonb,
  p_total            numeric,
  p_coupon_code      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item          jsonb;
  prod_id       uuid;
  var_id        uuid;
  prod_qty      int;
  prod_rec      RECORD;
  var_rec       RECORD;
  coup_rec      coupons%ROWTYPE;
  ord_num       text;
  done          bool;
  rnd_str       text;
  chars         text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  invoice_id    uuid;
BEGIN
  -- Generate unique order_number (CRAFTOID-XXXXXX)
  done := false;
  WHILE NOT done LOOP
    rnd_str := '';
    FOR i IN 1..6 LOOP
      rnd_str := rnd_str || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    ord_num := 'CRAFTOID-' || rnd_str;
    BEGIN
      INSERT INTO orders (id, customer_name, customer_phone, customer_address, items, total, status, coupon_code, order_number)
      VALUES (p_id, p_customer_name, p_customer_phone, p_customer_address, p_items, p_total, 'pending',
              CASE WHEN p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN p_coupon_code ELSE NULL END,
              ord_num);
      done := true;
    EXCEPTION WHEN unique_violation THEN
    END;
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    prod_id  := (item->>'id')::uuid;
    prod_qty := (item->>'qty')::int;
    var_id   := (item->>'variant_id')::uuid;

    IF var_id IS NOT NULL THEN
      -- Variant-based stock check
      SELECT * INTO var_rec
      FROM product_variants
      WHERE id = var_id AND product_id = prod_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variant not found for product "%"', item->>'title';
      END IF;

      IF var_rec.stock < prod_qty THEN
        RAISE EXCEPTION 'Insufficient stock for "%". Available: %, requested: %',
          item->>'title', var_rec.stock, prod_qty;
      END IF;

      UPDATE product_variants
      SET stock = stock - prod_qty
      WHERE id = var_id;
    ELSE
      -- Product-level stock check (backward compatible)
      SELECT * INTO prod_rec
      FROM products
      WHERE id = prod_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', item->>'title';
      END IF;

      IF prod_rec.stock < prod_qty THEN
        RAISE EXCEPTION 'Insufficient stock for "%". Available: %, requested: %',
          prod_rec.title, prod_rec.stock, prod_qty;
      END IF;

      UPDATE products
      SET stock = stock - prod_qty
      WHERE id = prod_id;
    END IF;
  END LOOP;

  -- Apply coupon if provided
  IF p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN
    SELECT * INTO coup_rec FROM coupons WHERE LOWER(coupons.code) = LOWER(p_coupon_code) AND coupons.is_active = true FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid coupon code.';
    END IF;

    IF coup_rec.expires_at IS NOT NULL AND coup_rec.expires_at < now() THEN
      RAISE EXCEPTION 'Coupon has expired.';
    END IF;

    IF coup_rec.max_uses > 0 AND coup_rec.used_count >= coup_rec.max_uses THEN
      RAISE EXCEPTION 'Coupon usage limit reached.';
    END IF;

    UPDATE coupons SET used_count = used_count + 1 WHERE id = coup_rec.id;
  END IF;

  -- Automatically create invoice
  invoice_id := create_invoice(p_id);

  RETURN jsonb_build_object('success', true, 'order_id', p_id, 'order_number', ord_num, 'invoice_id', invoice_id);
END;
$$;

GRANT EXECUTE ON FUNCTION place_order(uuid, text, text, text, jsonb, numeric, text) TO anon;

-- =============================================
-- 28. Update cancel_order to also cancel invoice
-- =============================================
CREATE OR REPLACE FUNCTION cancel_order(p_order_id text, p_phone text)
RETURNS TABLE (
  id uuid,
  order_number text,
  created_at timestamptz,
  customer_name text,
  customer_phone text,
  customer_address text,
  items jsonb,
  total numeric,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec orders%ROWTYPE;
  order_uuid uuid;
BEGIN
  -- First get the order UUID
  SELECT * INTO rec FROM orders 
  WHERE (id::text = p_order_id OR order_number = p_order_id)
    AND customer_phone = p_phone
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order cannot be cancelled. Only pending orders can be cancelled.';
  END IF;

  order_uuid := rec.id;

  -- Cancel the invoice
  PERFORM cancel_invoice(order_uuid);

  -- Update order status
  UPDATE orders
  SET status = 'cancelled'
  WHERE id = order_uuid;

  RETURN QUERY SELECT rec.id, rec.order_number, rec.created_at, rec.customer_name, rec.customer_phone,
                      rec.customer_address, rec.items, rec.total, 'cancelled'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_order(text, text) TO anon;
GRANT EXECUTE ON FUNCTION cancel_order(text, text) TO authenticated;

-- =============================================
-- 29. Performance: index products.id for fast product lookups
-- =============================================
CREATE INDEX IF NOT EXISTS products_id_idx ON products (id);

-- Run VACUUM ANALYZE to update query planner statistics
VACUUM ANALYZE products;
