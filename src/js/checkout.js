import { placeOrder, validateCoupon, getProducts } from './api.js';
import { addToCart, showToast, isInWishlist, toggleWishlist } from './main.js';

const form      = document.getElementById('checkout-form');
const summaryEl = document.getElementById('order-summary');
const submitBtn = form?.querySelector('button[type="submit"]');
const couponInput = document.getElementById('coupon-input');
const applyBtn    = document.getElementById('apply-coupon-btn');
const couponMsg   = document.getElementById('coupon-msg');
const recSection = document.getElementById('checkout-recommended');

let appliedCoupon = null;
let couponDiscount = 0;

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str ?? '';
  return el.innerHTML;
}

function getCart() { return JSON.parse(localStorage.getItem('crafto_cart') || '[]'); }

function calcSubtotal() {
  return getCart().reduce((s, i) => s + i.price * i.qty, 0);
}

const SHIPPING_FEE = 200;

function renderSummary() {
  const cart = getCart();
  if (!cart.length) {
    summaryEl.innerHTML = `<div class="bg-white rounded-xl p-8 shadow-sm border border-outline-variant/10 text-center"><span class="material-symbols-outlined text-deep-emerald text-4xl mb-3">shopping_cart</span><p class="font-body-md text-on-surface-variant">Your cart is empty.</p><a href="./shop.html" class="inline-block mt-3 px-5 py-2 bg-deep-emerald text-white rounded-lg font-label-caps text-sm">Go Shopping</a></div>`;
    if (submitBtn) submitBtn.disabled = true;
    return;
  }
  const subtotal = calcSubtotal();
  const total = subtotal - couponDiscount + SHIPPING_FEE;
  summaryEl.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
      <div class="bg-deep-emerald px-6 py-4">
        <h3 class="font-label-caps text-label-caps text-white uppercase tracking-wider">Order Summary</h3>
      </div>
      <div class="p-6 space-y-4">
        <div class="space-y-3 max-h-64 overflow-y-auto scrollbar-thin pr-1">
          ${cart.map(i => `
            <div class="flex items-center gap-3 pb-3 border-b border-outline-variant/10 last:border-0">
              <div class="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0 overflow-hidden">
                ${i.image ? `<img src="${i.image}" alt="${esc(i.title)}" class="w-full h-full object-cover" />` : `<span class="material-symbols-outlined text-deep-emerald">inventory_2</span>`}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-body-md text-sm text-charcoal-text truncate">${esc(i.title)}</p>
                <p class="font-body-md text-xs text-on-surface-variant">Qty: ${i.qty}</p>
              </div>
              <p class="font-body-md text-sm text-deep-emerald font-semibold whitespace-nowrap">PKR ${(i.price * i.qty).toLocaleString()}</p>
            </div>
          `).join('')}
        </div>
        <div class="space-y-2 pt-2 border-t border-outline-variant/10">
          <div class="flex justify-between font-body-md text-sm text-on-surface-variant">
            <span>Subtotal</span><span>PKR ${subtotal.toLocaleString()}</span>
          </div>
          ${couponDiscount > 0 ? `
          <div class="flex justify-between font-body-md text-sm text-green-700">
            <span>Discount (${Math.round(couponDiscount / subtotal * 100)}% off)</span><span>-PKR ${couponDiscount.toLocaleString()}</span>
          </div>` : ''}
          <div class="flex justify-between font-body-md text-sm text-on-surface-variant">
            <span>Shipping</span><span>PKR ${SHIPPING_FEE.toLocaleString()}</span>
          </div>
          <hr class="border-outline-variant/20" />
          <div class="flex justify-between font-headline-md text-headline-md text-deep-emerald">
            <span>Total</span><span>PKR ${Math.max(0, total).toLocaleString()}</span>
          </div>
          <p class="font-label-caps text-[10px] text-on-surface-variant text-center pt-2">Cash on Delivery</p>
        </div>
      </div>
    </div>
  `;
}

document.getElementById('location-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('location-btn');
  const addr = document.getElementById('address');
  if (!navigator.geolocation) { showToast('Geolocation not supported by your browser.', 'error'); return; }
  btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Getting location…';
  try {
    const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
    const { latitude, longitude } = pos.coords;
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      { headers: { 'User-Agent': 'Crafto/1.0 (ecommerce)' } }
    );
    if (!resp.ok) throw new Error('Could not fetch address.');
    const data = await resp.json();
    const display = data.display_name || `${latitude}, ${longitude}`;
    addr.value = display;
    addr.focus();
    showToast('Location filled. You can edit it if needed.');
  } catch (err) {
    if (err.code === 1) showToast('Location access denied. Please enter address manually.', 'error');
    else showToast(`Could not get location: ${err.message}`, 'error');
  }
  btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined text-base">my_location</span> Use Current Location';
});

applyBtn?.addEventListener('click', async () => {
  const code = couponInput.value.trim();
  if (!code) return;
  applyBtn.disabled = true;
  applyBtn.textContent = 'Checking…';
  couponMsg.textContent = '';
  couponMsg.className = '';
  try {
    const data = await validateCoupon(code);
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) { couponMsg.textContent = 'Invalid coupon code.'; couponMsg.className = 'text-sm text-red-600 mt-1'; return; }
    const discPct = result.discount_percent;
    appliedCoupon = code;
    couponDiscount = Math.round(calcSubtotal() * discPct / 100);
    couponMsg.textContent = `${discPct}% off applied! You save PKR ${couponDiscount.toLocaleString()}`;
    couponMsg.className = 'text-sm text-green-700 mt-1';
    renderSummary();
  } catch (err) {
    couponMsg.textContent = err.message;
    couponMsg.className = 'text-sm text-red-600 mt-1';
    appliedCoupon = null;
    couponDiscount = 0;
    renderSummary();
  }
  applyBtn.disabled = false;
  applyBtn.textContent = 'Apply';
});

form?.addEventListener('submit', async e => {
  e.preventDefault();
  const hp = document.getElementById('hp-website');
  if (hp && hp.value.trim()) return;
  const cart = getCart();
  if (!cart.length) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Placing Order…';

  const orderId = crypto.randomUUID();
  const phone   = document.getElementById('phone').value.trim();
  const email   = document.getElementById('email').value.trim();
  const total   = Math.max(0, calcSubtotal() - couponDiscount + SHIPPING_FEE);
  const order = {
    id:               orderId,
    customer_name:    document.getElementById('name').value.trim(),
    customer_phone:   phone,
    customer_address: document.getElementById('address').value.trim(),
    items:            cart,
    total,
    status:           'pending',
  };

  try {
    await placeOrder(order, appliedCoupon);
    fetch('https://formsubmit.co/ajax/craftostore.pk@gmail.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: `New Order #${orderId.slice(0, 8)}`,
        name: order.customer_name,
        email,
        phone: order.customer_phone,
        address: order.customer_address,
        items: cart.map(i => `${i.title} × ${i.qty}`).join(', '),
        total: `PKR ${total.toLocaleString()}`,
        coupon: appliedCoupon || 'None',
      }),
    }).catch(() => {});
    localStorage.removeItem('crafto_cart');
    sessionStorage.setItem('crafto_track_phone', phone);
    showToast('Order placed! Save your Order ID to track delivery.');
    setTimeout(() => window.location.href = `./order-status.html?id=${orderId}`, 2000);
  } catch (err) {
    showToast(`Order failed: ${err.message}`, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place Order (COD)';
  }
});

async function loadRecommended() {
  const products = await getProducts({ featured: true, limit: 4 });
  if (!products.length) return;

  recSection.innerHTML = `
    <div class="fade-in-up">
      <div class="flex items-center gap-3 mb-6">
        <span class="w-10 h-10 rounded-full bg-metallic-gold/15 flex items-center justify-center text-metallic-gold"><span class="material-symbols-outlined">recommend</span></span>
        <div>
          <h2 class="font-headline-md text-headline-md text-deep-emerald">You May Also Like</h2>
          <p class="text-sm text-on-surface-variant">Handpicked recommendations for you</p>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-gutter stagger">
        ${products.map(p => {
          const img = p.image_url || 'https://placehold.co/600x450?text=Crafto';
          const fp = p.discount_percent ? Math.round(p.price * (1 - parseInt(p.discount_percent) / 100)) : p.price;
          const inWl = isInWishlist(p.id);
          return `
            <div class="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-outline-variant/10 product-card">
              <div class="relative aspect-[3/4] md:aspect-[4/5] overflow-hidden">
                <a href="./product.html?id=${p.id}">
                  <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${img}" alt="${esc(p.title)}" loading="lazy" />
                </a>
                <button class="checkout-wishlist absolute top-2 left-2 md:top-3 md:left-3 z-10 w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:scale-110 transition-all ${inWl ? 'text-red-500' : 'text-on-surface-variant'}"
                  data-id="${p.id}" data-title="${esc(p.title)}" data-price="${fp}" data-image="${img}">
                  <span class="material-symbols-outlined text-xs md:text-sm">${inWl ? 'favorite' : 'favorite_border'}</span>
                </button>
                ${p.discount_percent ? `<span class="absolute top-2 right-2 md:top-3 md:right-3 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded font-label-caps">-${p.discount_percent}%</span>` : ''}
              </div>
              <div class="p-4 text-center">
                <span class="text-metallic-gold font-label-caps text-[10px] tracking-widest uppercase block">${p.category ? esc(p.category) : 'Heritage'}</span>
                <h3 class="font-headline-md text-sm text-charcoal-text mt-1">${esc(p.title)}</h3>
                <p class="font-body-md text-deep-emerald font-semibold mt-1">PKR ${fp.toLocaleString()}</p>
                <button class="checkout-add-cart btn-shine mt-3 w-full px-3 py-2 bg-deep-emerald text-white rounded-lg font-label-caps text-[10px] hover:bg-primary transition-all active:scale-[0.97]"
                  data-id="${p.id}" data-title="${esc(p.title)}" data-price="${fp}"><span class="material-symbols-outlined text-xs align-middle">shopping_bag</span> Add to Cart</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  recSection.querySelectorAll('.checkout-add-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      addToCart(btn.dataset.id, btn.dataset.title, parseFloat(btn.dataset.price));
      showToast(`${btn.dataset.title} added to cart!`);
    });
  });

  recSection.querySelectorAll('.checkout-wishlist').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, title, price, image } = btn.dataset;
      toggleWishlist(id, title, price, image);
      const icon = btn.querySelector('.material-symbols-outlined');
      btn.classList.toggle('text-red-500', isInWishlist(id));
      btn.classList.toggle('text-on-surface-variant', !isInWishlist(id));
      icon.textContent = isInWishlist(id) ? 'favorite' : 'favorite_border';
    });
  });

  // Animate the recommended section and its children
  setTimeout(() => {
    recSection.querySelectorAll('.fade-in-up, .stagger').forEach(el => el.classList.add('visible'));
  }, 100);
}

renderSummary();
loadRecommended();
