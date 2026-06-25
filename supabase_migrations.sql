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
