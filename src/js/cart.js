import { updateCartBadge, showToast } from './main.js';
import { getProductById, getProductVariants } from './api.js';

const cartItemsEl  = document.getElementById('cart-items');
const cartSidebar  = document.getElementById('cart-sidebar');
const cartEmpty    = document.getElementById('cart-empty');
const cartContent  = document.getElementById('cart-content');
const cartCount    = document.getElementById('cart-count');

function getCart() { return JSON.parse(localStorage.getItem('crafto_cart') || '[]'); }
function saveCart(cart) { localStorage.setItem('crafto_cart', JSON.stringify(cart)); }
function esc(str) { const el = document.createElement('span'); el.textContent = str ?? ''; return el.innerHTML; }

function render() {
  const cart = getCart();
  updateCartBadge();

  if (!cart.length) {
    cartEmpty.classList.remove('hidden');
    cartContent.classList.add('hidden');
    return;
  }

  cartEmpty.classList.add('hidden');
  cartContent.classList.remove('hidden');

  cartCount.textContent = `${cart.reduce((s, i) => s + i.qty, 0)} item${cart.length > 1 ? 's' : ''} in your cart`;

  cartItemsEl.innerHTML = cart.map((item, i) => `
    <div class="cart-item bg-white rounded-xl p-4 md:p-5 shadow-sm border border-outline-variant/10 flex items-center gap-4 transition-all hover:shadow-md" data-index="${i}">
      <div class="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0 overflow-hidden">
        ${item.image ? `<img src="${item.image}" alt="" class="w-full h-full object-cover" />` : `<span class="material-symbols-outlined text-2xl text-deep-emerald/40">inventory_2</span>`}
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-headline-md text-sm md:text-base text-charcoal-text truncate">${item.title}</h3>
        ${item.variant_label ? '<p class="font-label-caps text-[10px] text-on-surface-variant mt-0.5">' + esc(item.variant_label) + '</p>' : ''}
        <p class="font-body-md text-deep-emerald font-semibold text-sm mt-0.5">PKR ${Number(item.price).toLocaleString()}</p>
      </div>
      <div class="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <div class="flex items-center border border-outline-variant/30 rounded-lg overflow-hidden">
          <button class="cart-qty-btn px-2.5 py-2 text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-95 text-sm leading-none" data-action="dec">−</button>
          <span class="px-3 py-2 font-body-md text-sm text-charcoal-text min-w-[2rem] text-center border-x border-outline-variant/30">${item.qty}</span>
          <button class="cart-qty-btn px-2.5 py-2 text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-95 text-sm leading-none" data-action="inc">+</button>
        </div>
        <p class="font-body-md text-sm text-charcoal-text font-semibold min-w-[5rem] text-right hidden md:block">PKR ${(item.price * item.qty).toLocaleString()}</p>
        <button class="cart-remove w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-red-50 hover:text-red-500 transition-all active:scale-90" data-action="remove" title="Remove item">
          <span class="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
    </div>
  `).join('');

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  cartSidebar.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden sticky top-28">
      <div class="bg-deep-emerald px-5 py-4">
        <h3 class="font-label-caps text-label-caps text-white uppercase tracking-wider">Order Summary</h3>
      </div>
      <div class="p-5 space-y-4">
        <div class="space-y-2">
          ${cart.map(i => `
            <div class="flex justify-between text-sm text-on-surface-variant">
              <span class="truncate">${i.title}${i.variant_label ? ' (' + esc(i.variant_label) + ')' : ''} × ${i.qty}</span>
              <span class="font-medium text-charcoal-text whitespace-nowrap ml-2">PKR ${(i.price * i.qty).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
        <hr class="border-outline-variant/20" />
        <div class="flex justify-between font-headline-md text-headline-md text-deep-emerald">
          <span>Subtotal</span><span>PKR ${subtotal.toLocaleString()}</span>
        </div>
        <p class="text-xs text-on-surface-variant/70">Shipping & taxes calculated at checkout</p>
        <a href="./checkout.html" class="btn-shine flex items-center justify-center gap-2 w-full px-5 py-3 bg-deep-emerald text-white rounded-lg font-label-caps text-label-caps hover:bg-primary transition-all active:scale-[0.97] text-sm">
          Proceed to Checkout <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </a>
        <a href="./shop.html" class="flex items-center justify-center gap-1 w-full px-5 py-2.5 border border-outline/30 text-on-surface-variant rounded-lg font-label-caps text-label-caps hover:bg-surface-container-low transition-all text-sm">
          <span class="material-symbols-outlined text-sm">arrow_back</span> Continue Shopping
        </a>
      </div>
    </div>
  `;
}

// Event delegation for cart item actions
cartItemsEl.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const item = btn.closest('.cart-item');
  if (!item) return;
  const index = parseInt(item.dataset.index, 10);
  const cart = getCart();
  if (index < 0 || index >= cart.length) return;

  const action = btn.dataset.action;

  if (action === 'inc') {
    (async () => {
      const item = cart[index];
      if (item.variant_id) {
        const variants = await getProductVariants(item.id);
        const match = variants.find(v => v.id === item.variant_id);
        const stock = match ? match.stock : 0;
        if (item.qty >= stock) {
          showToast(`Only ${stock} in stock for this variant`, 'error');
          return;
        }
        item.qty += 1;
        saveCart(cart); render();
      } else {
        const prod = await getProductById(item.id);
        const stock = prod?.stock ?? Infinity;
        if (item.qty >= stock) {
          showToast(`Only ${stock} in stock`, 'error');
          return;
        }
        item.qty += 1;
        saveCart(cart); render();
      }
    })();
  } else if (action === 'dec') {
    if (cart[index].qty > 1) {
      cart[index].qty -= 1;
      saveCart(cart); render();
    }
  } else if (action === 'remove') {
    const title = cart[index].title;
    cart.splice(index, 1);
    saveCart(cart); render();
    showToast(`${title} removed.`, 'error');
  }
});

render();
