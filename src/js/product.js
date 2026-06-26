// src/js/product.js
import { getProducts, getProductById, getReviews, createReview } from './api.js';
import { updateCartBadge, showToast, addToCart, isInWishlist, toggleWishlist } from './main.js';

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
let searchQuery = '';
const DISPLAY_PAGE_SIZE = 16;
let visibleCount = DISPLAY_PAGE_SIZE;

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
  const img = p.image_url || 'https://placehold.co/600x450?text=Crafto';
  const inWl = isInWishlist(p.id);
  return `
    <div class="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-outline-variant/10">
      <div class="relative aspect-[4/5] overflow-hidden">
        <a href="./product.html?id=${p.id}">
          <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${img}" alt="${esc(p.title)}" loading="lazy" />
        </a>
        <button class="shop-wishlist absolute top-3 left-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:scale-110 transition-transform ${inWl ? 'text-red-500' : 'text-on-surface-variant'}"
          data-id="${p.id}" data-title="${esc(p.title)}" data-price="${finalPrice}" data-image="${img}">
          <span class="material-symbols-outlined text-sm" data-icon="${inWl ? 'favorite' : 'favorite_border'}">${inWl ? 'favorite' : 'favorite_border'}</span>
        </button>
        ${onSale ? `<div class="absolute top-3 right-3 z-10 bg-deep-emerald text-white text-[10px] px-2.5 py-0.5 rounded-full font-label-caps font-bold">-${p.discount_percent}%</div>` : ''}
      </div>
      <div class="p-5 text-center">
        <span class="text-metallic-gold font-label-caps text-[10px] tracking-widest uppercase">${p.category ? esc(p.category) : 'Heritage'}</span>
        <a href="./product.html?id=${p.id}">
          <h3 class="font-headline-md text-headline-md text-charcoal-text mt-1 mb-2 hover:text-deep-emerald transition-colors">${esc(p.title)}</h3>
        </a>
        <p class="font-body-lg font-semibold">
          ${onSale ? `<span style="text-decoration:line-through;color:#999;font-size:0.9rem;font-weight:400;margin-right:6px;">PKR ${Number(p.price).toLocaleString()}</span>` : ''}
          <span class="text-deep-emerald">PKR ${finalPrice.toLocaleString()}</span>
        </p>
        <div class="mt-4 flex gap-2 justify-center">
          <button class="shop-add-cart px-5 py-2 bg-deep-emerald text-white rounded-full font-label-caps text-[10px] hover:bg-primary transition-colors active:scale-95"
            data-id="${p.id}" data-title="${esc(p.title)}" data-price="${finalPrice}">Add to Cart</button>
          <a href="./product.html?id=${p.id}" class="px-5 py-2 border border-deep-emerald text-deep-emerald rounded-full font-label-caps text-[10px] hover:bg-deep-emerald hover:text-white transition-colors">View</a>
        </div>
      </div>
    </div>
  `;
}

function renderTabs() {
  if (!tabsEl) return;
  const tabs = ['all', ...CATEGORIES.map(c => c.toLowerCase()), 'others'];
  tabsEl.innerHTML = tabs.map(t => `
    <button class="tab-btn px-5 py-2 rounded-full text-sm font-label-caps whitespace-nowrap transition-all duration-300 ${activeTab === t ? 'bg-deep-emerald text-white shadow-md' : 'bg-surface-container-high text-on-surface-variant hover:text-deep-emerald hover:bg-surface-container'}" data-tab="${t}">
      ${t === 'all' ? 'All' : t === 'others' ? 'Other' : t.charAt(0).toUpperCase() + t.slice(1)}
    </button>
  `).join('');
  tabsEl.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      visibleCount = DISPLAY_PAGE_SIZE;
      renderTabs();
      renderGrid();
    });
  });
}

function renderGrid() {
  if (!grid) return;
  let filtered = [...allProducts];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }

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
    const wrap = document.getElementById('load-more-wrap');
    if (wrap) wrap.innerHTML = '';
    return;
  }

  const page = filtered.slice(0, visibleCount);
  grid.innerHTML = page.map(productCardHtml).join('');
  grid.querySelectorAll('.shop-add-cart').forEach(btn => {
    btn.addEventListener('click', function() {
      addToCart(this.dataset.id, this.dataset.title, parseFloat(this.dataset.price));
      showToast(`${this.dataset.title} added to cart!`);
    });
  });
  grid.querySelectorAll('.shop-wishlist').forEach(btn => {
    btn.addEventListener('click', function() {
      const { id, title, price, image } = this.dataset;
      toggleWishlist(id, title, price, image);
      const icon = this.querySelector('.material-symbols-outlined');
      const inWl = isInWishlist(id);
      this.classList.toggle('text-red-500', inWl);
      this.classList.toggle('text-on-surface-variant', !inWl);
      icon.textContent = inWl ? 'favorite' : 'favorite_border';
    });
  });

  const wrap = document.getElementById('load-more-wrap');
  if (wrap) {
    if (visibleCount < filtered.length) {
      wrap.innerHTML = '<button class="button load-more-btn" id="load-more-btn">Load More</button>';
      document.getElementById('load-more-btn')?.addEventListener('click', () => {
        visibleCount += DISPLAY_PAGE_SIZE;
        renderGrid();
      });
    } else {
      wrap.innerHTML = '';
    }
  }
}

async function renderShop() {
  if (!grid) return;
  grid.innerHTML = '<p class="loading">Loading products…</p>';

  const isShop = document.getElementById('shop-tabs') !== null;
  allProducts = isShop ? await getProducts() : await getProducts({ featured: true });

  if (!allProducts.length) {
    grid.innerHTML = isShop ? '<p>No products found.</p>' : '<p class="loading">No featured products yet — check back soon!</p>';
    return;
  }
  if (isShop) renderTabs();
  renderGrid();

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      visibleCount = DISPLAY_PAGE_SIZE;
      activeTab = 'all';
      renderTabs();
      renderGrid();
    });
  }

  document.getElementById('sort-price')?.addEventListener('click', () => {
    sortLow = !sortLow;
    visibleCount = DISPLAY_PAGE_SIZE;
    document.getElementById('sort-price').classList.toggle('active', sortLow);
    document.getElementById('sort-price').textContent = sortLow ? 'Price: High to Low' : 'Price: Low to High';
    renderGrid();
  });

  document.getElementById('filter-discounted')?.addEventListener('click', () => {
    filterDisc = !filterDisc;
    visibleCount = DISPLAY_PAGE_SIZE;
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
        <div style="display:flex;gap:0.5rem;margin-top:1.25rem;">
        <button class="button" id="add-to-cart"
          data-id="${p.id}" data-title="${esc(p.title)}" data-price="${finalPrice}"
          ${p.stock === 0 ? 'disabled' : ''} style="flex:1;">
          Add to Cart
        </button>
        <button class="button" id="detail-wishlist" data-id="${p.id}" data-title="${esc(p.title)}" data-price="${finalPrice}" data-image="${images[0]}"
          style="width:48px;padding:0;display:flex;align-items:center;justify-content:center;background:transparent;border:2px solid var(--color-primary);color:var(--color-primary);${isInWishlist(p.id) ? 'background:var(--color-primary);color:#fff;' : ''}">
          <span class="material-symbols-outlined" style="font-size:1.3rem;">${isInWishlist(p.id) ? 'favorite' : 'favorite_border'}</span>
        </button>
        </div>
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
          <div class="honeypot" aria-hidden="true">
            <label for="hp-review-website">Leave this empty</label>
            <input id="hp-review-website" name="website" type="text" tabindex="-1" autocomplete="off" />
          </div>
          <button type="submit" class="button">Submit Review</button>
        </form>
      </div>
    </section>

    <section id="recommended" class="section" style="margin-top:2.5rem;"></section>
  `;

  detail.querySelectorAll('.thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      document.getElementById('gallery-main').src = thumb.dataset.src;
      detail.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  document.getElementById('add-to-cart')?.addEventListener('click', function() {
    addToCart(this.dataset.id, this.dataset.title, parseFloat(this.dataset.price));
    showToast(`${this.dataset.title} added to cart!`);
  });
  document.getElementById('detail-wishlist')?.addEventListener('click', function() {
    const { id, title, price, image } = this.dataset;
    toggleWishlist(id, title, price, image);
    const inWl = isInWishlist(id);
    this.style.background = inWl ? 'var(--color-primary)' : 'transparent';
    this.style.color = inWl ? '#fff' : 'var(--color-primary)';
    this.querySelector('.material-symbols-outlined').textContent = inWl ? 'favorite' : 'favorite_border';
  });
  setupReviewForm(id);
  loadReviews(id);
  loadRecommended(p.category, id);
}

async function loadRecommended(category, currentId) {
  if (!category) return;
  const recSection = document.getElementById('recommended');
  if (!recSection) return;
  recSection.innerHTML = '<p class="loading">Loading recommendations…</p>';
  const products = await getProducts({ category, limit: 5 });
  const filtered = products.filter(p => p.id !== currentId).slice(0, 4);
  if (!filtered.length) { recSection.innerHTML = ''; return; }
  recSection.innerHTML = `
    <h3 class="section-title" style="margin-bottom:1rem;">You May Also Like</h3>
    <div class="product-grid recommended-grid">
      ${filtered.map(p => {
        const fp = discPrice(p.price, p.discount_percent);
        const os = hasDisc(p.discount_percent);
        const inWl = isInWishlist(p.id);
        const img = p.image_url || 'https://placehold.co/600x450?text=Crafto';
        return `
          <div class="product-card" style="position:relative;">
            <button class="rec-wishlist" data-id="${p.id}" data-title="${esc(p.title)}" data-price="${fp}" data-image="${img}"
              style="position:absolute;top:8px;right:8px;z-index:2;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.9);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.1);transition:transform 0.2s;color:${inWl ? '#c62828' : '#666'};">
              <span class="material-symbols-outlined" style="font-size:1.1rem;">${inWl ? 'favorite' : 'favorite_border'}</span>
            </button>
            <a href="./product.html?id=${p.id}">
              <img src="${img}" alt="${esc(p.title)}" loading="lazy" />
              <div class="card-body">
                <h4>${esc(p.title)}</h4>
                ${os ? `<span class="disc-badge">-${p.discount_percent}%</span>` : ''}
                <p class="price">
                  ${os ? `<span style="text-decoration:line-through;color:#999;font-size:0.85rem;">PKR ${Number(p.price).toLocaleString()}</span> ` : ''}
                  PKR ${fp.toLocaleString()}
                </p>
              </div>
            </a>
          </div>
        `;
      }).join('')}
    </div>
  `;
  recSection.querySelectorAll('.rec-wishlist').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const { id, title, price, image } = this.dataset;
      toggleWishlist(id, title, price, image);
      const inWl = isInWishlist(id);
      this.style.color = inWl ? '#c62828' : '#666';
      this.querySelector('.material-symbols-outlined').textContent = inWl ? 'favorite' : 'favorite_border';
    });
  });
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
    const hp = document.getElementById('hp-review-website');
    if (hp && hp.value.trim()) return;
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

renderShop();
renderDetail();
