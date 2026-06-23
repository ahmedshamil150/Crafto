// src/js/checkout.js
// Handles checkout form and order summary from cart

const form = document.getElementById('checkout-form');
const summaryEl = document.getElementById('order-summary');

function getCart() {
  return JSON.parse(localStorage.getItem('crafto_cart') || '[]');
}

function renderSummary() {
  const cart = getCart();
  if (!cart.length) {
    if (summaryEl) summaryEl.innerHTML = '<p>Your cart is empty.</p>';
    return;
  }
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  if (summaryEl) {
    summaryEl.innerHTML = `
      <strong>Order Summary:</strong>
      <ul style="margin:0.5rem 0 0.5rem 1.25rem;">
        ${cart.map(i => `<li>${i.title} × ${i.qty} — PKR ${(i.price * i.qty).toLocaleString()}</li>`).join('')}
      </ul>
      <strong>Total: PKR ${total.toLocaleString()}</strong>
    `;
  }
}

form?.addEventListener('submit', e => {
  e.preventDefault();
  // TODO: integrate with Supabase orders table
  localStorage.removeItem('crafto_cart');
  alert('Order placed! We will contact you to confirm delivery.');
  window.location.href = './index.html';
});

renderSummary();
