/** In POS — 2 kiểu: bill tiền (khách) + tem thành phần (dán ly) */

export interface PosPrintLine {
  productName: string;
  size?: string;
  protein?: number;
  toppings?: string[];
  quantity: number;
  price: number;
  isCustomCombo?: boolean;
}

export interface CustomerReceiptData {
  orderNumber: string;
  time: Date;
  staff?: string;
  paymentMethod?: string;
  lines: PosPrintLine[];
  subtotal: number;
  discount: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  pointsEarned?: number;
}

function openPrintWindow(title: string, bodyHtml: string, paperWidth = '58mm') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt chặn cửa sổ in. Cho phép popup và thử lại.');
    return;
  }
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page { margin: 4mm; }
          body { font-family: 'Courier New', monospace; width: ${paperWidth}; margin: 0 auto; padding: 8px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .item { margin-bottom: 10px; }
          .cup-label {
            border: 2px solid #000;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }
          .cup-name { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 6px; }
          .cup-meta { font-size: 13px; text-align: center; }
          .cup-toppings { font-size: 12px; margin-top: 6px; }
          pre { white-space: pre-wrap; margin: 0; font-size: 12px; }
        </style>
      </head>
      <body>${bodyHtml}</body>
      <script>window.onload = () => { window.print(); window.close(); };</script>
    </html>
  `);
  printWindow.document.close();
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  qr: 'Chuyển khoản / QR',
  momo: 'MoMo',
  zalopay: 'ZaloPay',
};

/** Bill tiền — đưa cho khách (có giá, tổng tiền) */
export function printCustomerReceipt(data: CustomerReceiptData) {
  const payLabel = data.paymentMethod
    ? PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod
    : '—';

  const linesHtml = data.lines
    .map((item, idx) => {
      const lineTotal = item.price * item.quantity;
      const detail = item.isCustomCombo
        ? ''
        : `\n   ${item.size || ''} · ${item.protein ?? ''}g protein`;
      const tops =
        item.toppings && item.toppings.length > 0
          ? `\n   + ${item.toppings.join(', ')}`
          : '';
      return `
<div class="item">
  <div class="bold">${idx + 1}. ${item.productName} x${item.quantity}</div>
  ${detail}${tops}
  <div style="text-align:right">${lineTotal.toLocaleString('vi-VN')}đ</div>
</div>`;
    })
    .join('');

  const html = `
    <div class="center bold" style="font-size:14px">FITBLEND</div>
    <div class="center" style="font-size:11px">Healthy Protein Smoothie</div>
    <div class="line"></div>
    <div class="center bold">HÓA ĐƠN THANH TOÁN</div>
    <div style="font-size:11px;margin-top:8px">
      Mã: ${data.orderNumber}<br/>
      ${data.time.toLocaleString('vi-VN')}<br/>
      NV: ${data.staff || 'POS'}<br/>
      TT: ${payLabel}
    </div>
    <div class="line"></div>
    ${linesHtml}
    <div class="line"></div>
    <div style="display:flex;justify-content:space-between"><span>Tạm tính</span><span>${data.subtotal.toLocaleString('vi-VN')}đ</span></div>
    ${data.discount > 0 ? `<div style="display:flex;justify-content:space-between"><span>Giảm giá</span><span>-${data.discount.toLocaleString('vi-VN')}đ</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;margin-top:6px">
      <span>TỔNG</span><span>${data.total.toLocaleString('vi-VN')}đ</span>
    </div>
    ${
      data.customerName
        ? `<div class="line"></div><div style="font-size:11px">Khách: ${data.customerName}${data.customerPhone ? ` (${data.customerPhone})` : ''}</div>`
        : ''
    }
    ${
      data.pointsEarned && data.pointsEarned > 0
        ? `<div style="font-size:11px">+${data.pointsEarned} điểm tích lũy</div>`
        : ''
    }
    <div class="line"></div>
    <div class="center" style="font-size:11px">Cảm ơn quý khách!<br/>Hẹn gặp lại 💚</div>
  `;

  openPrintWindow('Hóa đơn khách', html);
}

/** Tem thành phần — dán lên ly (không cần giá, rõ vị + size + topping) */
export function printCupLabels(
  lines: PosPrintLine[],
  meta: { orderNumber: string; time: Date }
) {
  const stickers: string[] = [];

  lines.forEach((item) => {
    const count = Math.max(1, item.quantity);
    for (let i = 0; i < count; i++) {
      if (item.isCustomCombo) {
        stickers.push(`
<div class="cup-label">
  <div class="cup-name">${item.productName}</div>
  <div class="cup-meta">COMBO TÙY CHỈNH</div>
  ${item.toppings?.length ? `<div class="cup-toppings"><b>Topping:</b><br/>${item.toppings.join('<br/>')}</div>` : ''}
  <div class="line"></div>
  <div style="font-size:10px;text-align:center">${meta.orderNumber} · ${meta.time.toLocaleTimeString('vi-VN')}</div>
</div>`);
      } else {
        stickers.push(`
<div class="cup-label">
  <div class="cup-name">${item.productName}</div>
  <div class="cup-meta">${item.size || '360ml'} · Protein ${item.protein ?? 40}g</div>
  <div class="cup-toppings">
    <b>Thành phần / Topping:</b><br/>
    ${item.toppings && item.toppings.length > 0 ? item.toppings.join('<br/>') : 'Không thêm topping'}
  </div>
  <div class="line"></div>
  <div style="font-size:10px;text-align:center">${meta.orderNumber} · ${meta.time.toLocaleTimeString('vi-VN')}</div>
</div>`);
      }
    }
  });

  if (stickers.length === 0) return;

  openPrintWindow('Tem dán ly', stickers.join(''), '48mm');
}

export function printBothAfterPayment(
  receipt: CustomerReceiptData,
  cupLines: PosPrintLine[]
) {
  printCupLabels(cupLines, { orderNumber: receipt.orderNumber, time: receipt.time });
  setTimeout(() => printCustomerReceipt(receipt), 400);
}
