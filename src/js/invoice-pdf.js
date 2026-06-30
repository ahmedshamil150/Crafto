import { jsPDF } from 'jspdf';

export function generateInvoicePDF(invoice, order) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  // Helper function for safe text
  const safeText = (text, x, yVal, options = {}) => {
    if (text === null || text === undefined) text = '';
    doc.text(String(text), x, yVal, options);
  };

  // Header - Crafto branding
  doc.setFillColor(0, 106, 78); // Deep emerald green
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  safeText('Crafto', 20, 28);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  safeText('Authentic Pakistani Craftsmanship', 20, 35);

  // Invoice title and number
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  safeText('INVOICE', pageWidth - 60, 28);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  safeText(`Invoice #: ${invoice.invoice_number}`, pageWidth - 60, 35);
  
  y = 55;

  // Invoice details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  safeText(`Date: ${new Date(invoice.created_at).toLocaleDateString('en-PK')}`, 20, y);
  y += 7;
  safeText(`Status: ${invoice.status.toUpperCase()}`, 20, y);
  y += 7;
  if (order) {
    safeText(`Order #: ${order.order_number || order.id?.toString().slice(0, 8)}`, 20, y);
  }
  y += 15;

  // Bill to section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  safeText('Bill To:', 20, y);
  y += 7;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  safeText(invoice.customer_name, 20, y);
  y += 6;
  safeText(invoice.customer_phone, 20, y);
  y += 6;
  
  // Address with word wrap
  const addressLines = doc.splitTextToSize(invoice.customer_address, 80);
  addressLines.forEach((line, i) => {
    safeText(line, 20, y + (i * 5));
  });
  y += (addressLines.length * 5) + 15;

  // Items table header
  doc.setFillColor(245, 243, 238); // Light cream background
  doc.rect(20, y, pageWidth - 40, 10, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 106, 78);
  safeText('Item', 25, y + 7);
  safeText('Qty', 120, y + 7);
  safeText('Price', 140, y + 7);
  safeText('Total', 170, y + 7);
  
  y += 10;

  // Items
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  items.forEach((item, index) => {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 20;
    }
    
    const title = item.title || 'Unknown Item';
    const qty = item.qty || 1;
    const price = Number(item.price) || 0;
    const total = price * qty;
    const variantLabel = item.variant_label ? ` (${item.variant_label})` : '';
    
    // Item name with variant
    safeText(`${title}${variantLabel}`, 25, y + 7);
    safeText(qty.toString(), 120, y + 7);
    safeText(`PKR ${price.toLocaleString()}`, 140, y + 7);
    safeText(`PKR ${total.toLocaleString()}`, 170, y + 7);
    
    y += 10;
  });

  y += 10;

  // Summary section
  doc.setDrawColor(0, 106, 78);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  const summaryX = pageWidth - 80;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  safeText('Subtotal:', summaryX, y);
  safeText(`PKR ${Number(invoice.subtotal).toLocaleString()}`, summaryX + 50, y);
  y += 7;
  
  if (invoice.discount_amount > 0) {
    doc.setTextColor(34, 197, 94); // Green for discount
    safeText('Discount:', summaryX, y);
    safeText(`-PKR ${Number(invoice.discount_amount).toLocaleString()}`, summaryX + 50, y);
    doc.setTextColor(0, 0, 0);
    y += 7;
  }
  
  if (invoice.delivery_fee > 0) {
    safeText('Delivery:', summaryX, y);
    safeText(`PKR ${Number(invoice.delivery_fee).toLocaleString()}`, summaryX + 50, y);
    y += 7;
  }
  
  if (invoice.coupon_code) {
    safeText(`Coupon (${invoice.coupon_code}):`, summaryX, y);
    safeText('Applied', summaryX + 50, y);
    y += 7;
  }

  // Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 106, 78);
  safeText('Total:', summaryX, y + 3);
  safeText(`PKR ${Number(invoice.total).toLocaleString()}`, summaryX + 50, y + 3);
  
  y += 20;

  // Footer
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  safeText('Thank you for your order!', 20, pageHeight - 20);
  safeText('Crafto - Pakistan\'s home for authentic handicrafts', 20, pageHeight - 15);
  safeText('Questions? Contact us at contact@crafto.pk', 20, pageHeight - 10);

  // Cancelled watermark if cancelled
  if (invoice.status === 'cancelled') {
    doc.setTextColor(200, 0, 0);
    doc.setFontSize(40);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0, 0.3); // Semi-transparent red
    safeText('CANCELLED', pageWidth / 2 - 50, pageHeight / 2, { align: 'center' });
  }

  return doc;
}

export function downloadInvoicePDF(invoice, order) {
  const doc = generateInvoicePDF(invoice, order);
  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
}
