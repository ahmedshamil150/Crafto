// src/js/admin.js
import {
  getProducts, getOrders, createProduct, updateProduct, deleteProduct, updateOrderStatus,
  getAllReviews, deleteReview, setReviewPinned, getProductsCount, getOrdersCount, uploadImage,
} from './api.js';

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str ?? '';
  return el.innerHTML;
}

function stars(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

const ORDER_STATUSES = [
  'pending', 'confirmed', 'shipped', 'delivered',
  'cancelled', 'return_requested', 'returned', 'return_rejected',
];

const REVENUE_STATUSES = new Set(['cancelled', 'return_requested', 'returned']);

const CATEGORIES = ['Vase', 'Jewelry boxes', 'Lamps', 'Tables', 'Candle stands', 'Planters', 'Others'];

function countStatus(orders, status) {
  return orders.filter(o => o.status === status).length;
}

function calcRevenue(orders) {
  return orders
    .filter(o => !REVENUE_STATUSES.has(o.status))
    .reduce((s, o) => s + (Number(o.total) || 0), 0);
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

// --- Mobile sidebar ---
function initAdminMobileNav() {
  const burger = document.getElementById('admin-burger');
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('admin-overlay');
  if (!burger || !sidebar) return;

  const close = () => {
    sidebar.classList.remove('open');
    overlay?.classList.remove('open');
    document.body.classList.remove('admin-nav-open');
    burger.setAttribute('aria-expanded', 'false');
  };

  burger.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('open');
    overlay?.classList.toggle('open', isOpen);
    document.body.classList.toggle('admin-nav-open', isOpen);
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  overlay?.addEventListener('click', close);
  sidebar.querySelectorAll('nav a').forEach(link => link.addEventListener('click', close));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) close();
  });
}

if (!isLoginPage) initAdminMobileNav();

// --- Dashboard stats ---
if (document.getElementById('stat-products')) {
  (async () => {
    const [products, orders, reviews] = await Promise.all([
      getProducts(), getOrders(), getAllReviews(),
    ]);

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('stat-products', products.length);
    set('stat-revenue', `PKR ${calcRevenue(orders).toLocaleString()}`);
    set('stat-reviews', reviews.length);
    set('stat-pending', countStatus(orders, 'pending'));
    set('stat-confirmed', countStatus(orders, 'confirmed'));
    set('stat-shipped', countStatus(orders, 'shipped'));
    set('stat-delivered', countStatus(orders, 'delivered'));
    set('stat-cancelled', countStatus(orders, 'cancelled'));
    set('stat-return-requested', countStatus(orders, 'return_requested'));
    set('stat-returned', countStatus(orders, 'returned'));

    // --- Revenue chart ---
    const chartCanvas = document.getElementById('revenue-chart');
    if (chartCanvas) {
      let chartInstance = null;
      let chartDays = 7;

      const chartOrders = orders.filter(o => !REVENUE_STATUSES.has(o.status));

      function buildChartData(days) {
        const labels = [];
        const values = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          labels.push(d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }));

          const dayOrders = chartOrders.filter(o => {
            const t = new Date(o.created_at).getTime();
            return t >= d.getTime() && t < d.getTime() + 86400000;
          });

          const total = dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
          values.push(total);
        }

        return { labels, values };
      }

      function renderChart(days) {
        const { labels, values } = buildChartData(days);

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(chartCanvas, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Revenue (PKR)',
              data: values,
              backgroundColor: 'rgba(0, 96, 100, 0.6)',
              borderColor: '#006064',
              borderWidth: 1,
              borderRadius: 4,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { callback: v => `PKR ${v.toLocaleString()}` },
              },
              x: {
                grid: { display: false },
              },
            },
          },
        });
      }

      renderChart(7);

      document.getElementById('chart-7d')?.addEventListener('click', () => {
        chartDays = 7;
        document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('chart-7d').classList.add('active');
        renderChart(7);
      });

      document.getElementById('chart-30d')?.addEventListener('click', () => {
        chartDays = 30;
        document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('chart-30d').classList.add('active');
        renderChart(30);
      });
    }
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
          <label>Category *
            <select id="p-category" required>
              <option value="">— Select —</option>
              ${CATEGORIES.map(c => `<option value="${c.toLowerCase()}">${c}</option>`).join('')}
            </select>
          </label>
          <label>Stock<input id="p-stock" type="number" min="0" value="0" /></label>
          <label>Discount (%)<input id="p-discount" type="number" min="0" max="100" value="0" /></label>
          <label class="checkbox-label">
            <input id="p-featured" type="checkbox" />
            Featured product (shows on homepage)
          </label>
          <label>Image 1 *
            <div class="img-upload-row">
              <input id="p-img1-file" type="file" accept="image/jpeg,image/png,image/webp" />
              <div class="img-preview" id="p-img1-preview"></div>
              <input id="p-img1" type="hidden" />
            </div>
          </label>
          <label>Image 2
            <div class="img-upload-row">
              <input id="p-img2-file" type="file" accept="image/jpeg,image/png,image/webp" />
              <div class="img-preview" id="p-img2-preview"></div>
              <input id="p-img2" type="hidden" />
            </div>
          </label>
          <label>Image 3
            <div class="img-upload-row">
              <input id="p-img3-file" type="file" accept="image/jpeg,image/png,image/webp" />
              <div class="img-preview" id="p-img3-preview"></div>
              <input id="p-img3" type="hidden" />
            </div>
          </label>
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

  function setPreview(id, url) {
    const el = document.getElementById(id);
    el.innerHTML = url ? `<img src="${url}" alt="preview" />` : '';
  }

  function openModal(product = null) {
    document.getElementById('modal-title').textContent = product ? 'Edit Product' : 'Add Product';
    document.getElementById('p-id').value       = product?.id || '';
    document.getElementById('p-title').value    = product?.title || '';
    document.getElementById('p-desc').value     = product?.description || '';
    document.getElementById('p-price').value    = product?.price || '';
    document.getElementById('p-category').value = product?.category?.toLowerCase() || '';
    document.getElementById('p-stock').value    = product?.stock ?? 0;
    document.getElementById('p-discount').value = product?.discount_percent ?? 0;
    document.getElementById('p-featured').checked = product?.featured || false;
    document.getElementById('p-img1').value     = product?.image_url || '';
    document.getElementById('p-img2').value     = product?.image_url_2 || '';
    document.getElementById('p-img3').value     = product?.image_url_3 || '';
    ['p-img1-file', 'p-img2-file', 'p-img3-file'].forEach(id => {
      document.getElementById(id).value = '';
    });
    setPreview('p-img1-preview', product?.image_url);
    setPreview('p-img2-preview', product?.image_url_2);
    setPreview('p-img3-preview', product?.image_url_3);
    document.getElementById('modal-error').style.display = 'none';
    modal.style.display = 'flex';
  }

  document.getElementById('modal-cancel').addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

  document.getElementById('add-product-btn').addEventListener('click', () => openModal());

  async function uploadField(fileInputId, hiddenId, folder) {
    const fileInput = document.getElementById(fileInputId);
    const hidden = document.getElementById(hiddenId);
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 2 * 1024 * 1024) throw new Error(`${file.name} exceeds 2MB limit.`);
      hidden.value = await uploadImage(file, folder);
    }
    return hidden.value.trim();
  }

  modalForm.addEventListener('submit', async e => {
    e.preventDefault();
    const saveBtn = document.getElementById('modal-save');
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    const errEl = document.getElementById('modal-error');
    errEl.style.display = 'none';

    const id = document.getElementById('p-id').value;
    const folder = id || `new-${Date.now()}`;

    try {
      const image_url   = await uploadField('p-img1-file', 'p-img1', folder);
      const image_url_2 = await uploadField('p-img2-file', 'p-img2', folder);
      const image_url_3 = await uploadField('p-img3-file', 'p-img3', folder);

      if (!image_url) throw new Error('Image 1 is required.');

      const payload = {
        title:           document.getElementById('p-title').value.trim(),
        description:     document.getElementById('p-desc').value.trim(),
        price:           parseFloat(document.getElementById('p-price').value),
        category:        document.getElementById('p-category').value,
        stock:           parseInt(document.getElementById('p-stock').value) || 0,
        discount_percent: parseInt(document.getElementById('p-discount').value) || 0,
        featured:        document.getElementById('p-featured').checked,
        image_url,
        image_url_2: image_url_2 || null,
        image_url_3: image_url_3 || null,
      };

      if (id) await updateProduct(id, payload);
      else    await createProduct(payload);
      modal.style.display = 'none';
      productsPage = 1;
      loadProducts();
    } catch (err) {
      errEl.textContent = err.message || 'Save failed. Check console.';
      errEl.style.display = 'block';
    }
    saveBtn.disabled = false; saveBtn.textContent = 'Save';
  });

  const PRODS_PER_PAGE = 10;
  let productsPage = 1;
  let productsTotal = 0;

  async function loadProducts() {
    productsTable.innerHTML = '<p>Loading…</p>';
    const [products, count] = await Promise.all([
      getProducts({ limit: PRODS_PER_PAGE, offset: (productsPage - 1) * PRODS_PER_PAGE }),
      getProductsCount(),
    ]);
    productsTotal = count;
    const totalPages = Math.ceil(productsTotal / PRODS_PER_PAGE) || 1;

    if (!products.length) {
      productsTable.innerHTML = '<p>No products yet. Click "+ Add Product" to create one.</p>';
      return;
    }

    productsTable.innerHTML = `
      <div class="admin-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Image</th><th>Title</th><th>Price (PKR)</th><th>Discount</th><th>Stock</th><th>Featured</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p => `
            <tr data-id="${p.id}">
              <td><img src="${p.image_url || 'https://placehold.co/60x45?text=?'}" style="width:60px;height:45px;object-fit:cover;border-radius:4px;" /></td>
              <td>${p.title}</td>
              <td>${Number(p.price).toLocaleString()}</td>
              <td>${p.discount_percent ? `${p.discount_percent}%` : '–'}</td>
              <td>${p.stock ?? 0}</td>
              <td style="text-align:center;font-size:1.1rem;">${p.featured ? '⭐' : '–'}</td>
              <td class="action-cell">
                <button class="button edit-btn" data-id="${p.id}">Edit</button>
                <button class="button delete-btn" data-id="${p.id}" style="background:#c62828;">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>
      <div class="pagination">
        <button class="button page-btn" id="prods-prev" ${productsPage <= 1 ? 'disabled' : ''}>← Prev</button>
        <span class="page-info">Page ${productsPage} of ${totalPages}</span>
        <button class="button page-btn" id="prods-next" ${productsPage >= totalPages ? 'disabled' : ''}>Next →</button>
      </div>
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
        productsPage = 1;
        loadProducts();
      });
    });

    document.getElementById('prods-prev')?.addEventListener('click', () => {
      if (productsPage > 1) { productsPage--; loadProducts(); }
    });
    document.getElementById('prods-next')?.addEventListener('click', () => {
      if (productsPage < totalPages) { productsPage++; loadProducts(); }
    });
  }

  loadProducts();
}

// --- Orders list ---
const ordersTable = document.getElementById('orders-table');
if (ordersTable) {
  const ORDERS_PER_PAGE = 10;
  let ordersPage = 1;

  function renderItems(items) {
    const arr = Array.isArray(items) ? items : [];
    if (!arr.length) return '<em>No items</em>';
    return arr.map(i => `
      <div style="display:flex;justify-content:space-between;padding:2px 0;">
        <span>${esc(i.title)} × ${i.qty}</span>
        <span>PKR ${(Number(i.price) * Number(i.qty)).toLocaleString()}</span>
      </div>
    `).join('');
  }

  async function loadOrders() {
    ordersTable.innerHTML = '<p>Loading…</p>';
    const [orders, count] = await Promise.all([
      getOrders({ limit: ORDERS_PER_PAGE, offset: (ordersPage - 1) * ORDERS_PER_PAGE }),
      getOrdersCount(),
    ]);
    const totalPages = Math.ceil(count / ORDERS_PER_PAGE) || 1;

    if (!orders.length) { ordersTable.innerHTML = '<p>No orders yet.</p>'; return; }

    ordersTable.innerHTML = `
      <div class="admin-table-wrap">
      <table class="admin-table-wide">
        <thead>
          <tr>
            <th style="width:32px;"></th>
            <th>Date</th><th>Customer</th><th>Phone</th><th>Address</th><th>Total (PKR)</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr class="order-main-row" data-order-id="${o.id}">
              <td style="text-align:center;">
                <button class="toggle-items-btn" data-id="${o.id}" style="background:none;border:1px solid #aaa;border-radius:3px;cursor:pointer;padding:1px 6px;font-size:0.85rem;line-height:1.4;" title="Show items">+</button>
              </td>
              <td>${new Date(o.created_at).toLocaleDateString('en-PK')}</td>
              <td>${o.customer_name || '–'}</td>
              <td>${o.customer_phone || '–'}</td>
              <td class="address-cell">${o.customer_address || '–'}</td>
              <td>PKR ${Number(o.total || 0).toLocaleString()}</td>
              <td>
                ${o.status === 'return_requested' ? `
                  <div style="display:flex;gap:4px;flex-wrap:wrap;">
                    <button class="button approve-return-btn" data-id="${o.id}" style="padding:4px 10px;font-size:0.8rem;background:#2e7d32;">Approve</button>
                    <button class="button reject-return-btn" data-id="${o.id}" style="padding:4px 10px;font-size:0.8rem;background:#c62828;">Reject</button>
                  </div>
                ` : `
                  <select class="status-select" data-id="${o.id}">
                    ${ORDER_STATUSES.map(s =>
                      `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>`
                    ).join('')}
                  </select>
                `}
              </td>
            </tr>
            <tr class="items-detail-row" id="items-${o.id}" style="display:none;">
              <td colspan="7" style="padding:0.75rem 1rem;background:#f9f9f9;">
                <div style="font-weight:600;margin-bottom:0.5rem;">Order Items</div>
                ${renderItems(o.items)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>
      <div class="pagination">
        <button class="button page-btn" id="orders-prev" ${ordersPage <= 1 ? 'disabled' : ''}>← Prev</button>
        <span class="page-info">Page ${ordersPage} of ${totalPages}</span>
        <button class="button page-btn" id="orders-next" ${ordersPage >= totalPages ? 'disabled' : ''}>Next →</button>
      </div>
    `;

    ordersTable.querySelectorAll('.toggle-items-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const detailRow = document.getElementById(`items-${id}`);
        if (!detailRow) return;
        const isHidden = detailRow.style.display === 'none';
        detailRow.style.display = isHidden ? 'table-row' : 'none';
        btn.textContent = isHidden ? '−' : '+';
        btn.title = isHidden ? 'Hide items' : 'Show items';
      });
    });

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

    async function handleReturnAction(btn, newStatus, label) {
      btn.disabled = true;
      btn.textContent = `${label}…`;
      try {
        await updateOrderStatus(btn.dataset.id, newStatus);
        btn.textContent = `${label}done ✓`;
        setTimeout(() => loadOrders(), 1000);
      } catch {
        alert(`Failed to ${label.toLowerCase()} return.`);
        btn.disabled = false;
        btn.textContent = label;
      }
    }

    ordersTable.querySelectorAll('.approve-return-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Approve this return? Order will be marked as returned.')) return;
        handleReturnAction(btn, 'returned', 'Approve');
      });
    });

    ordersTable.querySelectorAll('.reject-return-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Reject this return request?')) return;
        handleReturnAction(btn, 'return_rejected', 'Reject');
      });
    });

    document.getElementById('orders-prev')?.addEventListener('click', () => {
      if (ordersPage > 1) { ordersPage--; loadOrders(); }
    });
    document.getElementById('orders-next')?.addEventListener('click', () => {
      if (ordersPage < totalPages) { ordersPage++; loadOrders(); }
    });
  }

  loadOrders();
}

// --- Revenue ---
const revenueContent = document.getElementById('revenue-content');
if (revenueContent) {
  (async () => {
    const orders = await getOrders();
    const active = orders.filter(o => !REVENUE_STATUSES.has(o.status));

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
        <p>Total revenue (${active.length} order${active.length === 1 ? '' : 's'}, cancelled &amp; returns excluded)</p>
      </div>

      <h3 class="admin-subtitle">Sales Detail</h3>
      <div class="admin-table-wrap">
      <table class="admin-table-wide">
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
      </div>

      <h3 class="admin-subtitle">By Product &amp; Price</h3>
      <div class="admin-table-wrap">
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
      </div>
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
      <div class="admin-table-wrap">
      <table class="admin-table-reviews">
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
      </div>
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
