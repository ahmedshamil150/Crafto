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

export async function deleteProduct(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
    method: 'DELETE',
    headers: headers(true),
  });
}

export async function getOrders() {
  if (!SUPABASE_URL) return [];
  // Always use anon key for orders — service key is not available client-side in production
  // RLS policy below grants anon SELECT access
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?order=created_at.desc`, { headers: headers() });
  if (!res.ok) return [];
  return res.json();
}

export async function createOrder(order) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: { ...headers(), 'Prefer': 'return=representation' },
    body: JSON.stringify(order),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}
