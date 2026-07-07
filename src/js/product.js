// src/js/product.js
import { getProducts, getProductById, getReviews, createReview, getProductVariants, getCategories } from './api.js';
import { updateCartBadge, showToast, addToCart, isInWishlist, toggleWishlist } from './main.js';

let CATEGORIES = ['Vase', 'Jewelry boxes', 'Lamps', 'Tables', 'Candle stands', 'Planters'];

async function initCategories() {
  try {
    const cats = await getCategories();
    if (cats && cats.length) {
      CATEGORIES = cats.map(c => c.name);
    }
  } catch { /* keep defaults */ }
}

function parseCats(cat) {
  if (Array.isArray(cat)) return cat.map(c => String(c).trim()).filter(Boolean);
  return (cat || '').split(',').map(c => c.trim()).filter(Boolean);
}

function displayCats(catStr) {
  return parseCats(catStr).map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ') || 'Heritage';
}

function matchesTab(catStr, tab) {
  if (tab === 'all') return true;
  const cats = parseCats(catStr).map(c => c.toLowerCase());
  const known = CATEGORIES.map(c => c.toLowerCase());
  if (tab === 'others') return !cats.some(c => known.includes(c));
  return cats.includes(tab);
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
let sortState = ''; // '', 'asc', 'desc'
let filterDisc = false;
let searchQuery = '';
const PRODUCTS_PER_PAGE = 20;
let currentPage = 1;

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str ?? '';
  return el.innerHTML;
}

function formatDescription(text) {
  if (!text) return '<p class="font-body-md text-on-surface-variant mb-6 leading-relaxed">No description available.</p>';
  const lines = text.split('\n');
  const ulRe = /^[\*\-+]\s+/;
  const olRe = /^\d+[\.\)]\s+/;
  const hasList = lines.some(l => ulRe.test(l) || olRe.test(l));
  if (!hasList) return `<p class="font-body-md text-on-surface-variant mb-6 leading-relaxed">${esc(text)}</p>`;
  let html = '<div class="font-body-md text-on-surface-variant mb-6 leading-relaxed space-y-2">';
  let inUl = false, inOl = false;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
      continue;
    }
    if (ulRe.test(trimmed)) {
      if (inOl) { html += '</ol>'; inOl = false; }
      if (!inUl) { html += '<ul class="list-disc pl-5 space-y-1">'; inUl = true; }
      html += `<li>${esc(trimmed.replace(ulRe, ''))}</li>`;
    } else if (olRe.test(trimmed)) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (!inOl) { html += '<ol class="list-decimal pl-5 space-y-1">'; inOl = true; }
      html += `<li>${esc(trimmed.replace(olRe, ''))}</li>`;
    } else {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
      html += `<p>${esc(trimmed)}</p>`;
    }
  }
  if (inUl) html += '</ul>';
  if (inOl) html += '</ol>';
  html += '</div>';
  return html;
}

function renderStars(rating) {
  return Array.from({ length: 5 }, (_, i) =>
    '<span class="' + (i < rating ? 'text-metallic-gold' : 'text-outline-variant') + '">★</span>'
  ).join('');
}

function starBtns() {
  return [1, 2, 3, 4, 5].map(function(n) {
    return '<button type="button" class="star-btn text-outline-variant hover:text-metallic-gold transition-colors cursor-pointer" data-rating="' + n + '" aria-label="' + n + ' star' + (n > 1 ? 's' : '') + '">★</button>';
  }).join('');
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
      <div class="relative aspect-[1/1] overflow-hidden">
        <a href="./product?id=${p.id}">
          <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${img}" alt="${esc(p.title)}" loading="lazy" />
        </a>
        <button class="shop-wishlist absolute top-2 left-2 md:top-3 md:left-3 z-10 w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:scale-110 transition-transform ${inWl ? 'text-red-500' : 'text-on-surface-variant'}"
          data-id="${p.id}" data-title="${esc(p.title)}" data-price="${finalPrice}" data-image="${img}">
          <span class="material-symbols-outlined text-xs md:text-sm" data-icon="${inWl ? 'favorite' : 'favorite_border'}">${inWl ? 'favorite' : 'favorite_border'}</span>
        </button>
        ${onSale ? `<div class="absolute top-2 right-2 md:top-3 md:right-3 z-10 bg-deep-emerald text-white text-[10px] px-2 py-0.5 md:px-2.5 md:py-0.5 rounded-full font-label-caps font-bold">-${p.discount_percent}%</div>` : ''}
      </div>
      <div class="p-3 md:p-5 text-center">
        <span class="hidden md:block text-metallic-gold font-label-caps text-[10px] tracking-widest uppercase">${p.category ? esc(displayCats(p.category)) : 'Heritage'}</span>
        <a href="./product?id=${p.id}">
          <h3 class="font-headline-md text-xs md:text-headline-md text-charcoal-text mt-1 mb-1 md:mb-2 hover:text-deep-emerald transition-colors leading-tight">${esc(p.title)}</h3>
        </a>
        <p class="text-sm md:font-body-lg font-semibold">
          ${onSale ? `<span style="text-decoration:line-through;color:#999;font-size:0.75rem;font-weight:400;margin-right:4px;">PKR ${Number(p.price).toLocaleString()}</span>` : ''}
          <span class="text-deep-emerald">PKR ${finalPrice.toLocaleString()}</span>
        </p>
        <div class="mt-2 md:mt-4 flex flex-row gap-1.5 md:gap-2 justify-center">
          <a href="./product?id=${p.id}" class="flex-1 md:flex-none px-3 md:px-5 py-1.5 md:py-2 border border-deep-emerald text-deep-emerald font-label-caps text-[10px] rounded hover:bg-deep-emerald hover:text-white transition-colors text-center">View</a>
          <button class="shop-add-cart btn-shine flex-none md:flex-none w-8 h-8 md:w-auto md:px-5 md:py-2 bg-deep-emerald text-white rounded-full font-label-caps text-[10px] hover:bg-primary transition-colors active:scale-95 flex items-center justify-center"
            data-id="${p.id}" data-title="${esc(p.title)}" data-price="${finalPrice}"><span class="material-symbols-outlined text-sm md:hidden">shopping_bag</span><span class="hidden md:inline">Add to Cart</span></button>
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
      currentPage = 1;
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
    filtered = filtered.filter(p => matchesTab(p.category, activeTab));
  }

  if (filterDisc) {
    filtered = filtered.filter(p => hasDisc(p.discount_percent));
  }

  if (sortState === '') {
    filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (sortState === 'asc') {
    filtered.sort((a, b) => discPrice(a.price, a.discount_percent) - discPrice(b.price, b.discount_percent));
  } else if (sortState === 'desc') {
    filtered.sort((a, b) => discPrice(b.price, b.discount_percent) - discPrice(a.price, a.discount_percent));
  }

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / PRODUCTS_PER_PAGE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  if (!totalItems) {
    grid.innerHTML = '<p class="loading">No products in this category.</p>';
    const wrap = document.getElementById('pagination-wrap');
    if (wrap) wrap.innerHTML = '';
    return;
  }

  const page = filtered.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);
  grid.innerHTML = page.map(productCardHtml).join('');
  grid.querySelectorAll('.shop-add-cart').forEach(btn => {
    btn.addEventListener('click', function() {
      addToCart(this.dataset.id, this.dataset.title, parseFloat(this.dataset.price));
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

  const wrap = document.getElementById('pagination-wrap');
  if (wrap) {
    wrap.innerHTML = `
      <div class="flex items-center justify-center gap-4 mt-6">
        <button class="button page-btn px-4 py-2 border border-deep-emerald text-deep-emerald rounded hover:bg-deep-emerald hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed" id="shop-prev" ${currentPage <= 1 ? 'disabled' : ''}>← Prev</button>
        <span class="text-sm text-on-surface-variant font-label-caps">Page ${currentPage} of ${totalPages} (${totalItems})</span>
        <button class="button page-btn px-4 py-2 border border-deep-emerald text-deep-emerald rounded hover:bg-deep-emerald hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed" id="shop-next" ${currentPage >= totalPages ? 'disabled' : ''}>Next →</button>
      </div>
    `;
    document.getElementById('shop-prev')?.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderGrid(); }
    });
    document.getElementById('shop-next')?.addEventListener('click', () => {
      if (currentPage < totalPages) { currentPage++; renderGrid(); }
    });
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

  // Read URL category parameter to auto-select tab
  const urlCategory = new URLSearchParams(location.search).get('category');
  if (urlCategory && isShop) {
    const normalized = urlCategory.toLowerCase().trim();
    const validTabs = ['all', ...CATEGORIES.map(c => c.toLowerCase()), 'others'];
    if (validTabs.includes(normalized)) {
      activeTab = normalized;
    }
  }

  if (isShop) renderTabs();
  renderGrid();

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      currentPage = 1;
      activeTab = 'all';
      renderTabs();
      renderGrid();
    });
  }

  document.getElementById('sort-price')?.addEventListener('click', () => {
    if (sortState === '') sortState = 'asc';
    else if (sortState === 'asc') sortState = 'desc';
    else sortState = '';
    currentPage = 1;
    const btn = document.getElementById('sort-price');
    btn.classList.toggle('active', sortState !== '');
    const labels = { '': 'Price', asc: 'Price ↑', desc: 'Price ↓' };
    btn.textContent = labels[sortState] || 'Price';
    renderGrid();
  });

  document.getElementById('filter-discounted')?.addEventListener('click', () => {
    filterDisc = !filterDisc;
    currentPage = 1;
    document.getElementById('filter-discounted').classList.toggle('active', filterDisc);
    renderGrid();
  });
}

async function renderDetail() {
  if (!detail) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { detail.innerHTML = '<p class="text-center text-on-surface-variant py-20">Product not found.</p>'; return; }

  // Show loading skeleton immediately
  detail.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter md:gap-12 mb-section-gap animate-pulse">
      <div class="bg-surface-container-low rounded-xl aspect-[4/5]"></div>
      <div class="space-y-4">
        <div class="h-4 bg-surface-container-low rounded w-1/3"></div>
        <div class="h-8 bg-surface-container-low rounded w-3/4"></div>
        <div class="h-4 bg-surface-container-low rounded w-full"></div>
        <div class="h-4 bg-surface-container-low rounded w-2/3"></div>
        <div class="h-10 bg-surface-container-low rounded w-1/4 mt-8"></div>
        <div class="h-12 bg-surface-container-low rounded-full w-full mt-4"></div>
      </div>
    </div>`;

  // Fetch product and variants in parallel
  const [p, variants] = await Promise.all([
    getProductById(id),
    getProductVariants(id).catch(() => []),
  ]);
  if (!p) { detail.innerHTML = '<p class="text-center text-on-surface-variant py-20">Product not found.</p>'; return; }
  if (typeof window.injectProductSchema === 'function') window.injectProductSchema(p);

  const images = [p.image_url, p.image_url_2, p.image_url_3]
    .filter(Boolean)
    .map(u => u.trim())
    .filter(Boolean);
  if (!images.length) images.push('https://placehold.co/600x450?text=Crafto');

  const finalPrice = discPrice(p.price, p.discount_percent);
  const onSale = hasDisc(p.discount_percent);

  const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const hasVariants = variants.length > 0;
  const totalStock = hasVariants ? variants.reduce((s, v) => s + (v.stock || 0), 0) : p.stock;

  function colorHex(name) {
    const map = { white:'#ffffff', black:'#000000', red:'#dc2626', blue:'#2563eb', green:'#16a34a', yellow:'#eab308', gold:'#d4af37', silver:'#c0c0c0', brown:'#92400e', gray:'#6b7280', grey:'#6b7280', beige:'#f5f5dc', cream:'#fffdd0', navy:'#1e3a5f', teal:'#0d9488', pink:'#ec4899', purple:'#9333ea', orange:'#ea580c', maroon:'#be123c', turquoise:'#14b8a6', tan:'#d2b48c', khaki:'#c3b091', burgundy:'#800020', coral:'#ff7f50', ivory:'#fffff0', charcoal:'#36454f', bronze:'#cd7f32', rose:'#f43f5e', mint:'#a8e6cf' };
    return map[name.toLowerCase().trim()] || '#' + (() => { let h = 0; for (let c of name) { h = ((h << 5) - h) + c.charCodeAt(0); h |= 0; } return Math.abs(h % 0xFFFFFF).toString(16).padStart(6,'0'); })();
  }

  detail.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-gutter md:gap-12 mb-section-gap">
      <div class="fade-in-up">
        <div class="relative overflow-hidden rounded-xl bg-surface-container-low mb-4 cursor-zoom-in group" id="zoom-container"
          onmousemove="zoomMove(event)" onmouseenter="zoomIn()" onmouseleave="zoomOut()" onclick="openLightbox()">
          <img id="gallery-main" class="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[2.5]" src="${images[0]}" alt="${esc(p.title)}" />
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>
          <div class="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-label-caps text-on-surface-variant flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span class="material-symbols-outlined text-sm">search</span> Zoom
          </div>
        </div>
        ${images.length > 1 ? '<div class="flex gap-3 overflow-x-auto pb-2 no-scrollbar">' + images.map(function(u, i) {
          return '<button class="thumb-btn flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ' + (i === 0 ? 'border-deep-emerald ring-1 ring-deep-emerald' : 'border-outline-variant/50 hover:border-deep-emerald/50') + '" data-src="' + u + '"><img class="w-full h-full object-cover" src="' + u + '" alt="' + esc(p.title) + ' ' + (i + 1) + '" /></button>';
        }).join('') + '</div>' : ''}
      </div>

      <div class="fade-in-up" style="transition-delay:0.1s">
        <div class="flex flex-wrap items-center gap-3 mb-3">
          ${p.category ? '<span class="text-metallic-gold font-label-caps text-[10px] tracking-widest uppercase">' + esc(displayCats(p.category)) + '</span>' : ''}
          ${onSale ? '<span class="bg-red-100 text-red-700 text-[10px] font-label-caps px-2.5 py-0.5 rounded-full">-' + p.discount_percent + '%</span>' : ''}
        </div>
        <h1 class="font-headline-lg text-headline-lg text-deep-emerald mb-4">${esc(p.title)}</h1>
        ${formatDescription(p.description)}

        <div class="mb-4">
          <span id="detail-price" class="font-headline-md text-headline-md text-deep-emerald">PKR ${finalPrice.toLocaleString()}</span>
          ${onSale ? '<span class="text-on-surface-variant/60 line-through ml-3 text-lg">PKR ' + Number(p.price).toLocaleString() + '</span>' : ''}
        </div>
        ${onSale ? '<p class="text-red-600 text-sm font-label-caps mb-4">You save ' + p.discount_percent + '%</p>' : ''}

        ${hasVariants ? `
        <div class="space-y-4 mb-4">
          ${sizes.length > 1 ? `
          <div>
            <label class="font-label-caps text-xs text-on-surface-variant block mb-1.5">Size</label>
            <select id="variant-size" class="w-full border border-outline/30 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-emerald/30 focus:border-deep-emerald bg-white">
              <option value="">Select size</option>
              ${sizes.map(s => '<option value="' + esc(s) + '">' + esc(s) + '</option>').join('')}
            </select>
          </div>` : ''}
          ${colors.length > 1 ? `
          <div>
            <label class="font-label-caps text-xs text-on-surface-variant block mb-1.5">Color</label>
            <div id="variant-colors" class="flex gap-2 flex-wrap">
              ${colors.map(c => '<button type="button" class="color-swatch w-8 h-8 rounded-full border-2 border-outline-variant/50 hover:scale-110 transition-transform active:scale-95" data-color="' + esc(c) + '" style="background:' + colorHex(c) + ';" title="' + esc(c) + '"></button>').join('')}
            </div>
          </div>` : ''}
        </div>
        ` : ''}

        <div class="mb-6">
          <span id="detail-stock" class="inline-flex items-center gap-1.5 font-label-caps text-xs ${totalStock > 0 ? 'text-deep-emerald' : 'text-red-600'}">
            <span class="w-2 h-2 rounded-full ${totalStock > 0 ? 'bg-deep-emerald' : 'bg-red-600'}"></span>
            ${hasVariants ? (totalStock > 0 ? 'In stock' : 'Out of stock') : (totalStock > 0 ? 'In stock (' + totalStock + ' available)' : 'Out of stock')}
          </span>
        </div>

        <div class="flex gap-3 items-center">
          <button class="btn-shine flex-1 px-8 py-3 bg-deep-emerald text-white rounded-full font-label-caps text-xs uppercase tracking-widest hover:bg-primary transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed" id="add-to-cart"
            data-id="${p.id}" data-title="${esc(p.title)}" data-price="${finalPrice}"
            ${totalStock === 0 ? 'disabled' : ''}>
            <span class="material-symbols-outlined text-base align-middle mr-1.5">shopping_bag</span> Add to Cart
          </button>
          <button id="detail-wishlist" data-id="${p.id}" data-title="${esc(p.title)}" data-price="${finalPrice}" data-image="${images[0]}"
            class="w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 active:scale-90 ${isInWishlist(p.id) ? 'bg-deep-emerald border-deep-emerald text-white' : 'border-deep-emerald text-deep-emerald hover:bg-deep-emerald/5'}"
            aria-label="Toggle wishlist">
            <span class="material-symbols-outlined" style="font-size:1.3rem;">${isInWishlist(p.id) ? 'favorite' : 'favorite_border'}</span>
          </button>
        </div>

        <a href="https://wa.me/923359115702?text=${encodeURIComponent('Hi, I am interested in ' + p.title + ' - PKR ' + finalPrice.toLocaleString())}" target="_blank" rel="noopener noreferrer"
          class="btn-shine flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full font-label-caps text-xs uppercase tracking-widest transition-all active:scale-[0.97] mt-3"
          style="background:#25D366;color:#fff;">
          <span class="material-symbols-outlined text-base">chat</span> Order on WhatsApp
        </a>
      </div>
    </div>

    <section class="mb-section-gap fade-in">
      <h2 class="font-headline-md text-headline-md text-deep-emerald mb-6 relative inline-block after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/2 after:h-0.5 after:bg-metallic-gold">Customer Reviews</h2>
      <div id="reviews-summary" class="flex items-center gap-3 mb-4"></div>
      <div id="reviews-list" class="space-y-4 mb-8"></div>

      <div class="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant/10">
        <h3 class="font-headline-md text-headline-md text-deep-emerald mb-4">Write a Review</h3>
        <form id="review-form" class="space-y-4 max-w-lg">
          <div>
            <label class="font-label-caps text-xs text-on-surface-variant block mb-1.5" for="review-name">Your Name *</label>
            <input id="review-name" type="text" placeholder="Your name" required maxlength="80"
              class="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-white text-sm focus:outline-none focus:border-deep-emerald transition-colors" />
          </div>
          <div>
            <label class="font-label-caps text-xs text-on-surface-variant block mb-1.5">Rating *</label>
            <div class="star-input flex gap-1 text-2xl" id="star-input">
              ${starBtns()}
            </div>
            <input type="hidden" id="review-rating" required />
          </div>
          <div>
            <label class="font-label-caps text-xs text-on-surface-variant block mb-1.5" for="review-comment">Your Review *</label>
            <textarea id="review-comment" rows="4" placeholder="Share your experience with this product…" required minlength="10" maxlength="1000"
              class="w-full px-4 py-2.5 rounded-lg border border-outline-variant bg-white text-sm focus:outline-none focus:border-deep-emerald transition-colors resize-y"></textarea>
          </div>
          <div class="honeypot" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden;">
            <label for="hp-review-website">Leave this empty</label>
            <input id="hp-review-website" name="website" type="text" tabindex="-1" autocomplete="off" />
          </div>
          <button type="submit" class="btn-shine px-8 py-2.5 bg-deep-emerald text-white rounded-full font-label-caps text-xs uppercase tracking-widest hover:bg-primary transition-all active:scale-[0.97]">Submit Review</button>
        </form>
      </div>
    </section>

    <section id="recommended" class="mt-8"></section>

    <div id="zoom-lightbox" class="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300 p-4" onclick="closeLightbox(event)">
      <button class="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-2xl" onclick="closeLightbox()">✕</button>
      <img id="lightbox-img" class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" src="" alt="Zoomed view" />
    </div>
  `;

  detail.querySelectorAll('.thumb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('gallery-main').src = btn.dataset.src;
      detail.querySelectorAll('.thumb-btn').forEach(t => {
        t.classList.remove('border-deep-emerald', 'ring-1', 'ring-deep-emerald');
        t.classList.add('border-outline-variant/50');
      });
      btn.classList.remove('border-outline-variant/50');
      btn.classList.add('border-deep-emerald', 'ring-1', 'ring-deep-emerald');
    });
  });

  document.getElementById('add-to-cart')?.addEventListener('click', function() {
    const varId = this.dataset.variantId || '';
    const varLabel = this.dataset.variantLabel || '';
    addToCart(this.dataset.id, this.dataset.title, parseFloat(this.dataset.price), 1, varId, varLabel);
  });

  // Variant selection logic
  let selectedColor = '';
  let selectedSize = '';

  function findVariant() {
    const sizeEl = document.getElementById('variant-size');
    const selSize = sizeEl ? sizeEl.value : '';
    const selColor = selectedColor;
    if (sizes.length > 1 && !selSize) return null;
    if (colors.length > 1 && !selColor) return null;
    const match = variants.find(v => {
      if (sizes.length > 1 && v.size !== selSize) return false;
      if (colors.length > 1 && v.color !== selColor) return false;
      if (sizes.length <= 1 && colors.length <= 1) return true;
      if (sizes.length > 1 && colors.length <= 1) return v.size === selSize;
      if (colors.length > 1 && sizes.length <= 1) return v.color === selColor;
      return v.size === selSize && v.color === selColor;
    });
    return match || null;
  }

  function setActiveSwatch(el) {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('ring-2', 'ring-deep-emerald', 'scale-110'));
    if (el) { el.classList.add('ring-2', 'ring-deep-emerald', 'scale-110'); }
  }

  function updateVariantDisplay() {
    const btn = document.getElementById('add-to-cart');
    const stockEl = document.getElementById('detail-stock');
    const priceEl = document.getElementById('detail-price');
    const match = findVariant();

    const bothDim = sizes.length > 1 && colors.length > 1;
    const sizeEl = document.getElementById('variant-size');
    const selSize = sizeEl ? sizeEl.value : '';
    const sizeChosen = sizes.length <= 1 || selSize;
    const colorChosen = colors.length <= 1 || selectedColor;

    if (match) {
      const vPrice = match.price ? discPrice(match.price, p.discount_percent) : finalPrice;
      const parts = [];
      if (match.size) parts.push(match.size);
      if (match.color) parts.push(match.color);
      priceEl.textContent = 'PKR ' + vPrice.toLocaleString();
      btn.dataset.price = vPrice;
      btn.dataset.variantId = match.id;
      btn.dataset.variantLabel = parts.join(' / ');
      if (match.stock > 0) {
        stockEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-deep-emerald"></span> In stock (' + match.stock + ' available)';
        stockEl.className = 'inline-flex items-center gap-1.5 font-label-caps text-xs text-deep-emerald';
        btn.disabled = false;
      } else {
        stockEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-600"></span> Out of stock';
        stockEl.className = 'inline-flex items-center gap-1.5 font-label-caps text-xs text-red-600';
        btn.disabled = true;
      }
    } else if (bothDim && sizeChosen && colorChosen) {
      stockEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-600"></span> This combination is not available';
      stockEl.className = 'inline-flex items-center gap-1.5 font-label-caps text-xs text-red-600';
      btn.dataset.variantId = '';
      btn.dataset.variantLabel = '';
      btn.disabled = true;
    } else if (bothDim && (!sizeChosen || !colorChosen)) {
      const need = [];
      if (!sizeChosen) need.push('size');
      if (!colorChosen) need.push('color');
      stockEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-on-surface-variant"></span> Please select ' + need.join(' and ');
      stockEl.className = 'inline-flex items-center gap-1.5 font-label-caps text-xs text-on-surface-variant';
      btn.dataset.variantId = '';
      btn.dataset.variantLabel = '';
      btn.disabled = true;
    } else {
      btn.dataset.variantId = '';
      btn.dataset.variantLabel = '';
      priceEl.textContent = 'PKR ' + finalPrice.toLocaleString();
      btn.dataset.price = finalPrice;
      stockEl.innerHTML = '<span class="w-2 h-2 rounded-full ' + (totalStock > 0 ? 'bg-deep-emerald' : 'bg-red-600') + '"></span> ' + (totalStock > 0 ? 'In stock' : 'Out of stock');
      stockEl.className = 'inline-flex items-center gap-1.5 font-label-caps text-xs ' + (totalStock > 0 ? 'text-deep-emerald' : 'text-red-600');
      btn.disabled = totalStock === 0;
    }
  }

  const sizeEl = document.getElementById('variant-size');
  if (sizeEl) sizeEl.addEventListener('change', () => { selectedSize = sizeEl.value; updateVariantDisplay(); });
  document.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      setActiveSwatch(btn);
      updateVariantDisplay();
    });
  });
  document.getElementById('detail-wishlist')?.addEventListener('click', function() {
    const { id, title, price, image } = this.dataset;
    toggleWishlist(id, title, price, image);
    const inWl = isInWishlist(id);
    this.classList.toggle('bg-deep-emerald', inWl);
    this.classList.toggle('border-deep-emerald', inWl);
    this.classList.toggle('text-white', inWl);
    this.classList.toggle('text-deep-emerald', !inWl);
    this.querySelector('.material-symbols-outlined').textContent = inWl ? 'favorite' : 'favorite_border';
  });
  // Observer already unobserved parent — make new animated children visible
  detail.querySelectorAll('.fade-in, .fade-in-up, .stagger, .reveal').forEach(el => {
    el.classList.add('visible');
  });

  setupReviewForm(id);
  loadReviews(id);
  loadRecommended(p.category, id);
}

async function loadRecommended(category, currentId) {
  if (!category) return;
  const recSection = document.getElementById('recommended');
  if (!recSection) return;
  recSection.innerHTML = '<p class="text-center text-on-surface-variant py-8 text-sm">Loading recommendations…</p>';
  // Fetch all products and filter client-side since a product may have multiple categories
  const allProds = await getProducts({ limit: 50 });
  const cats = parseCats(category).map(c => c.toLowerCase());
  const products = allProds.filter(p => parseCats(p.category).some(c => cats.includes(c.toLowerCase())));
  const filtered = products.filter(p => p.id !== currentId).slice(0, 4);
  if (!filtered.length) { recSection.innerHTML = ''; return; }
  recSection.innerHTML = `
    <h2 class="font-headline-md text-headline-md text-deep-emerald mb-6 relative inline-block after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-1/2 after:h-0.5 after:bg-metallic-gold">You May Also Like</h2>
    <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-gutter stagger">
      ${filtered.map(p => {
        const fp = discPrice(p.price, p.discount_percent);
        const os = hasDisc(p.discount_percent);
        const inWl = isInWishlist(p.id);
        const img = p.image_url || 'https://placehold.co/600x450?text=Crafto';
        return `
          <div class="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-outline-variant/10 product-card">
            <button class="rec-wishlist absolute top-2 right-2 md:top-3 md:right-3 z-10 w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:scale-110 transition-transform ${inWl ? 'text-red-500' : 'text-on-surface-variant'}"
              data-id="${p.id}" data-title="${esc(p.title)}" data-price="${fp}" data-image="${img}">
              <span class="material-symbols-outlined text-xs md:text-sm">${inWl ? 'favorite' : 'favorite_border'}</span>
            </button>
            ${os ? `<div class="absolute top-2 left-2 md:top-3 md:left-3 z-10 bg-deep-emerald text-white text-[10px] px-2 py-0.5 md:px-2.5 md:py-0.5 rounded-full font-label-caps font-bold">-${p.discount_percent}%</div>` : ''}
            <a href="./product?id=${p.id}">
              <div class="relative aspect-[1/1] overflow-hidden">
                <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${img}" alt="${esc(p.title)}" loading="lazy" />
              </div>
              <div class="p-2 md:p-4 text-center">
                <span class="text-metallic-gold font-label-caps text-[10px] tracking-widest uppercase block">${p.category ? esc(displayCats(p.category)) : 'Heritage'}</span>
                <h3 class="font-headline-md text-xs md:text-headline-md text-charcoal-text hover:text-deep-emerald transition-colors leading-tight">${esc(p.title)}</h3>
                <p class="text-xs md:text-sm font-semibold mt-0.5 md:mt-1">
                  ${os ? `<span class="text-on-surface-variant/50 line-through text-[10px] md:text-sm mr-1">PKR ${Number(p.price).toLocaleString()}</span>` : ''}
                  <span class="text-deep-emerald">PKR ${fp.toLocaleString()}</span>
                </p>
              </div>
            </a>
          </div>
        `;
      }).join('')}
    </div>
  `;
  recSection.querySelector('.stagger')?.classList.add('visible');
  recSection.querySelectorAll('.rec-wishlist').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const { id, title, price, image } = this.dataset;
      toggleWishlist(id, title, price, image);
      const inWl = isInWishlist(id);
      this.classList.toggle('text-red-500', inWl);
      this.classList.toggle('text-on-surface-variant', !inWl);
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
      ? `<div class="flex items-center gap-2 text-metallic-gold text-lg">${renderStars(Math.round(avg))}</div>
         <span class="text-deep-emerald font-label-caps text-sm">${avg.toFixed(1)} out of 5</span>
         <span class="text-on-surface-variant/60 text-sm">(${reviews.length} review${reviews.length === 1 ? '' : 's'})</span>`
      : '<p class="text-on-surface-variant/60 text-sm">No reviews yet — be the first!</p>';
  }

  if (!reviews.length) {
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = reviews.map(r => `
    <article class="bg-white rounded-xl p-5 border border-outline-variant/10 shadow-sm ${r.pinned ? 'ring-1 ring-metallic-gold/20 bg-gradient-to-r from-metallic-gold/[0.03] to-transparent' : ''}">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-deep-emerald/10 flex items-center justify-center text-deep-emerald font-label-caps text-sm font-bold">${esc(r.author_name).charAt(0).toUpperCase()}</div>
          <strong class="font-label-caps text-xs text-charcoal-text">${esc(r.author_name)}</strong>
        </div>
        <span class="text-metallic-gold text-sm flex gap-0.5">${renderStars(r.rating)}</span>
      </div>
      ${r.pinned ? '<span class="inline-block text-[10px] font-label-caps text-metallic-gold uppercase tracking-wider bg-metallic-gold/10 px-2 py-0.5 rounded mb-2">★ Pinned Review</span>' : ''}
      <time class="text-on-surface-variant/50 text-xs block mb-2">${new Date(r.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}</time>
      <p class="text-sm text-on-surface-variant leading-relaxed">${esc(r.comment)}</p>
    </article>
  `).join('');
}

// --- Image Zoom (must be on window before renderDetail runs) ---
window.zoomIn = function() {
  const c = document.getElementById('zoom-container');
  if (c) c.classList.add('zoomed');
};
window.zoomOut = function() {
  const c = document.getElementById('zoom-container');
  if (c) c.classList.remove('zoomed');
};
window.zoomMove = function(e) {
  const c = document.getElementById('zoom-container');
  if (!c || !c.classList.contains('zoomed')) return;
  const r = c.getBoundingClientRect();
  c.querySelector('img').style.transformOrigin = `${((e.clientX - r.left) / r.width * 100).toFixed(1)}% ${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`;
};
window.openLightbox = function() {
  const src = document.getElementById('gallery-main')?.src;
  if (!src) return;
  document.getElementById('lightbox-img').src = src;
  document.getElementById('zoom-lightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
};
window.closeLightbox = function(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('zoom-lightbox').classList.remove('open');
  document.body.style.overflow = '';
};

const isShopPage = !!document.getElementById('product-grid');
const isDetailPage = !!document.getElementById('product-detail');

if (isShopPage) {
  initCategories().then(() => renderShop());
}
if (isDetailPage) {
  renderDetail();
}
