import { getProducts } from './api.js';
import { addToCart, showToast } from './main.js';

const grid = document.getElementById('home-product-grid');

async function loadHome() {
  const products = await getProducts({ featured: true, limit: 5 });
  if (!products.length) {
    grid.innerHTML = '<p class="md:col-span-12 text-center text-on-surface-variant py-12">No featured products yet.</p>';
    return;
  }

  // Bento layout: first is large (col-span-8), second is side (col-span-4),
  // remaining three are col-span-4 each in a row
  const [a, b, c, d, e] = products;

  grid.innerHTML = `
    ${bentoLarge(a)}
    ${bentoSide(b)}
    ${bentoSmall(c)}
    ${bentoTall(d)}
    ${bentoCard(e)}
  `;

  grid.querySelectorAll('.home-add-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const title = btn.dataset.title;
      const price = parseFloat(btn.dataset.price);
      addToCart(id, title, price);
      showToast(`${title} added to cart!`);
    });
  });
}

function discPrice(price, pct) {
  const d = parseInt(pct) || 0;
  return d > 0 ? Math.round(price * (1 - d / 100)) : price;
}

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str ?? '';
  return el.innerHTML;
}

function bentoLarge(p) {
  if (!p) return '';
  const fp = discPrice(p.price, p.discount_percent);
  const img = p.image_url || 'https://placehold.co/600x450?text=Crafto';
  return `
    <div class="md:col-span-8 group bento-item">
      <div class="relative overflow-hidden rounded-xl premium-shadow aspect-[16/9] bg-surface-container-low">
        <div class="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border border-metallic-gold/20 shadow-sm">
          <span class="material-symbols-outlined text-metallic-gold text-lg" data-icon="verified" data-weight="fill">verified</span>
          <span class="text-label-caps font-label-caps text-deep-emerald">Made in Pakistan</span>
        </div>
        <img class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="${img}" alt="${esc(p.title)}" loading="lazy" />
        <div class="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end text-white">
          ${p.category ? `<span class="font-label-caps text-label-caps text-metallic-gold mb-2">${esc(p.category)}</span>` : ''}
          <h3 class="font-headline-md text-headline-md mb-4">${esc(p.title)}</h3>
          ${p.description ? `<p class="text-sm mb-4 line-clamp-2">${esc(p.description)}</p>` : ''}
          <div class="flex items-center justify-between">
            <span class="font-body-lg text-headline-md">PKR ${fp.toLocaleString()}</span>
            <button class="home-add-cart bg-deep-emerald text-white px-8 py-3 rounded-full font-label-caps text-label-caps active:scale-95 transition-transform hover:bg-primary-container"
              data-id="${p.id}" data-title="${esc(p.title)}" data-price="${fp}">Add to Cart</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bentoSide(p) {
  if (!p) return '';
  const fp = discPrice(p.price, p.discount_percent);
  const img = p.image_url || 'https://placehold.co/600x450?text=Crafto';
  return `
    <div class="md:col-span-4 group bento-item">
      <div class="bg-white rounded-xl premium-shadow overflow-hidden flex flex-col h-full border border-surface-variant/50">
        <div class="relative aspect-square">
          <div class="absolute top-3 right-3 z-10 w-10 h-10 rounded-full badge-shimmer flex items-center justify-center border-2 border-white/50 shadow-md">
            <span class="material-symbols-outlined text-white text-sm" data-icon="star" data-weight="fill">star</span>
          </div>
          <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${img}" alt="${esc(p.title)}" loading="lazy" />
        </div>
        <div class="p-6 flex flex-col gap-4">
          <div>
            ${p.category ? `<span class="font-label-caps text-[10px] tracking-widest text-on-surface-variant uppercase">${esc(p.category)}</span>` : ''}
            <h3 class="font-headline-md text-deep-emerald mt-1">${esc(p.title)}</h3>
          </div>
          <div class="flex items-center justify-between border-t border-outline-variant/20 pt-4">
            <span class="text-deep-emerald font-semibold">PKR ${fp.toLocaleString()}</span>
            <button class="home-add-cart material-symbols-outlined text-metallic-gold cursor-pointer" data-icon="add_shopping_cart"
              data-id="${p.id}" data-title="${esc(p.title)}" data-price="${fp}">add_shopping_cart</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bentoSmall(p) {
  if (!p) return '';
  const fp = discPrice(p.price, p.discount_percent);
  const img = p.image_url || 'https://placehold.co/600x450?text=Crafto';
  return `
    <div class="md:col-span-4 group bento-item">
      <div class="bg-white rounded-xl premium-shadow p-4 border border-surface-variant/50">
        <div class="relative rounded-lg overflow-hidden aspect-[4/5] mb-4">
          <div class="absolute top-2 left-2 z-10">
            <div class="bg-deep-emerald text-white px-3 py-1 rounded-full text-[10px] font-bold">${p.category ? esc(p.category).toUpperCase() : 'HERITAGE'}</div>
          </div>
          <img class="w-full h-full object-cover" src="${img}" alt="${esc(p.title)}" loading="lazy" />
        </div>
        <h4 class="font-headline-md text-xl text-charcoal-text mb-1">${esc(p.title)}</h4>
        <p class="text-metallic-gold font-bold mb-4">PKR ${fp.toLocaleString()}</p>
        <a href="./product.html?id=${p.id}" class="block w-full py-3 border border-deep-emerald text-deep-emerald rounded-full font-label-caps text-label-caps text-center hover:bg-deep-emerald hover:text-white transition-colors">Discover Details</a>
      </div>
    </div>
  `;
}

function bentoTall(p) {
  if (!p) return '';
  const fp = discPrice(p.price, p.discount_percent);
  const img = p.image_url || 'https://placehold.co/600x450?text=Crafto';
  return `
    <div class="md:col-span-4 group bento-item">
      <div class="bg-cream-canvas rounded-xl border border-metallic-gold/20 overflow-hidden flex flex-col relative h-full">
        <div class="absolute top-4 right-4 z-10 rotate-12">
          <div class="bg-metallic-gold text-white font-label-caps text-[10px] px-2 py-0.5 rounded-sm">Hand-Crafted</div>
        </div>
        <img class="w-full h-[320px] object-cover" src="${img}" alt="${esc(p.title)}" loading="lazy" />
        <div class="p-6">
          <h4 class="font-headline-md text-deep-emerald mb-2">${esc(p.title)}</h4>
          ${p.description ? `<p class="text-on-surface-variant font-body-md line-clamp-2 mb-4">${esc(p.description)}</p>` : ''}
          <div class="flex items-center justify-between">
            <span class="text-headline-md text-charcoal-text">PKR ${fp.toLocaleString()}</span>
            <button class="home-add-cart bg-deep-emerald w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-all"
              data-id="${p.id}" data-title="${esc(p.title)}" data-price="${fp}">
              <span class="material-symbols-outlined" data-icon="shopping_basket">shopping_basket</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bentoCard(p) {
  if (!p) return '';
  const fp = discPrice(p.price, p.discount_percent);
  const img = p.image_url || 'https://placehold.co/600x450?text=Crafto';
  return `
    <div class="md:col-span-4 group bento-item">
      <div class="bg-white rounded-xl premium-shadow overflow-hidden flex flex-col h-full border border-surface-variant/50">
        <div class="relative flex-1">
          <div class="absolute inset-0 bg-deep-emerald/5 mix-blend-overlay"></div>
          <img class="w-full h-full object-cover" src="${img}" alt="${esc(p.title)}" loading="lazy" />
        </div>
        <div class="p-6 text-center">
          <h4 class="font-headline-md text-deep-emerald mb-1">${esc(p.title)}</h4>
          <p class="text-metallic-gold font-bold mb-4">PKR ${fp.toLocaleString()}</p>
          <div class="flex gap-2">
            <button class="home-add-cart flex-1 py-2 bg-deep-emerald text-white rounded-full font-label-caps text-label-caps text-[10px]"
              data-id="${p.id}" data-title="${esc(p.title)}" data-price="${fp}">Add To Cart</button>
            <a href="./product.html?id=${p.id}" class="w-10 h-10 border border-outline-variant rounded-full flex items-center justify-center text-on-surface-variant">
              <span class="material-symbols-outlined text-sm" data-icon="favorite">favorite</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

loadHome();
