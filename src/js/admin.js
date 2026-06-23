// src/js/admin.js
// Admin panel: handles auth guard, login, logout, and page-specific logic

const ADMIN_USERS = {
  [import.meta.env.VITE_ADMIN_USER1 || 'admin1']: import.meta.env.VITE_ADMIN_PASS1 || 'pass1',
  [import.meta.env.VITE_ADMIN_USER2 || 'admin2']: import.meta.env.VITE_ADMIN_PASS2 || 'pass2',
  [import.meta.env.VITE_ADMIN_USER3 || 'admin3']: import.meta.env.VITE_ADMIN_PASS3 || 'pass3',
};

const isLoginPage = document.getElementById('admin-login-form') !== null;

// --- Auth guard ---
if (!isLoginPage) {
  const session = sessionStorage.getItem('crafto_admin');
  if (!session) {
    window.location.href = './login.html';
  }
}

// --- Login form ---
const loginForm = document.getElementById('admin-login-form');
if (loginForm) {
  loginForm.addEventListener('submit', e => {
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
}

// --- Logout ---
document.getElementById('logout-btn')?.addEventListener('click', e => {
  e.preventDefault();
  sessionStorage.removeItem('crafto_admin');
  window.location.href = './login.html';
});

// --- Dashboard stats ---
if (document.getElementById('stat-products')) {
  import('./api.js').then(async ({ getProducts, getOrders }) => {
    const products = await getProducts();
    const orders = await getOrders();
    document.getElementById('stat-products').textContent = products.length;
    document.getElementById('stat-orders').textContent = orders.filter(o => o.status === 'pending').length;
    const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    document.getElementById('stat-revenue').textContent = `PKR ${revenue.toLocaleString()}`;
  });
}

// --- Products CRUD ---
const productsTable = document.getElementById('products-table');
if (productsTable) {
  import('./api.js').then(async ({ getProducts, deleteProduct }) => {
    async function loadProducts() {
      const products = await getProducts();
      if (!products.length) {
        productsTable.innerHTML = '<p>No products yet. Click "+ Add Product" to create one.</p>';
        return;
      }
      productsTable.innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #eee;text-align:left;">
              <th style="padding:0.5rem;">Title</th>
              <th style="padding:0.5rem;">Price (PKR)</th>
              <th style="padding:0.5rem;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr style="border-bottom:1px solid #eee;" data-id="${p.id}">
                <td style="padding:0.5rem;">${p.title}</td>
                <td style="padding:0.5rem;">${Number(p.price).toLocaleString()}</td>
                <td style="padding:0.5rem;display:flex;gap:0.5rem;">
                  <button class="button edit-btn" data-id="${p.id}">Edit</button>
                  <button class="button delete-btn" data-id="${p.id}" style="background:#c62828;">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this product?')) return;
          await deleteProduct(btn.dataset.id);
          loadProducts();
        });
      });
    }
    loadProducts();
  });
}

// --- Orders list ---
const ordersTable = document.getElementById('orders-table');
if (ordersTable) {
  import('./api.js').then(async ({ getOrders }) => {
    const orders = await getOrders();
    if (!orders.length) {
      ordersTable.innerHTML = '<p>No orders yet.</p>';
      return;
    }
    ordersTable.innerHTML = `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid #eee;text-align:left;">
            <th style="padding:0.5rem;">ID</th>
            <th style="padding:0.5rem;">Customer</th>
            <th style="padding:0.5rem;">Total (PKR)</th>
            <th style="padding:0.5rem;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr style="border-bottom:1px solid #eee;">
              <td style="padding:0.5rem;">${o.id}</td>
              <td style="padding:0.5rem;">${o.customer_name || '–'}</td>
              <td style="padding:0.5rem;">${Number(o.total || 0).toLocaleString()}</td>
              <td style="padding:0.5rem;">${o.status || 'pending'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  });
}
