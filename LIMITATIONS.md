# Crafto — Platform Limitations (Free-Tier Estimates)

Everything runs on **Supabase Free Plan** + **Vercel Hobby Plan**.  
Here is what that means in real numbers for each feature.

---

## Database (Supabase PostgreSQL — 500 MB)

| Area | Limit | What Happens When Reached |
|------|-------|---------------------------|
| **Total database size** | **500 MB** | Writes fail. No new orders, products, or reviews. |
| **Products** | ~8,000–10,000 rows | Each product ~50 KB with images URLs and text. |
| **Orders** | ~15,000–20,000 rows | Each order ~25–30 KB (items JSON, customer info). |
| **Reviews** | ~30,000–40,000 rows | Each review ~5–10 KB. |
| **Coupons** | ~5,000 rows | Negligible. |
| **Hero images** | ~1,000 rows | Just URLs, very small. |
| **Invoices** | ~15,000 rows | Parallel to orders. |

**Reality check:** At ~50 orders/day, you hit the 500 MB wall in **~1 year**.  
After that, you must either delete old data or upgrade to Supabase Pro ($25/mo).

### Table Row Estimates (at 500 MB)

| Table | Approx Rows | Notes |
|-------|-------------|-------|
| `products` | 8,000 | Including image URLs, descriptions, categories |
| `orders` | 15,000 | Items stored as JSONB, customer details |
| `product_variants` | 20,000 | 2–3 variants per product |
| `reviews` | 30,000 | Short text + rating |
| `coupons` | 5,000 | Minimal data |
| `invoices` | 15,000 | Similar to orders |
| `hero_images` | 500 | Just image URLs |
| `categories` | 100 | Just name + sort_order |

---

## File Storage (Supabase — 1 GB)

| Asset | Size/File | Max Files | Time to Fill at 10 uploads/day |
|-------|-----------|-----------|-------------------------------|
| Product images | ~200–500 KB (optimized) | ~2,000–5,000 | ~200–500 days |
| Hero images | ~300–600 KB | ~1,500–3,000 | ~150–300 days |
| Review images | ~100–300 KB | ~3,000–10,000 | ~300–1,000 days |

**Reality check:** Images are the bottleneck. Without compression, a single phone photo (2–5 MB) eats your quota fast.  
With WebP compression (~200 KB avg), you get ~5,000 product images before hitting the wall.

---

## API & Bandwidth

### Supabase API Rate Limits

| Endpoint | Rate Limit | Notes |
|----------|------------|-------|
| **REST API** | **60 requests/minute** | Shared across all users. One page load can trigger 3–5 requests (product, variants, reviews). At ~20 concurrent shoppers, you hit the limit and see slow loads or errors. |
| **Auth** | 30 req/min | For admin login. Not a bottleneck. |
| **Storage** | 60 req/min | Uploads/downloads. |

### Bandwidth (Supabase — 5 GB/month)

| Page Load | Data/Page | Monthly Views Allowed |
|-----------|-----------|----------------------|
| Homepage (no images) | ~300 KB | ~16,000 views |
| Shop page (+ product grid) | ~1.5 MB | ~3,300 views |
| Product detail (+ images) | ~2–5 MB | ~1,000–2,500 views |

**Reality check:** Images are served from Supabase Storage. If you switch to a CDN (Cloudinary, etc.), bandwidth is freed up for API calls only.

### Vercel Bandwidth (100 GB/month)

| Resource | Usage |
|----------|-------|
| HTML/CSS/JS (all pages) | ~1.5 MB per full page load |
| Serverless function calls | ~5 KB per `/api/admin` call |
| Admin panel usage | ~50–100 MB/month |

**Reality check:** Vercel bandwidth is rarely the bottleneck at this scale — 100 GB serves ~65,000 page loads.

---

## Serverless Functions (Vercel Hobby)

| Limit | Value | Impact |
|-------|-------|--------|
| **Execution duration** | **10 seconds** (Basic), **60 seconds** (Hobby) | The `/api/analytics` call to GA4 might timeout if GA is slow. |
| **Memory** | 1024 MB | More than enough. |
| **Invocation count** | 100 GB-hours (serverless) + 500k edge invocations | At ~50ms per call, you get ~7 million executions. Not a bottleneck. |
| **Concurrent invocations** | 10 (Hobby) | If 11 admins load orders simultaneously, the 11th request is queued. |

---

## Real-World Capacity Summary

| Scenario | Supported? | Notes |
|----------|-----------|-------|
| **50 daily orders** | ✅ Yes | ~15k rows/year, ~50 MB DB usage |
| **500 daily orders** | ⚠️ Tight | API rate limits become the bottleneck — 60 req/min shared across all product lookups |
| **10,000 products** | ✅ DB can hold it | Storage (images) will run out first at ~2,000–5,000 images |
| **100 concurrent shoppers** | ⚠️ Risky | Supabase REST rate limit (60/min) will throttle requests — users see spinner |
| **50,000 monthly visitors** | ❌ No | Bandwidth (5 GB Supabase + 100 GB Vercel) supports ~30k–40k views with images |
| **Admin analytics dashboard** | ⚠️ Works | GA4 API call may timeout (10s Vercel limit). Service account key org policy blocks backend auth — requires OAuth client ID |

---

## What Breaks First (Ordered)

1. **Supabase Storage (1 GB)** — Product images fill this up fastest
2. **Supabase API rate limits (60/min)** — Most impactful under real traffic
3. **Database size (500 MB)** — Takes ~1 year at moderate volume
4. **Supabase bandwidth (5 GB)** — Only if images aren't CDN-hosted
5. **Vercel function timeout (10s)** — Analytics dashboard if GA4 is slow

---

## Upgrade Path

| Tier | Cost | Gain |
|------|------|------|
| **Supabase Pro** | $25/mo | 8 GB DB, 100 GB bandwidth, 250 GB storage, no rate limits |
| **Vercel Pro** | $20/mo | 1 TB bandwidth, 1,000 GB-hours serverless, 60s execution, 300 concurrent invocations |
| **Cloudinary Free** | $0 (free tier) | 25 GB storage, 25 GB bandwidth — offload images from Supabase |
