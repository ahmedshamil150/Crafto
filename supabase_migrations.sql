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
