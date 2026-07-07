import { getWishlist, removeFromWishlist, addToCart, showToast } from './main.js';

const grid = document.getElementById('wishlist-grid');

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str ?? '';
  return el.innerHTML;
}

function render() {
  const items = getWishlist();

  if (!items.length) {
    grid.innerHTML = `
      <div class="md:col-span-full text-center py-16">
        <span class="material-symbols-outlined text-6xl text-on-surface-variant/30" data-icon="favorite">favorite</span>
        <p class="text-on-surface-variant mt-4 text-lg">Your wishlist is empty.</p>
        <a href="./shop" class="inline-block mt-6 bg-deep-emerald text-white px-8 py-3 rounded-full font-label-caps text-label-caps hover:bg-primary-container transition-all">Browse Products</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(item => `
    <div class="group relative bg-white rounded-xl overflow-hidden shadow-sm border border-outline-variant/10" data-id="${item.id}">
      <div class="relative aspect-[1/1] md:aspect-[4/5] overflow-hidden">
        <a href="./product?id=${item.id}">
          <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="${item.image || 'https://placehold.co/600x450?text=Crafto'}" alt="${esc(item.title)}" loading="lazy" />
        </a>
        <button class="absolute top-1.5 right-1.5 md:top-3 md:right-3 w-6 h-6 md:w-9 md:h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-red-500 shadow-md hover:scale-110 transition-transform remove-wishlist" data-id="${item.id}">
          <span class="material-symbols-outlined text-[11px] md:text-sm" data-icon="close">close</span>
        </button>
      </div>
      <div class="p-2.5 md:p-5 text-center">
        <h3 class="text-xs md:text-headline-md text-charcoal-text leading-tight truncate">${esc(item.title)}</h3>
        <p class="text-xs md:text-lg text-deep-emerald font-semibold mt-0.5 md:mt-2">PKR ${Number(item.price).toLocaleString()}</p>
        <div class="mt-1.5 md:mt-4 flex flex-col md:flex-row gap-1.5 md:gap-2">
          <button class="w-full md:flex-1 px-3 md:px-5 py-1.5 md:py-2 bg-deep-emerald text-white rounded-full font-label-caps text-[10px] hover:bg-primary transition-colors add-cart-wishlist" data-id="${item.id}" data-title="${esc(item.title)}" data-price="${item.price}" data-image="${item.image || ''}">Add to Cart</button>
          <a href="./product?id=${item.id}" class="w-full md:flex-none px-3 py-1.5 md:px-4 md:py-2 border border-outline-variant rounded-full text-on-surface-variant hover:border-deep-emerald hover:text-deep-emerald transition-colors flex items-center justify-center gap-1 font-label-caps text-[10px]">
            <span class="material-symbols-outlined text-xs md:text-sm" data-icon="visibility">visibility</span> View
          </a>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.remove-wishlist').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromWishlist(btn.dataset.id);
      btn.closest('.group')?.remove();
      if (!getWishlist().length) render();
    });
  });

  grid.querySelectorAll('.add-cart-wishlist').forEach(btn => {
    btn.addEventListener('click', () => {
      addToCart(btn.dataset.id, btn.dataset.title, parseFloat(btn.dataset.price), 1, '', '', btn.dataset.image || '');
    });
  });
}

render();
