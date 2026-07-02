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

// Inject pill nav styles
(function injectPillStyles() {
  const id = 'pill-nav-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
.pill-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  overflow: hidden;
  cursor: pointer;
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #fff;
  transition: color 0.3s ease;
  z-index: 1;
}
.pill-item:hover { color: #006A4E; }
.hover-circle {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #fff;
  transform: translateX(-50%) scale(0);
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform-origin: bottom center;
  z-index: -1;
}
.pill-item:hover .hover-circle { transform: translateX(-50%) scale(1.4); }
.label-stack {
  position: relative;
  display: block;
  overflow: hidden;
  height: 1.1em;
}
.pill-label,
.pill-label-hover {
  display: block;
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.35s ease;
}
.pill-label-hover {
  position: absolute;
  top: 0;
  left: 0;
  transform: translateY(120%);
  opacity: 0;
}
.pill-item:hover .pill-label { transform: translateY(-120%); opacity: 0; }
.pill-item:hover .pill-label-hover { transform: translateY(0); opacity: 1; }
.pill-cart {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #fff;
  transition: background 0.3s ease, color 0.3s ease, transform 0.3s ease;
}
.pill-cart:hover { background: #fff; color: #006A4E; transform: scale(1.1); }
`;
  document.head.appendChild(style);
})();

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  updateWishlistBadge();

  // Floating pill nav (desktop only)
  const header = document.getElementById('site-header');
  const pill = document.getElementById('header-pill');
  if (header && pill) {
    const isDesktop = () => window.innerWidth >= 768;
    const updatePill = () => {
      const scrolled = window.scrollY > 80;
      if (isDesktop()) {
        header.style.opacity = scrolled ? '0' : '1';
        header.style.pointerEvents = scrolled ? 'none' : '';
        pill.classList.toggle('hidden', !scrolled);
        pill.classList.toggle('md:flex', scrolled);
      } else {
        header.style.opacity = '1';
        header.style.pointerEvents = '';
        pill.classList.add('hidden');
        pill.classList.remove('md:flex');
      }
    };
    window.addEventListener('scroll', updatePill, { passive: true });
    updatePill();
  }

  // Mobile floating buttons (phone only)
  let mobileStyleEl = null;
  function setupMobileLayout() {
    const burger = document.getElementById('burger');
    const logoLink = document.querySelector('a[href="./"]');
    const img = logoLink?.querySelector('img');
    const isPhone = window.innerWidth < 768;

    document.querySelectorAll('.mobile-float-btn').forEach(el => el.remove());
    mobileStyleEl?.remove();
    mobileStyleEl = null;

    if (isPhone) {
      header?.classList.remove('fixed', 'top-0');
      if (burger) burger.style.display = 'none';

      // Hide ALL icon containers inside the nav (search, wishlist, cart)
      document.querySelectorAll('header nav .flex.items-center.gap-4').forEach(el => el.style.display = 'none');

      mobileStyleEl = document.createElement('style');
      mobileStyleEl.id = 'mobile-header-style';
      mobileStyleEl.textContent = `
#site-header nav {
  justify-content: center !important;
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
}
#site-header nav > a[href="./"] {
  position: static !important;
  transform: none !important;
  left: auto !important;
}
main { padding-top: 0 !important; }
section.h-screen.flex.items-start { height: 50vh !important; min-height: 50vh !important; }
section.h-screen.flex.items-start .container.relative.z-10 { padding-top: 1rem !important; }
section.px-margin-mobile > .flex.flex-col.justify-between { align-items: center !important; }
section.px-margin-mobile > .flex.flex-col.justify-between h2 { text-align: center !important; }
section.px-margin-mobile > .flex.flex-col.justify-between .w-24 { margin-left: auto !important; margin-right: auto !important; }
.mobile-float-btn {
  position: fixed !important;
  z-index: 9999 !important;
  border-radius: 9999px !important;
  background: #006A4E !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25) !important;
  width: 40px !important;
  height: 40px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: transform 0.2s ease !important;
  text-decoration: none !important;
  border: none !important;
  outline: none !important;
  cursor: pointer !important;
}
.mobile-float-btn .material-symbols-outlined {
  color: #fff !important;
  font-size: 22px !important;
}
.mobile-float-btn:active {
  transform: scale(0.92) !important;
}
`;
      document.head.appendChild(mobileStyleEl);

      // Floating menu (top-left)
      const floatBurger = document.createElement('button');
      floatBurger.className = 'mobile-float-btn';
      floatBurger.style.top = '16px';
      floatBurger.style.left = '16px';
      floatBurger.innerHTML = '<span class="material-symbols-outlined">menu</span>';
      floatBurger.addEventListener('click', () => burger?.click());
      document.body.appendChild(floatBurger);

      // Floating cart (top-right)
      const floatCart = document.createElement('a');
      floatCart.href = './cart';
      floatCart.className = 'mobile-float-btn';
      floatCart.style.top = '16px';
      floatCart.style.right = '16px';
      floatCart.innerHTML = '<span class="material-symbols-outlined">shopping_bag</span><span class="cart-badge" style="position:absolute;top:-4px;right:-4px;background:#D4AF37;color:#fff;font-size:10px;border-radius:50%;width:16px;height:16px;display:none;align-items:center;justify-content:center">0</span>';
      document.body.appendChild(floatCart);

      // Floating wishlist (bottom-left)
      const floatWishlist = document.createElement('a');
      floatWishlist.href = './wishlist';
      floatWishlist.className = 'mobile-float-btn';
      floatWishlist.style.bottom = '16px';
      floatWishlist.style.left = '16px';
      floatWishlist.innerHTML = '<span class="material-symbols-outlined">favorite</span><span class="wishlist-badge" style="position:absolute;top:-4px;right:-4px;background:#D4AF37;color:#fff;font-size:10px;border-radius:50%;width:16px;height:16px;display:none;align-items:center;justify-content:center">0</span>';
      document.body.appendChild(floatWishlist);

      // Floating search (bottom-right)
      const floatSearch = document.createElement('a');
      floatSearch.href = './shop';
      floatSearch.className = 'mobile-float-btn';
      floatSearch.style.bottom = '16px';
      floatSearch.style.right = '16px';
      floatSearch.innerHTML = '<span class="material-symbols-outlined">search</span>';
      document.body.appendChild(floatSearch);

      // Favicon + CRAFTO label
      if (img) {
        if (!img.dataset.originalSrc) img.dataset.originalSrc = img.src;
        img.src = '/favicon.png';
        img.style.width = '32px';
        img.style.height = '32px';

        const logoAnchor = img.closest('a');
        if (logoAnchor) {
          logoAnchor.style.display = 'flex';
          logoAnchor.style.flexDirection = 'column';
          logoAnchor.style.alignItems = 'center';
          let label = logoAnchor.querySelector('.crafto-label');
          if (!label) {
            label = document.createElement('span');
            label.className = 'crafto-label';
            label.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:0.15em;color:#006A4E;margin-top:2px';
            label.textContent = 'CRAFTO';
            logoAnchor.appendChild(label);
          }
        }
      }
    } else {
      header?.classList.add('fixed', 'top-0');
      if (burger) burger.style.display = '';
      document.querySelectorAll('header nav .flex.items-center.gap-4').forEach(el => el.style.display = '');
      if (img && img.dataset.originalSrc) {
        img.src = img.dataset.originalSrc;
        delete img.dataset.originalSrc;
        img.className = 'h-6 md:h-9';
        img.style.width = '';
        img.style.height = '';

        const logoAnchor = img.closest('a');
        if (logoAnchor) {
          logoAnchor.style.display = '';
          logoAnchor.style.flexDirection = '';
          logoAnchor.style.alignItems = '';
          const label = logoAnchor.querySelector('.crafto-label');
          if (label) label.remove();
        }
      }
    }
  }
  setupMobileLayout();
  window.addEventListener('resize', setupMobileLayout);

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
