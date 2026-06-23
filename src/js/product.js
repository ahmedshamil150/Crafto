// src/js/product.js
import { getProducts, getProductById } from './api.js';
import { updateCartBadge, showToast } from './main.js';

const grid   = document.getElementById('product-grid');
const detail = document.getElementById('product-detail');

async function renderShop() {
  if (!grid) return;
  grid.innerHTML = '<p class="loading">Loading products…</p>';
  const products = await getProducts();
  if (!products.length) { grid.innerHTML = '<p>No products found.</p>'; return; }
  grid.innerHTML = products.map(p => `
    <div class="card">
      <a href="./product.html?id=${p.id}">
        <img src="${p.image_url || 'https://placehold.co/400x300?text=Crafto'}" alt="${p.title}" loading="lazy" />
      </a>
      <h3>${p.title}</h3>
      ${p.category ? `<span class="badge">${p.category}</span>` : ''}
      <p class="price">PKR ${Number(p.price).toLocaleString()}</p>
      <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:0.75rem;">
        <a class="button button-outline" href="./product.html?id=${p.id}">View</a>
        <button class="button add-cart-btn"
          data-id="${p.id}" data-title="${p.title}" data-price="${p.price}">Add to Cart</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.add-cart-btn').forEach(btn => btn.addEventListener('click', addToCart));
}

async function renderDetail() {
  if (!detail) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { detail.innerHTML = '<p>Product not found.</p>'; return; }
  const p = await getProductById(id);
  if (!p) { detail.innerHTML = '<p>Product not found.</p>'; return; }

  const images = [p.image_url, p.image_url_2, p.image_url_3]
    .filter(Boolean)
    .map(u => u.trim())
    .filter(Boolean);
  if (!images.length) images.push('https://placehold.co/600x450?text=Crafto');

  detail.innerHTML = `
    <div class="product-detail-grid">
      <div class="product-gallery">
        <img id="gallery-main" src="${images[0]}" alt="${p.title}" />
        ${images.length > 1 ? `
        <div class="gallery-thumbs">
          ${images.map((u, i) => `
            <img src="${u}" alt="${p.title} ${i+1}" class="thumb ${i===0?'active':''}" data-src="${u}" />
          `).join('')}
        </div>` : ''}
      </div>
      <div class="product-info">
        <h2>${p.title}</h2>
        ${p.category ? `<span class="badge">${p.category}</span>` : ''}
        <p class="product-desc">${p.description || ''}</p>
        <p class="price" style="font-size:1.6rem;">PKR ${Number(p.price).toLocaleString()}</p>
        ${p.stock > 0
          ? `<p class="stock-ok">✓ In stock (${p.stock} available)</p>`
          : `<p class="stock-out">✗ Out of stock</p>`}
        <button class="button" id="add-to-cart"
          data-id="${p.id}" data-title="${p.title}" data-price="${p.price}"
          ${p.stock === 0 ? 'disabled' : ''} style="margin-top:1.25rem;width:100%;">
          Add to Cart
        </button>
      </div>
    </div>
  `;

  // Thumb switcher
  detail.querySelectorAll('.thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      document.getElementById('gallery-main').src = thumb.dataset.src;
      detail.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  document.getElementById('add-to-cart')?.addEventListener('click', addToCart);
}

function addToCart(e) {
  const { id, title, price } = e.target.dataset;
  const cart = JSON.parse(localStorage.getItem('crafto_cart') || '[]');
  const existing = cart.find(i => i.id === id);
  if (existing) existing.qty++;
  else cart.push({ id, title, price: Number(price), qty: 1 });
  localStorage.setItem('crafto_cart', JSON.stringify(cart));
  updateCartBadge();
  showToast(`${title} added to cart!`);
}

renderShop();
renderDetail();
