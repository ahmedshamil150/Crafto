// src/js/admin.js
import {
  getProducts, getOrders, createProduct, updateProduct, deleteProduct, updateOrderStatus,
  getAllReviews, deleteReview, setReviewPinned, getProductsCount, getOrdersCount, uploadImage,
  getCoupons, createCoupon, deleteCoupon,
  getActiveHeroImage, getHeroImages, setHeroImage,
  getProductVariants, createVariant, updateVariant, deleteVariant,
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
          <label>Stock <small>(total for products without variants)</small><input id="p-stock" type="number" min="0" value="0" /></label>
          <div class="variants-section" style="border:1px solid #ddd;border-radius:6px;padding:12px;margin-top:8px;">
            <strong style="display:block;margin-bottom:8px;">Variants <small style="font-weight:400;color:#666;">(size/color with separate stock)</small></strong>
            <div id="variants-list"></div>
            <button type="button" id="add-variant-btn" class="button" style="background:#6b7280;font-size:12px;margin-top:8px;">+ Add Variant</button>
            <div id="variants-empty" style="color:#999;font-size:13px;padding:8px 0;">No variants yet</div>
          </div>
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

      const productResult = id ? await updateProduct(id, payload) : await createProduct(payload);
      const savedId = id || productResult?.id || productResult?.[0]?.id;
      // Save variants — sync from DOM first
      syncVariantsFromDom();
      if (savedId) {
        const existingVariants = await getProductVariants(savedId);
        const existingIds = new Set(existingVariants.map(v => v.id));
        const updatedIds = new Set();

        for (const v of currentVariants) {
          if (v.id) {
            updatedIds.add(v.id);
            const data = {};
            if (v.size !== undefined) data.size = v.size || null;
            if (v.color !== undefined) data.color = v.color || null;
            if (v.price !== undefined) data.price = v.price || null;
            data.stock = v.stock;
            await updateVariant(v.id, data);
          } else {
            const created = await createVariant({
              product_id: savedId,
              size: v.size || null,
              color: v.color || null,
              price: v.price || null,
              stock: v.stock,
            });
          }
        }
        // Delete variants that were removed
        for (const existing of existingVariants) {
          if (!updatedIds.has(existing.id)) {
            await deleteVariant(existing.id).catch(() => {});
          }
        }
      }
      modal.style.display = 'none';
      productsPage = 1;
      loadProducts();
    } catch (err) {
      errEl.textContent = err.message || 'Save failed. Check console.';
      errEl.style.display = 'block';
    }
    saveBtn.disabled = false; saveBtn.textContent = 'Save';
  });

  // --- Variant Management ---
  let currentVariants = [];

  function renderVariants() {
    const list = document.getElementById('variants-list');
    const empty = document.getElementById('variants-empty');
    if (!currentVariants.length) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    list.innerHTML = currentVariants.map((v, i) => `
      <div class="variant-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;" data-index="${i}">
        <input type="text" placeholder="Size (e.g. Small)" value="${esc(v.size || '')}" class="v-size" style="width:90px;padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:13px;" />
        <input type="text" placeholder="Color (e.g. White)" value="${esc(v.color || '')}" class="v-color" style="width:90px;padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:13px;" />
        <input type="number" placeholder="Price" value="${v.price || ''}" class="v-price" style="width:80px;padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:13px;" />
        <input type="number" placeholder="Stock" value="${v.stock}" class="v-stock" style="width:60px;padding:4px 6px;border:1px solid #ccc;border-radius:4px;font-size:13px;" />
        <button type="button" class="remove-variant" style="background:red;color:#fff;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('.remove-variant').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.closest('.variant-row').dataset.index, 10);
        currentVariants.splice(idx, 1);
        renderVariants();
      });
    });
  }

  document.getElementById('add-variant-btn')?.addEventListener('click', () => {
    currentVariants.push({ size: '', color: '', price: '', stock: 0 });
    renderVariants();
  });

  function syncVariantsFromDom() {
    document.querySelectorAll('#variants-list .variant-row').forEach(row => {
      const idx = parseInt(row.dataset.index, 10);
      if (idx < 0 || idx >= currentVariants.length) return;
      currentVariants[idx].size = row.querySelector('.v-size').value;
      currentVariants[idx].color = row.querySelector('.v-color').value;
      currentVariants[idx].price = row.querySelector('.v-price').value;
      currentVariants[idx].stock = parseInt(row.querySelector('.v-stock').value) || 0;
    });
  }

  async function loadVariants(productId) {
    if (!productId) { currentVariants = []; renderVariants(); return; }
    const variants = await getProductVariants(productId);
    currentVariants = variants.map(v => ({ id: v.id, size: v.size, color: v.color, price: v.price, stock: v.stock }));
    renderVariants();
  }

  // Update openModal to also load variants
  const origOpenModal = openModal;
  openModal = function(product = null) {
    origOpenModal(product);
    loadVariants(product?.id || null);
  };

  // Update form submit to save variants: sync DOM values first
  const origHandler = modalForm._submitHandler;

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
            <th>Image</th><th>Title</th><th>Category</th><th>Price (PKR)</th><th>Discount</th><th>Stock</th><th>Featured</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p => `
            <tr data-id="${p.id}">
              <td><img src="${p.image_url || 'https://placehold.co/60x45?text=?'}" style="width:60px;height:45px;object-fit:cover;border-radius:4px;" /></td>
              <td>${p.title}</td>
              <td>${p.category || '–'}</td>
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
        <span>${esc(i.title)}${i.variant_label ? ' (' + esc(i.variant_label) + ')' : ''} × ${i.qty}</span>
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
        const variantLabel = item.variant_label || '';

        lines.push({ date, orderShort, title, variantLabel, price, qty, lineTotal });

        const key = `${title}::${variantLabel}::${price}`;
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
              <td>${esc(l.title)}${l.variantLabel ? ' <span style="color:#6b7280;font-size:0.8rem;">(' + esc(l.variantLabel) + ')</span>' : ''}</td>
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

    // --- Revenue page chart ---
    const chartCanvas = document.getElementById('revenue-chart-canvas');
    if (chartCanvas) {
      let chartInstance = null;

      function buildChartData(days) {
        const labels = [];
        const values = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          labels.push(d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }));
          const dayOrders = active.filter(o => {
            const t = new Date(o.created_at).getTime();
            return t >= d.getTime() && t < d.getTime() + 86400000;
          });
          values.push(dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0));
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
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { callback: v => `PKR ${v.toLocaleString()}` } },
              x: { grid: { display: false } },
            },
          },
        });
      }

      renderChart(7);

      document.getElementById('revenue-chart-7d')?.addEventListener('click', () => {
        document.querySelectorAll('#revenue-chart-7d, #revenue-chart-30d').forEach(b => b.classList.remove('active'));
        document.getElementById('revenue-chart-7d').classList.add('active');
        renderChart(7);
      });
      document.getElementById('revenue-chart-30d')?.addEventListener('click', () => {
        document.querySelectorAll('#revenue-chart-7d, #revenue-chart-30d').forEach(b => b.classList.remove('active'));
        document.getElementById('revenue-chart-30d').classList.add('active');
        renderChart(30);
      });
    }
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

// --- Coupons ---
const couponsTable = document.getElementById('coupons-table');
if (couponsTable) {
  async function loadCoupons() {
    couponsTable.innerHTML = '<p>Loading…</p>';
    const coupons = await getCoupons();
    if (!coupons.length) {
      couponsTable.innerHTML = '<p>No coupons yet. Create one above.</p>';
      return;
    }
    couponsTable.innerHTML = `
      <div class="admin-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Code</th><th>Discount</th><th>Uses</th><th>Expires</th><th>Active</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${coupons.map(c => `
            <tr>
              <td><strong>${esc(c.code)}</strong></td>
              <td>${c.discount_percent}%</td>
              <td>${c.used_count}${c.max_uses > 0 ? ` / ${c.max_uses}` : ' / ∞'}</td>
              <td>${c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-PK') : '–'}</td>
              <td>${c.is_active ? '✓' : '✗'}</td>
              <td class="action-cell">
                <button class="button delete-coupon-btn" data-id="${c.id}" style="background:#c62828;">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>
    `;
    couponsTable.querySelectorAll('.delete-coupon-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this coupon?')) return;
        btn.disabled = true;
        try {
          await deleteCoupon(btn.dataset.id);
          loadCoupons();
        } catch { btn.disabled = false; }
      });
    });
  }

  loadCoupons();

  document.getElementById('coupon-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('create-coupon-btn');
    const msg = document.getElementById('coupon-form-msg');
    btn.disabled = true; btn.textContent = 'Creating…'; msg.style.display = 'none';
    try {
      const data = {
        code: document.getElementById('c-code').value.trim().toUpperCase(),
        discount_percent: parseInt(document.getElementById('c-discount').value),
        max_uses: parseInt(document.getElementById('c-max-uses').value) || 0,
      };
      const expires = document.getElementById('c-expires').value;
      if (expires) data.expires_at = new Date(expires).toISOString();
      await createCoupon(data);
      e.target.reset();
      loadCoupons();
    } catch (err) {
      msg.textContent = err.message || 'Failed to create coupon.';
      msg.style.display = 'block';
    }
    btn.disabled = false; btn.textContent = 'Create Coupon';
  });
}

// --- Hero Section ---
const heroCurrent = document.getElementById('hero-current');
const heroForm = document.getElementById('hero-form');
if (heroForm) {
  function showHeroPreview(hero) {
    if (!heroCurrent) return;
    if (!hero) {
      heroCurrent.innerHTML = '<div class="admin-card" style="max-width:100%;text-align:center;"><p>No hero image set yet. Upload one below.</p></div>';
      return;
    }
    heroCurrent.innerHTML = `
      <div class="admin-card" style="max-width:100%;">
        <h3 style="margin-bottom:0.75rem;font-size:1rem;">Current Hero Image</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">
          <div>
            <p style="font-size:0.82rem;color:#666;margin-bottom:0.35rem;">Desktop</p>
            <div style="border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;background:#f7f8fa;">
              <img src="${hero.image_url}" alt="Desktop hero" style="display:block;width:100%;height:auto;aspect-ratio:192/100;object-fit:cover;" />
            </div>
          </div>
          ${hero.mobile_image_url ? `
          <div>
            <p style="font-size:0.82rem;color:#666;margin-bottom:0.35rem;">Mobile</p>
            <div style="border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;background:#f7f8fa;max-width:200px;">
              <img src="${hero.mobile_image_url}" alt="Mobile hero" style="display:block;width:100%;height:auto;aspect-ratio:75/133;object-fit:cover;" />
            </div>
          </div>` : ''}
        </div>
      </div>
    `;
  }

  (async () => {
    const active = await getActiveHeroImage();
    showHeroPreview(active);
  })();

  heroForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('hero-save-btn');
    const msg = document.getElementById('hero-form-msg');
    btn.disabled = true; btn.textContent = 'Saving…'; msg.style.display = 'none';

    try {
      const desktopFile = document.getElementById('hero-desktop-file');
      const mobileFile = document.getElementById('hero-mobile-file');
      const desktopHidden = document.getElementById('hero-desktop-url');
      const mobileHidden = document.getElementById('hero-mobile-url');

      if (desktopFile.files && desktopFile.files[0]) {
        const file = desktopFile.files[0];
        if (file.size > 2 * 1024 * 1024) throw new Error('Desktop image exceeds 2MB limit.');
        desktopHidden.value = await uploadImage(file, 'hero');
      }
      if (mobileFile.files && mobileFile.files[0]) {
        const file = mobileFile.files[0];
        if (file.size > 2 * 1024 * 1024) throw new Error('Mobile image exceeds 2MB limit.');
        mobileHidden.value = await uploadImage(file, 'hero');
      }

      if (!desktopHidden.value.trim()) throw new Error('Desktop image is required.');

      await setHeroImage(desktopHidden.value.trim(), mobileHidden.value.trim() || null);

      // Reset previews
      document.getElementById('hero-desktop-preview').innerHTML = '';
      document.getElementById('hero-mobile-preview').innerHTML = '';
      desktopFile.value = '';
      mobileFile.value = '';
      desktopHidden.value = '';
      mobileHidden.value = '';

      // Refresh preview
      const updated = await getActiveHeroImage();
      showHeroPreview(updated);
      msg.textContent = 'Hero image updated successfully!';
      msg.style.color = '#0f5132';
      msg.style.display = 'block';
      setTimeout(() => { msg.style.display = 'none'; }, 3000);
    } catch (err) {
      msg.textContent = err.message || 'Failed to save hero image.';
      msg.style.color = 'red';
      msg.style.display = 'block';
    }
    btn.disabled = false; btn.textContent = 'Save Hero Image';
  });

  // File preview handler
  ['hero-desktop-file', 'hero-mobile-file'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', function() {
      const preview = document.getElementById(id.replace('-file', '-preview'));
      const hidden = document.getElementById(id.replace('-file', '-url'));
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
          preview.innerHTML = `<img src="${e.target.result}" alt="Preview" />`;
        };
        reader.readAsDataURL(this.files[0]);
      } else {
        preview.innerHTML = '';
        hidden.value = '';
      }
    });
  });
}
