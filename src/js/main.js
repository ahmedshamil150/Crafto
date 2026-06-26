// src/js/main.js
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();

  // Mobile nav toggle
  const burger = document.getElementById('burger');
  const navMenu = document.getElementById('nav-menu');
  burger?.addEventListener('click', () => navMenu?.classList.toggle('open'));

  // Contact form handler
  const contactForm = document.getElementById('contact-form');
  contactForm?.addEventListener('submit', e => {
    e.preventDefault();
    document.getElementById('contact-status').textContent = 'Thanks! We will get back to you soon.';
    contactForm.reset();
  });
});

export function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem('crafto_cart') || '[]');
  const count = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent = count || '';
    el.style.display = count ? 'inline' : 'none';
  });
}

export function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function getCart() { return JSON.parse(localStorage.getItem('crafto_cart') || '[]'); }

export function addToCart(id, title, price, qty = 1) {
  const cart = getCart();
  const existing = cart.find(i => i.id === id);
  if (existing) { existing.qty += qty; }
  else { cart.push({ id, title, price, qty }); }
  localStorage.setItem('crafto_cart', JSON.stringify(cart));
  updateCartBadge();
}
