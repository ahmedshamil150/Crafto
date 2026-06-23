// src/js/cart.js
import { updateCartBadge, showToast } from './main.js';

const cartItemsEl  = document.getElementById('cart-items');
const cartSummaryEl = document.getElementById('cart-summary');
const checkoutBtn  = document.getElementById('checkout-btn');

function getCart() { return JSON.parse(localStorage.getItem('crafto_cart') || '[]'); }
function saveCart(cart) { localStorage.setItem('crafto_cart', JSON.stringify(cart)); }

function render() {
  const cart = getCart();
  updateCartBadge();

  if (!cart.length) {
    cartItemsEl.innerHTML = '<p>Your cart is empty. <a href="./shop.html">Continue shopping</a></p>';
    cartSummaryEl.innerHTML = '';
    if (checkoutBtn) checkoutBtn.style.display = 'none';
    return;
  }

  cartItemsEl.innerHTML = cart.map((item, i) => `
    <div class="cart-row">
      <div style="flex:1;">
        <strong>${item.title}</strong><br/>
        <span>PKR ${Number(item.price).toLocaleString()} × ${item.qty}</span>
      </div>
      <div class="cart-controls">
        <button class="button" onclick="changeQty(${i}, -1)">−</button>
        <span>${item.qty}</span>
        <button class="button" onclick="changeQty(${i}, 1)">+</button>
        <button onclick="removeItem(${i})" class="remove-btn">✕</button>
      </div>
    </div>
  `).join('');

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  cartSummaryEl.innerHTML = `<p class="cart-total">Total: PKR ${total.toLocaleString()}</p>`;
  if (checkoutBtn) checkoutBtn.style.display = 'inline-block';
}

window.changeQty = (index, delta) => {
  const cart = getCart();
  cart[index].qty = Math.max(1, cart[index].qty + delta);
  saveCart(cart); render();
};

window.removeItem = (index) => {
  const cart = getCart();
  const title = cart[index].title;
  cart.splice(index, 1);
  saveCart(cart); render();
  showToast(`${title} removed.`, 'error');
};

render();
