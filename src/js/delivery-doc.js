import { jsPDF } from 'jspdf';

const SHOP_NAME = 'Hassan Naeem';
const SHOP_ADDRESS = 'Shop No 1, First Floor, Shanghai Plaza, China Market, Rawalpindi';
const SHOP_PHONE = '0335 9115702';

export function generateDeliveryDoc(order) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  const safeText = (text, x, yVal, options = {}) => {
    if (text === null || text === undefined) text = '';
    doc.text(String(text), x, yVal, options);
  };

  // Title
  doc.setFillColor(0, 106, 78);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  safeText('Crafto — Delivery Document', pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  safeText('Hand this document to the delivery agent', pageWidth / 2, 30, { align: 'center' });

  y = 48;

  // Order info bar
  doc.setFillColor(245, 243, 238);
  doc.rect(15, y, pageWidth - 30, 12, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  safeText(`Order #: ${order.order_number || String(order.id).slice(0, 8).toUpperCase()}`, 20, y + 8);
  safeText(`Date: ${new Date(order.created_at).toLocaleDateString('en-PK')}`, pageWidth / 2, y + 8);
  y += 22;

  // From / To section
  const colX = 20;
  const colW = (pageWidth - 50) / 2;

  // FROM (Sender)
  doc.setFillColor(0, 106, 78);
  doc.rect(colX, y, colW, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  safeText('FROM (Sender)', colX + 4, y + 6);
  y += 12;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  safeText(SHOP_NAME, colX + 4, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  safeText('Crafto', colX + 4, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const fromLines = doc.splitTextToSize(SHOP_ADDRESS, colW - 8);
  fromLines.forEach(line => { safeText(line, colX + 4, y); y += 5; });
  y += 3;
  safeText(`Phone: ${SHOP_PHONE}`, colX + 4, y);
  y += 18;

  // Reset y for TO section
  const toY = 48 + 22 + 12;

  // TO (Customer)
  const toX = colX + colW + 8;
  doc.setFillColor(33, 33, 33);
  doc.rect(toX, toY, colW, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  safeText('TO (Customer)', toX + 4, toY + 6);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  safeText(order.customer_name, toX + 4, toY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  safeText(`Phone: ${order.customer_phone}`, toX + 4, toY + 23);
  const toLines = doc.splitTextToSize(order.customer_address || '', colW - 8);
  let ty = toY + 30;
  toLines.forEach(line => { safeText(line, toX + 4, ty); ty += 5; });

  y = Math.max(y, ty + 10);

  // Items header
  doc.setDrawColor(0, 106, 78);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;
  doc.setFillColor(0, 106, 78);
  doc.rect(15, y, pageWidth - 30, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  safeText('#', 20, y + 6);
  safeText('Item', 30, y + 6);
  safeText('Qty', 140, y + 6);
  y += 12;

  // Items
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  const items = Array.isArray(order.items) ? order.items : [];
  let idx = 0;
  for (const item of items) {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = 20;
    }
    idx++;
    const title = item.title || 'Unknown';
    const qty = item.qty || 1;
    const variant = item.variant_label ? ` (${item.variant_label})` : '';
    doc.setFontSize(9);
    safeText(String(idx), 20, y);
    safeText(`${title}${variant}`, 30, y);
    safeText(`× ${qty}`, 140, y);
    y += 7;
  }

  y += 8;

  // Summary
  doc.setDrawColor(0, 106, 78);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  safeText(`Total Items: ${items.reduce((s, i) => s + (i.qty || 1), 0)}`, 20, y);
  if (order.delivery_fee && Number(order.delivery_fee) > 0) {
    doc.setFont('helvetica', 'normal');
    safeText(`Delivery: PKR ${Number(order.delivery_fee).toLocaleString()}`, pageWidth - 70, y);
    y += 7;
  }
  if (order.tax_amount && Number(order.tax_amount) > 0) {
    doc.setFont('helvetica', 'normal');
    safeText(`Tax: PKR ${Number(order.tax_amount).toLocaleString()}`, pageWidth - 70, y);
    y += 7;
  }
  doc.setFont('helvetica', 'normal');
  safeText(`Total: PKR ${Number(order.total || 0).toLocaleString()}`, pageWidth - 70, y);
  y += 18;

  // Delivery info box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(255, 249, 237);
  doc.roundedRect(15, y, pageWidth - 30, 28, 3, 3, 'FD');
  doc.setTextColor(180, 120, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  safeText('DELIVERY INSTRUCTIONS', 20, y + 7);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  safeText('• Handle with care — items are handcrafted and fragile', 20, y + 14);
  safeText('• Verify customer identity before handing over the package', 20, y + 20);
  safeText('• Collect payment if Cash on Delivery (COD)', 20, y + 26);

  y += 40;

  // Footer
  doc.setFillColor(0, 106, 78);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  safeText('Crafto — Pakistan\'s home for authentic handicrafts', pageWidth / 2, pageHeight - 7, { align: 'center' });

  return doc;
}

export function downloadDeliveryDoc(order) {
  const doc = generateDeliveryDoc(order);
  const orderNum = order.order_number || String(order.id).slice(0, 8).toUpperCase();
  doc.save(`Delivery-${orderNum}.pdf`);
}
