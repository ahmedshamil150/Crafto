// src/js/admin.js
import {
  getProducts, getOrders, createProduct, updateProduct, deleteProduct, updateOrderStatus,
  getAllReviews, deleteReview, setReviewPinned,
} from './api.js';

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str ?? '';
  return el.innerHTML;
}

function stars(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

const ADMIN_USERS = {
  [import.meta.env.VITE_ADMIN_USER1 || 'admin1']: import.meta.env.VITE_ADMIN_PASS1 || 'pass1',
  [import.meta.env.VITE_ADMIN_USER2 || 'admin2']: import.meta.env.VITE_ADMIN_PASS2 || 'pass2',
  [import.meta.env.VITE_ADMIN_USER3 || 'admin3']: import.meta.env.VITE_ADMIN_PASS3 || 'pass3',
};

const isLoginPage = document.getElementById('admin-login-form') !== null;

// --- Auth guard ---
if (!isLoginPage && !sessionStorage.getItem('crafto_admin')) {
  window.location.href = './login.html';
}

// --- Login ---
document.getElementById('admin-login-form')?.addEventListener('submit', e => {
  e.preventDefault();
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value;
  if (ADMIN_USERS[user] && ADMIN_USERS[user] === pass) {
    sessionStorage.setItem('crafto_admin', user);
    window.location.href = './dashboard.html';
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
});

// --- Logout ---
document.getElementById('logout-btn')?.addEventListener('click', e => {
  e.preventDefault();
  sessionStorage.removeItem('crafto_admin');
  window.location.href = './login.html';
});

// --- Dashboard stats ---
if (document.getElementById('stat-products')) {
  (async () => {
    const [products, orders] = await Promise.all([getProducts(), getOrders()]);
    document.getElementById('stat-products').textContent = products.length;
    document.getElementById('stat-orders').textContent = orders.filter(o => o.status === 'pending').length;
    const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    document.getElementById('stat-revenue').textContent = `PKR ${revenue.toLocaleString()}`;
  })();
}

// --- Products CRUD ---
const productsTable = document.getElementById('products-table');
if (productsTable) {
  // Inject modal HTML
  document.body.insertAdjacentHTML('beforeend', `
    <div id="product-modal" class="modal-overlay" style="display:none;">
      <div class="modal-box">
        <h3 id="modal-title">Add Product</h3>
        <form id="product-form">
          <input type="hidden" id="p-id" />
          <label>Title *<input id="p-title" type="text" required /></label>
          <label>Description<textarea id="p-desc" rows="3"></textarea></label>
          <label>Price (PKR) *<input id="p-price" type="number" min="0" step="0.01" required /></label>
          <label>Category<input id="p-category" type="text" placeholder="e.g. pottery, textiles" /></label>
          <label>Stock<input id="p-stock" type="number" min="0" value="0" /></label>
          <label>Image URL 1 *<input id="p-img1" type="url" placeholder="https://..." required /></label>
          <label>Image URL 2<input id="p-img2" type="url" placeholder="https://..." /></label>
          <label>Image URL 3<input id="p-img3" type="url" placeholder="https://..." /></label>
          <div class="modal-actions">
            <button type="button" id="modal-cancel" class="button" style="background:#999;">Cancel</button>
            <button type="submit" class="button" id="modal-save">Save</button>
          </div>
          <p id="modal-error" style="color:red;display:none;margin-top:0.5rem;"></p>
        </form>
      </div>
    </div>
  `);

  const modal     = document.getElementById('product-modal');
  const modalForm = document.getElementById('product-form');

  function openModal(product = null) {
    document.getElementById('modal-title').textContent = product ? 'Edit Product' : 'Add Product';
    document.getElementById('p-id').value       = product?.id || '';
    document.getElementById('p-title').value    = product?.title || '';
    document.getElementById('p-desc').value     = product?.description || '';
    document.getElementById('p-price').value    = product?.price || '';
    document.getElementById('p-category').value = product?.category || '';
    document.getElementById('p-stock').value    = product?.stock ?? 0;
    document.getElementById('p-img1').value     = product?.image_url || '';
    document.getElementById('p-img2').value     = product?.image_url_2 || '';
    document.getElementById('p-img3').value     = product?.image_url_3 || '';
    document.getElementById('modal-error').style.display = 'none';
    modal.style.display = 'flex';
  }

  document.getElementById('modal-cancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

  document.getElementById('add-product-btn').addEventListener('click', () => openModal());

  modalForm.addEventListener('submit', async e => {
    e.preventDefault();
    const saveBtn = document.getElementById('modal-save');
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';

    const id = document.getElementById('p-id').value;
    const payload = {
      title:       document.getElementById('p-title').value.trim(),
      description: document.getElementById('p-desc').value.trim(),
      price:       parseFloat(document.getElementById('p-price').value),
      category:    document.getElementById('p-category').value.trim(),
      stock:       parseInt(document.getElementById('p-stock').value) || 0,
      image_url:   document.getElementById('p-img1').value.trim(),
      image_url_2: document.getElementById('p-img2').value.trim() || null,
      image_url_3: document.getElementById('p-img3').value.trim() || null,
    };

    try {
      if (id) await updateProduct(id, payload);
      else    await createProduct(payload);
      modal.style.display = 'none';
      loadProducts();
    } catch {
      document.getElementById('modal-error').textContent = 'Save failed. Check console.';
      document.getElementById('modal-error').style.display = 'block';
    }
    saveBtn.disabled = false; saveBtn.textContent = 'Save';
  });

  async function loadProducts() {
    productsTable.innerHTML = '<p>Loading…</p>';
    const products = await getProducts();
    if (!products.length) {
      productsTable.innerHTML = '<p>No products yet. Click "+ Add Product" to create one.</p>';
      return;
    }
    productsTable.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Image</th><th>Title</th><th>Price (PKR)</th><th>Stock</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p => `
            <tr data-id="${p.id}">
              <td><img src="${p.image_url || 'https://placehold.co/60x45?text=?'}" style="width:60px;height:45px;object-fit:cover;border-radius:4px;" /></td>
              <td>${p.title}</td>
              <td>${Number(p.price).toLocaleString()}</td>
              <td>${p.stock ?? 0}</td>
              <td class="action-cell">
                <button class="button edit-btn" data-id="${p.id}">Edit</button>
                <button class="button delete-btn" data-id="${p.id}" style="background:#c62828;">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    productsTable.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = products.find(x => x.id === btn.dataset.id);
        openModal(p);
      });
    });

    productsTable.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this product?')) return;
        await deleteProduct(btn.dataset.id);
        loadProducts();
      });
    });
  }

  loadProducts();
}

// --- Orders list ---
const ordersTable = document.getElementById('orders-table');
if (ordersTable) {
  (async () => {
    const orders = await getOrders();
    if (!orders.length) { ordersTable.innerHTML = '<p>No orders yet.</p>'; return; }
    ordersTable.innerHTML = `
      <table>
        <thead>
          <tr><th>Date</th><th>Customer</th><th>Phone</th><th>Address</th><th>Total (PKR)</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td>${new Date(o.created_at).toLocaleDateString('en-PK')}</td>
              <td>${o.customer_name || '–'}</td>
              <td>${o.customer_phone || '–'}</td>
              <td>${o.customer_address || '–'}</td>
              <td>${Number(o.total || 0).toLocaleString()}</td>
              <td>
                <select class="status-select" data-id="${o.id}">
                  ${['pending','confirmed','shipped','delivered','cancelled'].map(s =>
                    `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
                  ).join('')}
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    ordersTable.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        sel.disabled = true;
        try {
          await updateOrderStatus(sel.dataset.id, sel.value);
        } catch {
          alert('Failed to update status. Check Supabase UPDATE policy.');
        }
        sel.disabled = false;
      });
    });
  })();
}

// --- Revenue ---
const revenueContent = document.getElementById('revenue-content');
if (revenueContent) {
  (async () => {
    const orders = await getOrders();
    const active = orders.filter(o => o.status !== 'cancelled');

    const lines = [];
    const summary = new Map();

    for (const order of active) {
      const items = Array.isArray(order.items) ? order.items : [];
      const date = new Date(order.created_at).toLocaleDateString('en-PK');
      const orderShort = String(order.id).slice(0, 8);

      for (const item of items) {
        const price = Number(item.price) || 0;
        const qty = Number(item.qty) || 1;
        const lineTotal = price * qty;
        const title = item.title || 'Unknown product';

        lines.push({ date, orderShort, title, price, qty, lineTotal });

        const key = `${title}::${price}`;
        const row = summary.get(key) || { title, price, qty: 0, revenue: 0 };
        row.qty += qty;
        row.revenue += lineTotal;
        summary.set(key, row);
      }
    }

    const grandTotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const summaryRows = [...summary.values()].sort((a, b) => b.revenue - a.revenue);

    if (!lines.length) {
      revenueContent.innerHTML = '<p>No sales yet. Revenue appears when orders are placed.</p>';
      return;
    }

    revenueContent.innerHTML = `
      <div class="revenue-total-card">
        <h3>PKR ${grandTotal.toLocaleString()}</h3>
        <p>Total revenue (${active.length} order${active.length === 1 ? '' : 's'}, cancelled excluded)</p>
      </div>

      <h3 class="admin-subtitle">Sales Detail</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Order</th><th>Product</th><th>Unit Price</th><th>Qty</th><th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${lines.map(l => `
            <tr>
              <td>${l.date}</td>
              <td><code>${l.orderShort}</code></td>
              <td>${esc(l.title)}</td>
              <td>PKR ${l.price.toLocaleString()}</td>
              <td>${l.qty}</td>
              <td><strong>PKR ${l.lineTotal.toLocaleString()}</strong></td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="text-align:right;font-weight:600;">Grand Total</td>
            <td><strong>PKR ${grandTotal.toLocaleString()}</strong></td>
          </tr>
        </tfoot>
      </table>

      <h3 class="admin-subtitle">By Product &amp; Price</h3>
      <table>
        <thead>
          <tr>
            <th>Product</th><th>Unit Price</th><th>Qty Sold</th><th>Total Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRows.map(r => `
            <tr>
              <td>${esc(r.title)}</td>
              <td>PKR ${r.price.toLocaleString()}</td>
              <td>${r.qty}</td>
              <td><strong>PKR ${r.revenue.toLocaleString()}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  })();
}

// --- Reviews management ---
const reviewsTable = document.getElementById('reviews-table');
if (reviewsTable) {
  async function loadReviews() {
    reviewsTable.innerHTML = '<p>Loading…</p>';
    const reviews = await getAllReviews();

    if (!reviews.length) {
      reviewsTable.innerHTML = '<p>No reviews yet.</p>';
      return;
    }

    reviewsTable.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Product</th><th>Author</th><th>Rating</th><th>Review</th><th>Date</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${reviews.map(r => `
            <tr data-id="${r.id}">
              <td>
                ${r.pinned ? '<span class="pin-badge">Pinned</span><br/>' : ''}
                ${esc(r.products?.title || '–')}
              </td>
              <td>${esc(r.author_name)}</td>
              <td><span class="rating-stars">${stars(r.rating)}</span></td>
              <td class="review-comment-cell">${esc(r.comment)}</td>
              <td>${new Date(r.created_at).toLocaleDateString('en-PK')}</td>
              <td class="action-cell">
                <button class="button pin-btn" data-id="${r.id}" data-pinned="${r.pinned}">
                  ${r.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button class="button delete-review-btn" data-id="${r.id}" style="background:#c62828;">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    reviewsTable.querySelectorAll('.pin-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await setReviewPinned(btn.dataset.id, btn.dataset.pinned !== 'true');
          loadReviews();
        } catch {
          alert('Failed to update pin status.');
          btn.disabled = false;
        }
      });
    });

    reviewsTable.querySelectorAll('.delete-review-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this review permanently?')) return;
        btn.disabled = true;
        try {
          await deleteReview(btn.dataset.id);
          loadReviews();
        } catch {
          alert('Failed to delete review.');
          btn.disabled = false;
        }
      });
    });
  }

  loadReviews();
}
