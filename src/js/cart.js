// src/js/cart.js
// Renders the cart page from localStorage

const cartItemsEl = document.getElementById('cart-items');
const cartSummaryEl = document.getElementById('cart-summary');
const checkoutBtn = document.getElementById('checkout-btn');

function getCart() {
  return JSON.parse(localStorage.getItem('crafto_cart') || '[]');
}

function saveCart(cart) {
  localStorage.setItem('crafto_cart', JSON.stringify(cart));
}

function render() {
  const cart = getCart();
  if (!cart.length) {
    cartItemsEl.innerHTML = '<p>Your cart is empty. <a href="./shop.html">Continue shopping</a></p>';
    cartSummaryEl.innerHTML = '';
    if (checkoutBtn) checkoutBtn.style.display = 'none';
    return;
  }

  cartItemsEl.innerHTML = cart.map((item, i) => `
    <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 0;border-bottom:1px solid #eee;">
      <div style="flex:1;">
        <strong>${item.title}</strong><br/>
        <span>PKR ${Number(item.price).toLocaleString()} × ${item.qty}</span>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <button class="button" onclick="changeQty(${i}, -1)" style="padding:0.25rem 0.6rem;">−</button>
        <span>${item.qty}</span>
        <button class="button" onclick="changeQty(${i}, 1)" style="padding:0.25rem 0.6rem;">+</button>
        <button onclick="removeItem(${i})" style="background:none;border:none;color:red;cursor:pointer;font-size:1.2rem;">✕</button>
      </div>
    </div>
  `).join('');

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  cartSummaryEl.innerHTML = `<p style="margin-top:1rem;font-size:1.2rem;"><strong>Total: PKR ${total.toLocaleString()}</strong></p>`;
  if (checkoutBtn) checkoutBtn.style.display = 'inline-block';
}

window.changeQty = (index, delta) => {
  const cart = getCart();
  cart[index].qty = Math.max(1, cart[index].qty + delta);
  saveCart(cart);
  render();
};

window.removeItem = (index) => {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  render();
};

render();
