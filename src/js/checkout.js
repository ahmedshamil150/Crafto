// src/js/checkout.js
import { placeOrder, validateCoupon } from './api.js';
import { showToast } from './main.js';

const form      = document.getElementById('checkout-form');
const summaryEl = document.getElementById('order-summary');
const submitBtn = form?.querySelector('button[type="submit"]');
const couponInput = document.getElementById('coupon-input');
const applyBtn    = document.getElementById('apply-coupon-btn');
const couponMsg   = document.getElementById('coupon-msg');

let appliedCoupon = null;
let couponDiscount = 0;

function getCart() { return JSON.parse(localStorage.getItem('crafto_cart') || '[]'); }

function calcSubtotal() {
  return getCart().reduce((s, i) => s + i.price * i.qty, 0);
}

function renderSummary() {
  const cart = getCart();
  if (!cart.length) {
    if (summaryEl) summaryEl.innerHTML = '<p>Your cart is empty. <a href="./shop.html">Go shopping</a></p>';
    if (submitBtn) submitBtn.disabled = true;
    return;
  }
  const subtotal = calcSubtotal();
  const total = subtotal - couponDiscount;
  summaryEl.innerHTML = `
    <div class="order-summary-box">
      <strong>Order Summary</strong>
      <ul>
        ${cart.map(i => `<li>${i.title} × ${i.qty} — PKR ${(i.price * i.qty).toLocaleString()}</li>`).join('')}
      </ul>
      <p style="margin-top:0.5rem;">Subtotal: PKR ${subtotal.toLocaleString()}</p>
      ${couponDiscount > 0 ? `<p style="color:#2e7d32;">Discount: −PKR ${couponDiscount.toLocaleString()}</p>` : ''}
      <strong>Total: PKR ${Math.max(0, total).toLocaleString()}</strong>
    </div>
  `;
}

applyBtn?.addEventListener('click', async () => {
  const code = couponInput.value.trim();
  if (!code) return;
  applyBtn.disabled = true;
  applyBtn.textContent = 'Checking…';
  couponMsg.textContent = '';
  couponMsg.className = 'coupon-msg';
  try {
    const data = await validateCoupon(code);
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) { couponMsg.textContent = 'Invalid coupon code.'; couponMsg.className = 'coupon-msg coupon-error'; return; }
    const discPct = result.discount_percent;
    appliedCoupon = code;
    couponDiscount = Math.round(calcSubtotal() * discPct / 100);
    couponMsg.textContent = `${discPct}% off applied! You save PKR ${couponDiscount.toLocaleString()}`;
    couponMsg.className = 'coupon-msg coupon-success';
    renderSummary();
  } catch (err) {
    couponMsg.textContent = err.message;
    couponMsg.className = 'coupon-msg coupon-error';
    appliedCoupon = null;
    couponDiscount = 0;
    renderSummary();
  }
  applyBtn.disabled = false;
  applyBtn.textContent = 'Apply';
});

form?.addEventListener('submit', async e => {
  e.preventDefault();
  const cart = getCart();
  if (!cart.length) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Placing order…';

  const orderId = crypto.randomUUID();
  const phone   = document.getElementById('phone').value.trim();
  const total   = Math.max(0, calcSubtotal() - couponDiscount);
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

renderSummary();
