import { getProducts, getActiveHeroImage, getCardProducts } from './api.js';
import { addToCart, showToast, isInWishlist, toggleWishlist } from './main.js';

const grid = document.getElementById('home-product-grid');

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str ?? '';
  return el.innerHTML;
}

function discPrice(price, pct) {
  const d = parseInt(pct) || 0;
  return d > 0 ? Math.round(price * (1 - d / 100)) : price;
}

function productCard(p) {
  if (!p) return '';
  const fp = discPrice(p.price, p.discount_percent);
  const img = p.image_url || 'https://placehold.co/600x450?text=Crafto';
  const inWl = isInWishlist(p.id);
  return `
    <div class="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-outline-variant/10">
      <div class="relative aspect-[4/5] overflow-hidden">
        <a href="./product.html?id=${p.id}">
          <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${img}" alt="${esc(p.title)}" loading="lazy" />
        </a>
        <button class="home-wishlist absolute top-2 left-2 md:top-3 md:left-3 z-10 w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:scale-110 transition-transform ${inWl ? 'text-red-500' : 'text-on-surface-variant'}"
          data-id="${p.id}" data-title="${esc(p.title)}" data-price="${fp}" data-image="${img}">
          <span class="material-symbols-outlined text-xs md:text-sm" data-icon="${inWl ? 'favorite' : 'favorite_border'}">${inWl ? 'favorite' : 'favorite_border'}</span>
        </button>
        <div class="absolute top-2 right-2 md:top-3 md:right-3 z-10 made-in-pakistan-badge text-white text-[10px] px-3 py-1 rounded-full font-label-caps uppercase tracking-wider" style="display:none;" id="badge-${p.id}">Authentic</div>
      </div>
      <div class="p-3 md:p-6 text-center">
        <span class="hidden md:block text-metallic-gold font-label-caps text-[10px] tracking-widest uppercase mb-1 md:mb-2">${p.category ? esc(p.category) : 'Heritage'}</span>
        <h3 class="font-headline-md text-xs md:text-headline-md text-charcoal-text mb-1 md:mb-2 leading-tight">${esc(p.title)}</h3>
        <p class="text-sm md:text-body-lg text-deep-emerald font-semibold">PKR ${fp.toLocaleString()}</p>
        <div class="mt-2 md:mt-4 flex flex-row gap-1.5 md:gap-2 justify-center">
          <a href="./product.html?id=${p.id}" class="flex-1 md:flex-none px-3 md:px-6 py-1.5 md:py-2 border border-deep-emerald text-deep-emerald font-label-caps text-[10px] rounded hover:bg-deep-emerald hover:text-white transition-colors text-center">View</a>
          <button class="home-add-cart btn-shine flex-none md:flex-none w-8 h-8 md:w-auto md:px-5 md:py-2 bg-deep-emerald text-white rounded-full font-label-caps text-[10px] hover:bg-primary transition-colors flex items-center justify-center"
            data-id="${p.id}" data-title="${esc(p.title)}" data-price="${fp}"><span class="material-symbols-outlined text-sm md:hidden">shopping_bag</span><span class="hidden md:inline">Add to Cart</span></button>
        </div>
      </div>
    </div>
  `;
}

async function loadHome() {
  const products = await getProducts({ featured: true, limit: 6 });
  if (!products.length) {
    grid.innerHTML = '<p class="col-span-full text-center text-on-surface-variant py-12">No featured products yet.</p>';
    return;
  }

  grid.innerHTML = products.map(p => productCard(p)).join('');

  grid.querySelectorAll('.home-add-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      addToCart(btn.dataset.id, btn.dataset.title, parseFloat(btn.dataset.price));
      showToast(`${btn.dataset.title} added to cart!`);
    });
  });

  grid.querySelectorAll('.home-wishlist').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, title, price, image } = btn.dataset;
      toggleWishlist(id, title, price, image);
      const icon = btn.querySelector('.material-symbols-outlined');
      const isNow = isInWishlist(id);
      btn.classList.toggle('text-red-500', isNow);
      btn.classList.toggle('text-on-surface-variant', !isNow);
      icon.textContent = isNow ? 'favorite' : 'favorite_border';
      icon.dataset.icon = isNow ? 'favorite' : 'favorite_border';
    });
  });

  // Load hero image from DB
  try {
    const hero = await getActiveHeroImage();
    if (hero) {
      const bgEl = document.getElementById('hero-bg');
      if (bgEl) {
        bgEl.style.backgroundImage = `url('${hero.image_url}')`;
        // Switch to mobile image on small screens if available
        if (hero.mobile_image_url) {
          const mq = window.matchMedia('(max-width: 767px)');
          function updateHeroBg(e) {
            bgEl.style.backgroundImage = e.matches ? `url('${hero.mobile_image_url}')` : `url('${hero.image_url}')`;
          }
          mq.addEventListener('change', updateHeroBg);
          updateHeroBg(mq);
        }
      }
    }
  } catch (e) { /* fall back to default hero */ }

  // Show "Authentic" badge only for the first card
  if (products[0]) {
    const badge = document.getElementById(`badge-${products[0].id}`);
    if (badge) badge.style.display = '';
  }

  // Rotating text effect for hero heading
  initRotatingText();

  // Card products — scroll stack
  await renderCardProducts();

  document.dispatchEvent(new CustomEvent('page-ready'));
}

function initRotatingText() {
  const el = document.getElementById('hero-rotating');
  if (!el) return;

  const texts = ['Love', 'Passion', 'Heritage', 'Tradition'];
  let currentIndex = 0;
  let intervalId = null;

  function animateTo(text) {
    const chars = Array.from(text);
    el.innerHTML = '';
    el.style.display = 'inline-flex';
    el.style.gap = '0';
    el.style.willChange = 'transform';

    const spans = chars.map((char, i) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.display = 'inline-block';
      span.style.transform = 'translateY(100%)';
      span.style.opacity = '0';
      span.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out';
      span.style.transitionDelay = `${i * 0.025}s`;
      span.style.willChange = 'transform, opacity';
      el.appendChild(span);
      requestAnimationFrame(() => {
        span.style.transform = 'translateY(0)';
        span.style.opacity = '1';
      });
      return span;
    });

    return spans;
  }

  function animateOut(spans) {
    spans.forEach((span, i) => {
      span.style.transform = 'translateY(-30%)';
      span.style.opacity = '0';
      span.style.transition = 'transform 0.25s ease-in, opacity 0.2s ease-in';
      span.style.transitionDelay = `${i * 0.02}s`;
    });
  }

  function next() {
    const prevSpans = el.querySelectorAll('span');
    const prevCount = prevSpans.length;

    const totalDelay = prevCount * 0.02 + 200;
    if (prevSpans.length) {
      animateOut(prevSpans);
    }

    setTimeout(() => {
      currentIndex = (currentIndex + 1) % texts.length;
      animateTo(texts[currentIndex]);
    }, totalDelay);
  }

  animateTo(texts[0]);
  intervalId = setInterval(next, 2800);

  el.addEventListener('mouseenter', () => { if (intervalId) clearInterval(intervalId); intervalId = null; });
  el.addEventListener('mouseleave', () => { if (!intervalId) intervalId = setInterval(next, 2800); });
}

async function renderCardProducts() {
  const section = document.getElementById('card-products-section');
  const container = document.getElementById('card-stack-container');
  if (!section || !container) return;

  const cards = await getCardProducts();
  if (!cards.length) return;

  section.style.display = '';
  container.innerHTML = cards.map(c => {
    const bg = c.image_url ? `url('${c.image_url}')` : c.card_color || '#006A4E';
    const color = c.card_color || '#006A4E';
    return `
      <div class="card-stack-item" style="background:${bg};background-size:cover;background-position:center;">
        <div class="card-stack-content">
          <h3>${esc(c.title)}</h3>
          ${c.subtitle ? '<p>' + esc(c.subtitle) + '</p>' : ''}
          ${c.price ? '<span class="card-price" style="background:' + color + ';">PKR ' + Number(c.price).toLocaleString() + '</span>' : ''}
        </div>
      </div>
    `;
  }).join('');

  // Scroll-stack scale effect
  function updateCardScales() {
    const items = container.querySelectorAll('.card-stack-item');
    const stackTop = window.innerWidth < 768 ? 80 : 100;
    const viewH = window.innerHeight;
    items.forEach(card => {
      const rect = card.getBoundingClientRect();
      const cardMid = rect.top + rect.height / 2;
      const progress = Math.max(0, Math.min(1, (cardMid - stackTop) / (viewH - stackTop)));
      const scale = 0.88 + (1 - 0.88) * progress;
      const opacity = 0.7 + 0.3 * progress;
      card.style.transform = `scale(${scale})`;
      card.style.opacity = opacity;
    });
    requestAnimationFrame(updateCardScales);
  }

  // Start after fonts/images settle
  setTimeout(() => requestAnimationFrame(updateCardScales), 500);

  // Re-trigger on orientation/resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => requestAnimationFrame(updateCardScales), 200);
  });
}

loadHome();
