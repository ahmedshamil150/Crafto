export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, orderId, items, total } = req.body;
  if (!email || !orderId) return res.status(400).json({ error: 'Missing required fields' });

  const itemRows = (items || [])
    .map(i => `<tr><td style="padding:8px 0;border-bottom:1px solid #e4e2dd;font-size:14px;color:#1A1A1A;">${escHtml(i.title)} × ${i.qty}</td><td style="padding:8px 0;border-bottom:1px solid #e4e2dd;font-size:14px;color:#1A1A1A;text-align:right;">PKR ${Number(i.price).toLocaleString()}</td></tr>`)
    .join('');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Crafto <${process.env.EMAIL_FROM || 'orders@crafto.pk'}>`,
        to: email,
        subject: `Order Confirmed — #${orderId.slice(0, 8)}`,
        html: `<!doctype html><html><body style="margin:0;padding:0;background:#F9F7F2;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <tr><td style="background:#006A4E;padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Crafto</h1>
      <p style="margin:4px 0 0;color:#83d7b4;font-size:14px;">Authentic Pakistani Craftsmanship</p>
    </td></tr>
    <tr><td style="padding:32px 40px;">
      <h2 style="margin:0 0 4px;font-size:22px;color:#1A1A1A;">Thank you, ${escHtml(name || 'Valued Customer')}!</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6f7a73;">Your order has been placed successfully.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <tr><td style="font-size:12px;color:#6f7a73;text-transform:uppercase;letter-spacing:0.05em;">Order ID</td></tr>
        <tr><td style="font-size:16px;color:#1A1A1A;font-weight:600;padding:2px 0 0;">${orderId}</td></tr>
      </table>
      <h3 style="margin:0 0 12px;font-size:16px;color:#1A1A1A;">Items Ordered</h3>
      <table width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
        <tr><td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#1A1A1A;">Total</td>
        <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#006A4E;text-align:right;">PKR ${Number(total).toLocaleString()}</td></tr>
        <tr><td colspan="2" style="padding:4px 0 0;font-size:12px;color:#6f7a73;text-align:right;">Cash on Delivery</td></tr>
      </table>
      <p style="margin:24px 0 8px;font-size:14px;color:#1A1A1A;">We will confirm your order and let you know in a while.</p>
      <a href="https://crafto.vercel.app/order-status.html?id=${orderId}" style="display:inline-block;padding:12px 28px;background:#006A4E;color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;">Track Your Order</a>
    </td></tr>
    <tr><td style="background:#F9F7F2;padding:24px 40px;text-align:center;border-top:1px solid #e4e2dd;">
      <p style="margin:0;font-size:12px;color:#6f7a73;">Crafto — Pakistan's home for authentic handicrafts</p>
      <p style="margin:4px 0 0;font-size:11px;color:#6f7a73;">Questions? Reply to this email or visit <a href="https://crafto.vercel.app/contact.html" style="color:#006A4E;">our contact page</a>.</p>
    </td></tr>
  </table>
</td></tr></table></body></html>`,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || 'Failed to send');
    res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
