// src/js/api.js
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SVC_KEY  = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

function headers(useService = false) {
  const key = useService && SUPABASE_SVC_KEY ? SUPABASE_SVC_KEY : SUPABASE_ANON_KEY;
  return {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`,
  };
}

export async function getProducts({ limit, offset, featured, category } = {}) {
  if (!SUPABASE_URL) return [];
  const params = new URLSearchParams({ order: 'created_at.desc' });
  if (limit) params.set('limit', limit);
  if (offset != null) params.set('offset', offset);
  if (featured != null) params.set('featured', `eq.${featured}`);
  if (category) params.set('category', `eq.${category}`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?${params}`, { headers: headers() });
  if (!res.ok) return [];
  return res.json();
}

export async function getProductsCount() {
  if (!SUPABASE_URL) return 0;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id&limit=0`, {
    headers: { ...headers(), 'Prefer': 'count=exact' },
  });
  if (!res.ok) return 0;
  const range = res.headers.get('content-range');
  return range ? parseInt(range.split('/')[1], 10) : 0;
}

export async function getProductById(id) {
  if (!SUPABASE_URL) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}&limit=1`, { headers: headers() });
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

const STORAGE_URL = `${SUPABASE_URL}/storage/v1`;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export async function uploadImage(file, folder) {
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${folder}/${Date.now()}.${ext}`;
  const res = await fetch(`${STORAGE_URL}/object/product-images/${path}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SVC_KEY,
      'Authorization': `Bearer ${SUPABASE_SVC_KEY}`,
      'Content-Type': file.type,
      'x-upsert': 'true',
    },
    body: file,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Upload failed (HTTP ${res.status})`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

export async function createProduct(product) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
    method: 'POST',
    headers: { ...headers(true), 'Prefer': 'return=representation' },
    body: JSON.stringify(product),
  });
  return res.json();
}

export async function updateProduct(id, product) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers(true), 'Prefer': 'return=representation' },
    body: JSON.stringify(product),
  });
  return res.json();
}

export async function updateOrderStatus(id, status) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers(true), 'Prefer': 'return=representation' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteProduct(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
    method: 'DELETE',
    headers: headers(true),
  });
}

export async function getOrders({ limit, offset } = {}) {
  if (!SUPABASE_URL) return [];
  const params = new URLSearchParams({ order: 'created_at.desc' });
  if (limit) params.set('limit', limit);
  if (offset != null) params.set('offset', offset);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?${params}`, { headers: headers(true) });
  if (!res.ok) return [];
  return res.json();
}

export async function getOrdersCount() {
  if (!SUPABASE_URL) return 0;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id&limit=0`, {
    headers: { ...headers(true), 'Prefer': 'count=exact' },
  });
  if (!res.ok) return 0;
  const range = res.headers.get('content-range');
  return range ? parseInt(range.split('/')[1], 10) : 0;
}

export async function createOrder(order) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: { ...headers(), 'Prefer': 'return=minimal' },
    body: JSON.stringify(order),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
}

export async function trackOrder(orderId, phone) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_order_status`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_order_id: orderId, p_phone: phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function placeOrder(order, couponCode) {
  const body = {
    p_id: order.id,
    p_customer_name: order.customer_name,
    p_customer_phone: order.customer_phone,
    p_customer_address: order.customer_address,
    p_items: order.items,
    p_total: order.total,
  };
  if (couponCode) body.p_coupon_code = couponCode;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/place_order`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function cancelOrder(orderId, phone) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/cancel_order`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_order_id: orderId, p_phone: phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.details || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function requestReturn(orderId, phone) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/request_return`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_order_id: orderId, p_phone: phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.details || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getReviews(productId) {
  if (!SUPABASE_URL) return [];
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reviews?product_id=eq.${productId}&order=pinned.desc,created_at.desc`,
    { headers: headers() }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function getAllReviews() {
  if (!SUPABASE_URL) return [];
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/reviews?select=*,products(title)&order=pinned.desc,created_at.desc`,
    { headers: headers(true) }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function createReview(review) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
    method: 'POST',
    headers: { ...headers(), 'Prefer': 'return=minimal' },
    body: JSON.stringify(review),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
}

export async function deleteReview(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}`, {
    method: 'DELETE',
    headers: headers(true),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function getCoupons() {
  if (!SUPABASE_URL) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/coupons?order=created_at.desc`, { headers: headers(true) });
  if (!res.ok) return [];
  return res.json();
}

export async function createCoupon(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/coupons`, {
    method: 'POST',
    headers: { ...headers(true), 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteCoupon(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/coupons?id=eq.${id}`, {
    method: 'DELETE',
    headers: headers(true),
  });
}

export async function validateCoupon(code) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_coupon`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_code: code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function setReviewPinned(id, pinned) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers(true), 'Prefer': 'return=representation' },
    body: JSON.stringify({ pinned }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getActiveHeroImage() {
  if (!SUPABASE_URL) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hero_images?is_active=eq.true&limit=1`, { headers: headers() });
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

export async function getHeroImages() {
  if (!SUPABASE_URL) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hero_images?order=created_at.desc`, { headers: headers(true) });
  if (!res.ok) return [];
  return res.json();
}

export async function setHeroImage(image_url, mobile_image_url) {
  // Deactivate all existing rows, then insert the new one
  const existing = await getHeroImages();
  for (const h of existing) {
    await fetch(`${SUPABASE_URL}/rest/v1/hero_images?id=eq.${h.id}`, {
      method: 'PATCH',
      headers: headers(true),
      body: JSON.stringify({ is_active: false }),
    });
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hero_images`, {
    method: 'POST',
    headers: { ...headers(true), 'Prefer': 'return=representation' },
    body: JSON.stringify({ image_url, mobile_image_url: mobile_image_url || null, is_active: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}
