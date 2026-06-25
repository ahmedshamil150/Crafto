// src/js/order-status.js
import { trackOrder } from './api.js';

const form     = document.getElementById('track-form');
const resultEl = document.getElementById('track-result');
const idInput  = document.getElementById('order-id');
const phoneInput = document.getElementById('phone');

const STATUS_LABELS = {
  pending: 'Pending — we will contact you soon',
  confirmed: 'Confirmed — your order is being prepared',
  shipped: 'Shipped — on its way to you',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const params = new URLSearchParams(location.search);
if (params.get('id')) idInput.value = params.get('id');
const savedPhone = sessionStorage.getItem('crafto_track_phone');
if (savedPhone) {
  phoneInput.value = savedPhone;
  sessionStorage.removeItem('crafto_track_phone');
}

form?.addEventListener('submit', e => {
  e.preventDefault();
  lookup();
});

if (idInput.value && phoneInput.value) lookup();

async function lookup() {
  const id = idInput.value.trim();
  const phone = phoneInput.value.trim();
  if (!id || !phone) return;

  resultEl.innerHTML = '<p class="loading">Looking up order…</p>';
  try {
    const data = await trackOrder(id, phone);
    const order = Array.isArray(data) ? data[0] : null;
    if (!order) {
      resultEl.innerHTML = '<p>Order not found. Please check your Order ID and phone number.</p>';
      return;
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const statusText = STATUS_LABELS[order.status] || order.status;

    resultEl.innerHTML = `
      <div class="order-summary-box">
        <p><strong>Order ID:</strong> <code style="font-size:0.85rem;">${order.id}</code></p>
        <p><strong>Placed:</strong> ${new Date(order.created_at).toLocaleString('en-PK')}</p>
        <p><strong>Status:</strong> <span class="badge">${statusText}</span></p>
        <p><strong>Total:</strong> PKR ${Number(order.total || 0).toLocaleString()}</p>
        ${items.length ? `
          <strong style="display:block;margin-top:1rem;">Items</strong>
          <ul style="margin-top:0.5rem;padding-left:1.25rem;">
            ${items.map(i => `<li>${i.title} × ${i.qty}</li>`).join('')}
          </ul>
        ` : ''}
        <p style="margin-top:1rem;color:#666;font-size:0.9rem;">Delivery to: ${order.customer_address || '–'}</p>
      </div>
    `;
  } catch (err) {
    resultEl.innerHTML = `<p style="color:#c62828;">Could not load order: ${err.message}</p>`;
  }
}
