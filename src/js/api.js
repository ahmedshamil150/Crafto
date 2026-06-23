// src/js/api.js
// Supabase REST helper – reads VITE_ env vars injected at build time

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function headers() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

export async function getProducts() {
  if (!SUPABASE_URL) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?order=created_at.desc`, { headers: headers() });
  if (!res.ok) return [];
  return res.json();
}

export async function getProductById(id) {
  if (!SUPABASE_URL) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}&limit=1`, { headers: headers() });
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

export async function createProduct(product) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
    method: 'POST',
    headers: { ...headers(), 'Prefer': 'return=representation' },
    body: JSON.stringify(product),
  });
  return res.json();
}

export async function updateProduct(id, product) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers(), 'Prefer': 'return=representation' },
    body: JSON.stringify(product),
  });
  return res.json();
}

export async function deleteProduct(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
}

export async function getOrders() {
  if (!SUPABASE_URL) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?order=created_at.desc`, { headers: headers() });
  if (!res.ok) return [];
  return res.json();
}
