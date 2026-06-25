// src/js/product.js
import { getProducts, getProductById, getReviews, createReview } from './api.js';
import { updateCartBadge, showToast } from './main.js';

const CATEGORIES = ['Vase', 'Jewelry boxes', 'Lamps', 'Tables', 'Candle stands', 'Planters'];

function normalizeCat(cat) {
  const c = (cat || '').trim().toLowerCase();
  return CATEGORIES.find(k => k.toLowerCase() === c) ? c : 'others';
}

function discPrice(price, pct) {
  const d = parseInt(pct) || 0;
  return d > 0 ? price * (1 - d / 100) : price;
}

function hasDisc(pct) { return parseInt(pct) > 0; }

const grid   = document.getElementById('product-grid');
const detail = document.getElementById('product-detail');
const tabsEl = document.getElementById('shop-tabs');

let allProducts = [];
let activeTab = 'all';
let sortLow = false;
let filterDisc = false;

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str ?? '';
  return el.innerHTML;
}

function renderStars(rating) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < rating ? 'filled' : ''}">★</span>`
  ).join('');
}

function avgRating(reviews) {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

function productCardHtml(p) {
  const finalPrice = discPrice(p.price, p.discount_percent);
  const onSale = hasDisc(p.discount_percent);
  return `
    <div class="card">
      <a href="./product.html?id=${p.id}">
        <img src="${p.image_url || 'https://placehold.co/400x300?text=Crafto'}" alt="${p.title}" loading="lazy" />
      </a>
      <h3>${p.title}</h3>
      ${p.category ? `<span class="badge">${p.category}</span>` : ''}
      <p class="price">
        ${onSale ? `<span style="text-decoration:line-through;color:#999;font-size:0.85rem;margin-right:6px;">PKR ${Number(p.price).toLocaleString()}</span>` : ''}
        PKR ${finalPrice.toLocaleString()}
        ${onSale ? `<span class="disc-badge">-${p.discount_percent}%</span>` : ''}
      </p>
      <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:0.75rem;">
        <a class="button button-outline" href="./product.html?id=${p.id}">View</a>
        <button class="button add-cart-btn"
          data-id="${p.id}" data-title="${p.title}" data-price="${finalPrice}">Add to Cart</button>
      </div>
    </div>
  `;
}

function renderTabs() {
  if (!tabsEl) return;
  const tabs = ['all', ...CATEGORIES.map(c => c.toLowerCase()), 'others'];
  tabsEl.innerHTML = tabs.map(t => `
    <button class="tab-btn${activeTab === t ? ' active' : ''}" data-tab="${t}">
      ${t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
    </button>
  `).join('');
  tabsEl.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      renderTabs();
      renderGrid();
    });
  });
}

function renderGrid() {
  if (!grid) return;
  let filtered = [...allProducts];

  if (activeTab !== 'all') {
    filtered = filtered.filter(p => normalizeCat(p.category) === activeTab);
  }

  if (filterDisc) {
    filtered = filtered.filter(p => hasDisc(p.discount_percent));
  }

  if (sortLow) {
    filtered.sort((a, b) => discPrice(a.price, a.discount_percent) - discPrice(b.price, b.discount_percent));
  }

  if (!filtered.length) {
    grid.innerHTML = '<p class="loading">No products in this category.</p>';
    return;
  }

  grid.innerHTML = filtered.map(productCardHtml).join('');
  grid.querySelectorAll('.add-cart-btn').forEach(btn => btn.addEventListener('click', addToCart));
}

async function renderShop() {
  if (!grid) return;
  grid.innerHTML = '<p class="loading">Loading products…</p>';
  allProducts = await getProducts();
  if (!allProducts.length) { grid.innerHTML = '<p>No products found.</p>'; return; }
  renderTabs();
  renderGrid();

  document.getElementById('sort-price')?.addEventListener('click', () => {
    sortLow = !sortLow;
    document.getElementById('sort-price').classList.toggle('active', sortLow);
    document.getElementById('sort-price').textContent = sortLow ? 'Price: High to Low' : 'Price: Low to High';
    renderGrid();
  });

  document.getElementById('filter-discounted')?.addEventListener('click', () => {
    filterDisc = !filterDisc;
    document.getElementById('filter-discounted').classList.toggle('active', filterDisc);
    renderGrid();
  });
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

  const finalPrice = discPrice(p.price, p.discount_percent);
  const onSale = hasDisc(p.discount_percent);

  detail.innerHTML = `
    <div class="product-detail-grid">
      <div class="product-gallery">
        <img id="gallery-main" src="${images[0]}" alt="${esc(p.title)}" />
        ${images.length > 1 ? `
        <div class="gallery-thumbs">
          ${images.map((u, i) => `
            <img src="${u}" alt="${esc(p.title)} ${i + 1}" class="thumb ${i === 0 ? 'active' : ''}" data-src="${u}" />
          `).join('')}
        </div>` : ''}
      </div>
      <div class="product-info">
        <h2>${esc(p.title)}</h2>
        ${p.category ? `<span class="badge">${esc(p.category)}</span>` : ''}
        ${onSale ? `<span class="disc-badge" style="font-size:0.85rem;margin-left:6px;">-${p.discount_percent}%</span>` : ''}
        <p class="product-desc">${esc(p.description || '')}</p>
        <p class="price" style="font-size:1.6rem;">
          ${onSale ? `<span style="text-decoration:line-through;color:#999;font-size:1.1rem;margin-right:8px;">PKR ${Number(p.price).toLocaleString()}</span>` : ''}
          PKR ${finalPrice.toLocaleString()}
        </p>
        ${onSale ? `<p style="color:#c62828;font-size:0.9rem;margin-top:-0.25rem;">You save ${p.discount_percent}%</p>` : ''}
        ${p.stock > 0
          ? `<p class="stock-ok">✓ In stock (${p.stock} available)</p>`
          : `<p class="stock-out">✗ Out of stock</p>`}
        <button class="button" id="add-to-cart"
          data-id="${p.id}" data-title="${esc(p.title)}" data-price="${finalPrice}"
          ${p.stock === 0 ? 'disabled' : ''} style="margin-top:1.25rem;width:100%;">
          Add to Cart
        </button>
      </div>
    </div>

    <section class="reviews-section">
      <h3 class="section-title">Customer Reviews</h3>
      <div id="reviews-summary" class="reviews-summary"></div>
      <div id="reviews-list"><p class="loading">Loading reviews…</p></div>

      <div class="review-form-box">
        <h4>Write a Review</h4>
        <form id="review-form" class="checkout-form">
          <label>Your Name *
            <input id="review-name" type="text" placeholder="Your name" required maxlength="80" />
          </label>
          <label>Rating *
            <div class="star-input" id="star-input">
              ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="star-btn" data-rating="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}
            </div>
            <input type="hidden" id="review-rating" required />
          </label>
          <label>Your Review *
            <textarea id="review-comment" rows="4" placeholder="Share your experience with this product…" required minlength="10" maxlength="1000"></textarea>
          </label>
          <button type="submit" class="button">Submit Review</button>
        </form>
      </div>
    </section>
  `;

  detail.querySelectorAll('.thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      document.getElementById('gallery-main').src = thumb.dataset.src;
      detail.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  document.getElementById('add-to-cart')?.addEventListener('click', addToCart);
  setupReviewForm(id);
  loadReviews(id);
}

function setupStarInput() {
  const starInput = document.getElementById('star-input');
  const ratingField = document.getElementById('review-rating');
  if (!starInput || !ratingField) return;

  starInput.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = Number(btn.dataset.rating);
      ratingField.value = rating;
      starInput.querySelectorAll('.star-btn').forEach((b, i) => {
        b.classList.toggle('active', i < rating);
      });
    });
  });
}

function setupReviewForm(productId) {
  setupStarInput();

  const savedName = localStorage.getItem('crafto_reviewer_name');
  const nameInput = document.getElementById('review-name');
  if (savedName && nameInput) nameInput.value = savedName;

  document.getElementById('review-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const name = document.getElementById('review-name').value.trim();
    const rating = Number(document.getElementById('review-rating').value);
    const comment = document.getElementById('review-comment').value.trim();

    if (!rating) {
      showToast('Please select a star rating.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      await createReview({ product_id: productId, author_name: name, rating, comment });
      localStorage.setItem('crafto_reviewer_name', name);
      e.target.reset();
      document.getElementById('review-rating').value = '';
      document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
      showToast('Thank you for your review!');
      loadReviews(productId);
    } catch (err) {
      showToast(`Review failed: ${err.message}`, 'error');
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Review';
  });
}

async function loadReviews(productId) {
  const summaryEl = document.getElementById('reviews-summary');
  const listEl = document.getElementById('reviews-list');
  if (!listEl) return;

  const reviews = await getReviews(productId);
  const avg = avgRating(reviews);

  if (summaryEl) {
    summaryEl.innerHTML = reviews.length
      ? `<div class="stars">${renderStars(Math.round(avg))}</div>
         <span class="reviews-avg">${avg.toFixed(1)} out of 5</span>
         <span class="reviews-count">(${reviews.length} review${reviews.length === 1 ? '' : 's'})</span>`
      : '<p class="reviews-empty">No reviews yet — be the first!</p>';
  }

  if (!reviews.length) {
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = reviews.map(r => `
    <article class="review-card ${r.pinned ? 'review-pinned' : ''}">
      <div class="review-header">
        <strong>${esc(r.author_name)}</strong>
        <span class="stars">${renderStars(r.rating)}</span>
      </div>
      ${r.pinned ? '<span class="badge pinned-badge">Pinned</span>' : ''}
      <time class="review-date">${new Date(r.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
      <p class="review-comment">${esc(r.comment)}</p>
    </article>
  `).join('');
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
