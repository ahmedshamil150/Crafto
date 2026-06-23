// src/js/checkout.js
import { createOrder } from './api.js';
import { showToast } from './main.js';

const form      = document.getElementById('checkout-form');
const summaryEl = document.getElementById('order-summary');
const submitBtn = form?.querySelector('button[type="submit"]');

function getCart() { return JSON.parse(localStorage.getItem('crafto_cart') || '[]'); }

function renderSummary() {
  const cart = getCart();
  if (!cart.length) {
    if (summaryEl) summaryEl.innerHTML = '<p>Your cart is empty. <a href="./shop.html">Go shopping</a></p>';
    if (submitBtn) submitBtn.disabled = true;
    return;
  }
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  summaryEl.innerHTML = `
    <div class="order-summary-box">
      <strong>Order Summary</strong>
      <ul>
        ${cart.map(i => `<li>${i.title} × ${i.qty} — PKR ${(i.price * i.qty).toLocaleString()}</li>`).join('')}
      </ul>
      <strong>Total: PKR ${total.toLocaleString()}</strong>
    </div>
  `;
}

form?.addEventListener('submit', async e => {
  e.preventDefault();
  const cart = getCart();
  if (!cart.length) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Placing order…';

  const order = {
    customer_name:    document.getElementById('name').value.trim(),
    customer_phone:   document.getElementById('phone').value.trim(),
    customer_address: document.getElementById('address').value.trim(),
    items:            cart,
    total:            cart.reduce((s, i) => s + i.price * i.qty, 0),
    status:           'pending',
  };

  try {
    await createOrder(order);
    localStorage.removeItem('crafto_cart');
    showToast('Order placed! We will contact you to confirm delivery.');
    setTimeout(() => window.location.href = './index.html', 2000);
  } catch (err) {
    showToast(`Order failed: ${err.message}`, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place Order (COD)';
  }
});

renderSummary();
