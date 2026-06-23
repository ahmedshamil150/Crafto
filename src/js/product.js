// src/js/product.js
// Loads product data from Supabase and renders product cards / product detail page

import { getProducts, getProductById } from './api.js';

const grid = document.getElementById('product-grid');
const detail = document.getElementById('product-detail');

async function renderShop() {
  if (!grid) return;
  const products = await getProducts();
  if (!products.length) {
    grid.innerHTML = '<p>No products found.</p>';
    return;
  }
  grid.innerHTML = products.map(p => `
    <div class="card">
      <img src="${p.image_url || 'https://placehold.co/400x300?text=Crafto'}" alt="${p.title}" />
      <h3>${p.title}</h3>
      <p>PKR ${Number(p.price).toLocaleString()}</p>
      <a class="button" href="./product.html?id=${p.id}">View</a>
    </div>
  `).join('');
}

async function renderDetail() {
  if (!detail) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { detail.innerHTML = '<p>Product not found.</p>'; return; }
  const p = await getProductById(id);
  if (!p) { detail.innerHTML = '<p>Product not found.</p>'; return; }
  detail.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:start;margin-top:1.5rem;">
      <img src="${p.image_url || 'https://placehold.co/600x450?text=Crafto'}" alt="${p.title}" style="width:100%;border-radius:12px;" />
      <div>
        <h2>${p.title}</h2>
        <p style="margin:0.75rem 0;color:#666;">${p.description || ''}</p>
        <p style="font-size:1.5rem;font-weight:600;color:var(--color-primary);">PKR ${Number(p.price).toLocaleString()}</p>
        <button class="button" id="add-to-cart" data-id="${p.id}" data-title="${p.title}" data-price="${p.price}" style="margin-top:1rem;">Add to Cart</button>
      </div>
    </div>
  `;
  document.getElementById('add-to-cart')?.addEventListener('click', e => {
    const { id, title, price } = e.target.dataset;
    const cart = JSON.parse(localStorage.getItem('crafto_cart') || '[]');
    const existing = cart.find(i => i.id === id);
    if (existing) existing.qty++;
    else cart.push({ id, title, price: Number(price), qty: 1 });
    localStorage.setItem('crafto_cart', JSON.stringify(cart));
    alert(`${title} added to cart!`);
  });
}

renderShop();
renderDetail();
