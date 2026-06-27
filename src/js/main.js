// src/js/main.js

// --- Loading Screen (once per session) ---
let ready = false;
let minTime = false;

if (sessionStorage.getItem('crafto_splash_shown')) {
  document.getElementById('loading-left')?.remove();
  document.getElementById('loading-right')?.remove();
  document.getElementById('loading-content')?.remove();
}

function openDoors() {
  sessionStorage.setItem('crafto_splash_shown', '1');
  const left = document.getElementById('loading-left');
  const right = document.getElementById('loading-right');
  const content = document.getElementById('loading-content');
  if (!left) return;
  content?.classList.add('hide');
  setTimeout(() => {
    left.classList.add('open');
    right.classList.add('open');
  }, 300);
  setTimeout(() => {
    left?.remove();
    right?.remove();
    content?.remove();
  }, 1600);
}

function checkReady() {
  if (ready && minTime) openDoors();
}

document.addEventListener('page-ready', () => { ready = true; checkReady(); });
setTimeout(() => { minTime = true; checkReady(); }, 2500);

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  updateWishlistBadge();

  // Mobile nav toggle
  const burger = document.getElementById('burger');
  const navMenu = document.getElementById('nav-menu');
  const navOverlay = document.getElementById('nav-overlay');
  function toggleNav(force) {
    const isOpen = navMenu?.classList.toggle('open', force);
    navOverlay?.classList.toggle('open', isOpen);
    document.body.classList.toggle('nav-open', isOpen);
  }
  burger?.addEventListener('click', () => toggleNav());
  navOverlay?.addEventListener('click', () => toggleNav(false));
  navMenu?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => toggleNav(false));
  });

  // Scroll-triggered animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.fade-in, .fade-in-up, .stagger, .reveal').forEach(el => observer.observe(el));

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
    el.style.display = count ? '' : 'none';
  });
}

export function showToast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    Object.assign(container.style, {
      position: 'fixed', bottom: '16px', left: '16px', right: '16px', zIndex: '99999',
      display: 'flex', flexDirection: 'column', gap: '10px',
      maxWidth: '360px', pointerEvents: 'none',
    });
    // On desktop, let it stretch from the right only
    if (window.innerWidth >= 768) {
      container.style.left = 'auto';
    }
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.textContent = msg;
  Object.assign(toast.style, {
    padding: '14px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '500',
    fontFamily: 'Hanken Grotesk, sans-serif',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
    transform: 'translateX(120%)', opacity: '0',
    transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease',
    pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '8px',
    color: type === 'error' ? '#fff' : '#fff',
    background: type === 'error' ? '#dc2626' : '#006A4E',
  });
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.textContent = type === 'error' ? 'error' : 'check_circle';
  Object.assign(icon.style, { fontSize: '18px' });
  toast.prepend(icon);
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  });
  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function getCart() { return JSON.parse(localStorage.getItem('crafto_cart') || '[]'); }

export function addToCart(id, title, price, qty = 1, variantId = '', variantLabel = '') {
  const cart = getCart();
  const existing = cart.find(i => i.id === id && i.variant_id === variantId);
  if (existing) { existing.qty += qty; showToast(`${title} quantity increased to ${existing.qty}!`); }
  else {
    cart.push({
      id, title, price, qty,
      variant_id: variantId || undefined,
      variant_label: variantLabel || undefined,
    });
    showToast(`${title} added to cart!`);
  }
  localStorage.setItem('crafto_cart', JSON.stringify(cart));
  updateCartBadge();
}

// --- Wishlist ---
function getWishlist() { return JSON.parse(localStorage.getItem('crafto_wishlist') || '[]'); }

export function isInWishlist(id) {
  return getWishlist().some(i => i.id === id);
}

export function toggleWishlist(id, title, price, image) {
  let list = getWishlist();
  const idx = list.findIndex(i => i.id === id);
  if (idx > -1) { list.splice(idx, 1); showToast('Removed from Wishlist'); }
  else { list.push({ id, title, price, image }); showToast('Added to Wishlist'); }
  localStorage.setItem('crafto_wishlist', JSON.stringify(list));
  updateWishlistBadge();
  return idx > -1;
}

export function removeFromWishlist(id) {
  let list = getWishlist();
  list = list.filter(i => i.id !== id);
  localStorage.setItem('crafto_wishlist', JSON.stringify(list));
  updateWishlistBadge();
}

export function updateWishlistBadge() {
  const count = getWishlist().length;
  document.querySelectorAll('.wishlist-badge').forEach(el => {
    el.textContent = count || '';
    el.style.display = count ? '' : 'none';
  });
}

export { getWishlist };
