import { getProducts, getActiveHeroImage } from './api.js';
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

  // Text pressure effect on hero heading (desktop only)
  const pressureEl = document.getElementById('hero-pressure');
  if (pressureEl && window.innerWidth >= 768) {
    initTextPressure(pressureEl);
  }

  document.dispatchEvent(new CustomEvent('page-ready'));
}

function initTextPressure(el) {
  const text = el.textContent;
  el.innerHTML = '';
  el.style.display = 'flex';
  el.style.justifyContent = 'center';
  el.style.flexWrap = 'wrap';
  el.style.fontFamily = "'Roboto Flex', sans-serif";
  el.style.fontWeight = '100';
  el.style.whiteSpace = 'nowrap';
  el.style.userSelect = 'none';

  const spans = text.split('').map(char => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.style.display = 'inline-block';
    el.appendChild(span);
    return span;
  });

  const mouse = { x: 0, y: 0 };
  const cursor = { x: 0, y: 0 };

  const rect = el.getBoundingClientRect();
  mouse.x = rect.left + rect.width / 2;
  mouse.y = rect.top + rect.height / 2;
  cursor.x = mouse.x;
  cursor.y = mouse.y;

  const onMove = e => { cursor.x = e.clientX; cursor.y = e.clientY; };
  const onResize = () => {
    const r = el.getBoundingClientRect();
    mouse.x = r.left + r.width / 2;
    mouse.y = r.top + r.height / 2;
    cursor.x = mouse.x;
    cursor.y = mouse.y;
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('resize', onResize);

  function animate() {
    mouse.x += (cursor.x - mouse.x) / 15;
    mouse.y += (cursor.y - mouse.y) / 15;

    const elRect = el.getBoundingClientRect();
    const maxDist = elRect.width / 2;

    spans.forEach(span => {
      const spanRect = span.getBoundingClientRect();
      const cx = spanRect.left + spanRect.width / 2;
      const cy = spanRect.top + spanRect.height / 2;
      const d = Math.sqrt((mouse.x - cx) ** 2 + (mouse.y - cy) ** 2);
      const wdth = Math.round(Math.max(25, 151 - (151 * d) / maxDist));
      const wght = Math.round(Math.max(100, 900 - (900 * d) / maxDist));
      const ital = Math.max(0, Math.min(1, 1 - d / maxDist)).toFixed(2);
      span.style.fontVariationSettings = `'wght' ${wght}, 'wdth' ${wdth}, 'ital' ${ital}`;
    });

    requestAnimationFrame(animate);
  }

  animate();
}

loadHome();
