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

CREATE OR REPLACE FUNCTION get_order_status(p_order_id uuid, p_phone text)
RETURNS TABLE (
  id uuid,
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
  SELECT id, created_at, customer_name, customer_phone, customer_address, items, total, status
  FROM orders
  WHERE id = p_order_id
    AND customer_phone = p_phone
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_order_status(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION get_order_status(uuid, text) TO authenticated;

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

CREATE OR REPLACE FUNCTION cancel_order(p_order_id uuid, p_phone text)
RETURNS TABLE (
  id uuid,
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
  WHERE o.id = p_order_id
    AND o.customer_phone = p_phone
    AND o.status = 'pending'
  RETURNING * INTO rec;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order cannot be cancelled. Only pending orders can be cancelled.';
  END IF;

  RETURN QUERY SELECT rec.id, rec.created_at, rec.customer_name, rec.customer_phone,
                      rec.customer_address, rec.items, rec.total, rec.status;
END;
$$;

CREATE OR REPLACE FUNCTION request_return(p_order_id uuid, p_phone text)
RETURNS TABLE (
  id uuid,
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
  WHERE o.id = p_order_id
    AND o.customer_phone = p_phone
    AND o.status IN ('confirmed', 'shipped', 'delivered')
  RETURNING * INTO rec;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Return not available. You can return confirmed, shipped, or delivered orders only.';
  END IF;

  RETURN QUERY SELECT rec.id, rec.created_at, rec.customer_name, rec.customer_phone,
                      rec.customer_address, rec.items, rec.total, rec.status;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_order(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION cancel_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION request_return(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION request_return(uuid, text) TO authenticated;

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
  item      jsonb;
  prod_id   uuid;
  prod_qty  int;
  prod_rec  RECORD;
  coup_rec  coupons%ROWTYPE;
BEGIN
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

  INSERT INTO orders (id, customer_name, customer_phone, customer_address, items, total, status, coupon_code)
  VALUES (p_id, p_customer_name, p_customer_phone, p_customer_address, p_items, p_total, 'pending',
          CASE WHEN p_coupon_code IS NOT NULL AND p_coupon_code <> '' THEN p_coupon_code ELSE NULL END);

  RETURN jsonb_build_object('success', true, 'order_id', p_id);
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
