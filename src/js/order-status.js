import { trackOrder, cancelOrder, requestReturn, getInvoiceByOrderId } from './api.js';
import { showToast } from './main.js';
import { downloadInvoicePDF } from './invoice-pdf.js';

const form       = document.getElementById('track-form');
const resultEl   = document.getElementById('track-result');
const idInput    = document.getElementById('order-id');
const phoneInput = document.getElementById('phone');

const STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];

const STEP_ICONS = {
  pending:    'pending_actions',
  confirmed:  'check_circle',
  shipped:    'local_shipping',
  delivered:  'verified',
  cancelled:  'cancel',
  return_requested: 'assignment_return',
  returned:         'assignment_returned',
  return_rejected:  'gpp_bad',
};

const STATUS_META = {
  pending:          { label: 'Pending',         color: 'text-yellow-700', bg: 'bg-yellow-100', icon: 'pending_actions' },
  confirmed:        { label: 'Confirmed',       color: 'text-blue-700',   bg: 'bg-blue-100',   icon: 'check_circle' },
  shipped:          { label: 'Shipped',         color: 'text-indigo-700', bg: 'bg-indigo-100', icon: 'local_shipping' },
  delivered:        { label: 'Delivered',       color: 'text-green-700',  bg: 'bg-green-100',  icon: 'verified' },
  cancelled:        { label: 'Cancelled',       color: 'text-red-700',    bg: 'bg-red-100',    icon: 'cancel' },
  return_requested: { label: 'Return Requested',color: 'text-orange-700', bg: 'bg-orange-100', icon: 'assignment_return' },
  returned:         { label: 'Returned',        color: 'text-purple-700', bg: 'bg-purple-100', icon: 'assignment_returned' },
  return_rejected:  { label: 'Return Declined', color: 'text-red-700',    bg: 'bg-red-100',    icon: 'gpp_bad' },
};

const STATUS_LABELS = {
  pending:          'Pending — we will contact you soon',
  confirmed:        'Confirmed — your order is being prepared',
  shipped:          'Shipped — on its way to you',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
  return_requested: 'Return requested — we will contact you',
  returned:         'Returned',
  return_rejected:  'Return request declined',
};

function esc(str) {
  const el = document.createElement('span');
  el.textContent = str ?? '';
  return el.innerHTML;
}

const params = new URLSearchParams(location.search);
if (params.get('id')) idInput.value = params.get('id');
const savedPhone = sessionStorage.getItem('crafto_track_phone');
if (savedPhone) {
  phoneInput.value = savedPhone;
  sessionStorage.removeItem('crafto_track_phone');
}

form?.addEventListener('submit', e => {
  e.preventDefault();
  lookup();
});

if (idInput.value && phoneInput.value) lookup();

function canCancel(status) {
  return status === 'pending';
}

function canReturn(status) {
  return ['confirmed', 'shipped', 'delivered'].includes(status);
}

function statusIndex(status) {
  const idx = STEPS.indexOf(status);
  return idx >= 0 ? idx : -1;
}

function isTerminal(status) {
  return ['cancelled', 'returned', 'return_rejected'].includes(status);
}

function renderTimeline(currentStatus) {
  const currentIdx = statusIndex(currentStatus);
  const isTerm = isTerminal(currentStatus);

  if (isTerm) {
    const meta = STATUS_META[currentStatus] || {};
    return `
      <div class="flex flex-col items-center py-6">
        <span class="material-symbols-outlined text-5xl ${meta.color || 'text-red-500'} mb-3">${meta.icon || 'cancel'}</span>
        <span class="font-headline-md text-headline-md ${meta.color || 'text-red-600'}">${meta.label || currentStatus}</span>
      </div>
    `;
  }

  return `
    <div class="flex items-start justify-between py-6 px-2">
      ${STEPS.map((s, i) => {
        const isActive = i <= currentIdx;
        const isLast = i === STEPS.length - 1;
        const meta = STATUS_META[s];
        return `
          <div class="flex flex-col items-center flex-1 ${isLast ? '' : ''}">
            <div class="relative flex items-center w-full">
              <div class="z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-deep-emerald text-white shadow-md' : 'bg-surface-container text-on-surface-variant'}">
                <span class="material-symbols-outlined text-sm">${STEP_ICONS[s]}</span>
              </div>
              ${!isLast ? `<div class="absolute left-10 right-0 top-1/2 -translate-y-1/2 h-0.5 ${i < currentIdx ? 'bg-deep-emerald' : 'bg-outline-variant'} transition-colors duration-500" style="width: calc(100% - 2.5rem);"></div>` : ''}
            </div>
            <span class="font-label-caps text-[10px] mt-1.5 ${isActive ? 'text-deep-emerald font-bold' : 'text-on-surface-variant'} text-center uppercase tracking-wider">${meta?.label || s}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function lookup() {
  const id = idInput.value.trim();
  const phone = phoneInput.value.trim();
  if (!id || !phone) return;

  resultEl.innerHTML = '<div class="bg-white rounded-xl p-8 shadow-sm border border-outline-variant/10 text-center"><div class="shimmer w-12 h-12 rounded-full mx-auto mb-3"></div><p class="text-on-surface-variant">Looking up order…</p></div>';
  try {
    const data = await trackOrder(id, phone);
    const order = Array.isArray(data) ? data[0] : null;
    if (!order) {
      resultEl.innerHTML = '<div class="bg-white rounded-xl p-8 shadow-sm border border-outline-variant/10 text-center"><span class="material-symbols-outlined text-4xl text-on-surface-variant mb-3">search_off</span><p class="font-body-md text-on-surface-variant">Order not found. Please check your Order ID and phone number.</p></div>';
      return;
    }
    renderOrder(order, id, phone);
  } catch (err) {
    resultEl.innerHTML = `<div class="bg-white rounded-xl p-8 shadow-sm border border-red-200 text-center"><span class="material-symbols-outlined text-4xl text-red-400 mb-3">error_outline</span><p class="text-red-600">Could not load order: ${esc(err.message)}</p></div>`;
  }
}

function renderOrder(order, id, phone) {
  const items = Array.isArray(order.items) ? order.items : [];
  const meta = STATUS_META[order.status] || {};
  const statusText = STATUS_LABELS[order.status] || order.status;

  resultEl.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden fade-in-up visible">
      <div class="bg-deep-emerald px-6 py-4 flex items-center justify-between">
        <h3 class="font-label-caps text-label-caps text-white uppercase tracking-wider">Order Details</h3>
        <span class="${meta.bg} ${meta.color} font-label-caps text-[10px] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
          <span class="material-symbols-outlined text-xs">${meta.icon || 'info'}</span> ${meta.label || order.status}
        </span>
      </div>

      ${renderTimeline(order.status)}

      <div class="px-6 pb-6 space-y-4">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="font-label-caps text-[10px] text-on-surface-variant uppercase">Order ID</span>
            <p class="font-body-md text-charcoal-text break-all font-bold">${esc(order.order_number || order.id)}</p>
          </div>
          <div>
            <span class="font-label-caps text-[10px] text-on-surface-variant uppercase">Placed On</span>
            <p class="font-body-md text-charcoal-text">${new Date(order.created_at).toLocaleString('en-PK')}</p>
          </div>
          <div>
            <span class="font-label-caps text-[10px] text-on-surface-variant uppercase">Delivery Address</span>
            <p class="font-body-md text-charcoal-text">${esc(order.customer_address || '–')}</p>
          </div>
          <div>
            <span class="font-label-caps text-[10px] text-on-surface-variant uppercase">Total Amount</span>
            <p class="font-headline-md text-headline-md text-deep-emerald">PKR ${Number(order.total || 0).toLocaleString()}</p>
          </div>
        </div>

        <div class="border-t border-outline-variant/10 pt-4">
          <span class="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">Items (${items.length})</span>
          <div class="mt-3 space-y-2">
            ${items.map(i => `
              <div class="flex items-center justify-between py-2 px-3 bg-surface-container-low rounded-lg">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
                    <span class="material-symbols-outlined text-sm text-deep-emerald">inventory_2</span>
                  </div>
                  <div>
                    <p class="font-body-md text-sm text-charcoal-text">${esc(i.title)}</p>
                    ${i.variant_label ? '<p class="font-label-caps text-[10px] text-on-surface-variant">' + esc(i.variant_label) + '</p>' : ''}
                    <p class="font-label-caps text-[10px] text-on-surface-variant">Qty: ${i.qty}</p>
                  </div>
                </div>
                <p class="font-body-md text-sm text-deep-emerald font-semibold">PKR ${(i.price * i.qty).toLocaleString()}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="border-t border-outline-variant/10 pt-1 text-center text-sm text-on-surface-variant">
          ${statusText}
        </div>

        <div class="flex gap-3 pt-2">
          <button type="button" id="download-invoice-btn" class="btn-shine flex-1 px-4 py-2.5 bg-deep-emerald text-white rounded-lg font-label-caps text-label-caps hover:bg-primary transition-all active:scale-[0.97] text-sm">
            <span class="material-symbols-outlined text-sm align-middle">download</span> Download Invoice
          </button>
          ${canCancel(order.status) ? `
            <button type="button" id="cancel-order-btn" class="btn-shine flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-label-caps text-label-caps hover:bg-red-700 transition-all active:scale-[0.97] text-sm">
              <span class="material-symbols-outlined text-sm align-middle">cancel</span> Cancel Order
            </button>
          ` : ''}
          ${canReturn(order.status) ? `
            <button type="button" id="return-order-btn" class="btn-shine flex-1 px-4 py-2.5 border-2 border-orange-500 text-orange-600 rounded-lg font-label-caps text-label-caps hover:bg-orange-50 transition-all active:scale-[0.97] text-sm">
              <span class="material-symbols-outlined text-sm align-middle">assignment_return</span> Request Return
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  document.getElementById('download-invoice-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('download-invoice-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-sm align-middle animate-spin">progress_activity</span> Loading…';
    try {
      const invoice = await getInvoiceByOrderId(order.id);
      if (!invoice) {
        showToast('Invoice not found for this order', 'error');
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-sm align-middle">download</span> Download Invoice';
        return;
      }
      downloadInvoicePDF(invoice, order);
      showToast('Invoice downloaded successfully');
    } catch (err) {
      showToast(`Failed to download invoice: ${err.message}`, 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined text-sm align-middle">download</span> Download Invoice';
  });

  document.getElementById('cancel-order-btn')?.addEventListener('click', async () => {
    if (!confirm('Cancel this order? This cannot be undone.')) return;
    const btn = document.getElementById('cancel-order-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-sm align-middle animate-spin">progress_activity</span> Cancelling…';
    try {
      const data = await cancelOrder(id, phone);
      const updated = Array.isArray(data) ? data[0] : null;
      showToast('Order cancelled.');
      if (updated) renderOrder(updated, id, phone);
      else lookup();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = 'Cancel Order';
    }
  });

  document.getElementById('return-order-btn')?.addEventListener('click', async () => {
    if (!confirm('Request a return for this order? Our team will contact you.')) return;
    const btn = document.getElementById('return-order-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-sm align-middle animate-spin">progress_activity</span> Submitting…';
    try {
      const data = await requestReturn(id, phone);
      const updated = Array.isArray(data) ? data[0] : null;
      showToast('Return request submitted.');
      if (updated) renderOrder(updated, id, phone);
      else lookup();
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = 'Request Return';
    }
  });
}
