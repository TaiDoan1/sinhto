/** In POS — 2 kiểu: bill tiền (khách) + tem thành phần (dán ly) */

import { getRememberedPrinter, sendToPrinter, type PrinterRole } from './webUsbPrinter';
import { htmlToEscposCommands } from './escposRaster';

export interface PosPrintLine {
  productName: string;
  size?: string;
  bagSize?: string;
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
  note?: string;
}

const RECEIPT_STYLE = `
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
`;

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
          ${RECEIPT_STYLE}
        </style>
      </head>
      <body>${bodyHtml}</body>
      <script>window.onload = () => { window.print(); window.close(); };</script>
    </html>
  `);
  printWindow.document.close();
}

/** Số dot ngang theo khổ giấy — 203dpi là chuẩn phổ biến nhất của máy in nhiệt. */
const DOTS_WIDTH: Record<string, number> = {
  '58mm': 384,
  '48mm': 320,
  '80mm': 576,
};

/** Render 1 đoạn HTML hóa đơn ra lệnh ESC/POS và gửi thẳng qua USB tới máy in đã kết nối cho role này. */
export async function printHtmlViaUsb(
  role: PrinterRole,
  bodyHtml: string,
  paperWidth: '58mm' | '48mm' | '80mm' = '58mm'
): Promise<{ ok: true } | { ok: false; error: string }> {
  const device = await getRememberedPrinter(role).catch(() => null);
  if (!device) {
    return { ok: false, error: 'Chưa kết nối máy in này. Bấm "Kết nối" trước.' };
  }

  try {
    const commands = await htmlToEscposCommands(bodyHtml, RECEIPT_STYLE, DOTS_WIDTH[paperWidth]);
    await sendToPrinter(device, commands);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`In USB thất bại (${role}):`, err);
    return { ok: false, error: message };
  }
}

/**
 * In trực tiếp qua USB nếu đã kết nối máy in cho role này; nếu chưa kết nối hoặc in USB lỗi,
 * tự động fallback về cách in cũ (mở cửa sổ + window.print()). Không dùng alert() vì nó chặn
 * toàn bộ màn hình cho tới khi bấm OK — chỉ log lỗi ra console để không làm gián đoạn thao tác
 * bán hàng của nhân viên; cửa sổ in thay thế vẫn tự mở ra bình thường.
 */
async function printViaUsbOrWindow(
  role: PrinterRole,
  title: string,
  bodyHtml: string,
  paperWidth: '58mm' | '48mm' | '80mm' = '58mm'
) {
  const result = await printHtmlViaUsb(role, bodyHtml, paperWidth);
  if (!result.ok) {
    openPrintWindow(title, bodyHtml, paperWidth);
  }
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  qr: 'Chuyển khoản / QR',
  momo: 'MoMo',
  zalopay: 'ZaloPay',
};

/** Bill tiền — đưa cho khách (có giá, tổng tiền) */
export async function printCustomerReceipt(data: CustomerReceiptData) {
  const payLabel = data.paymentMethod
    ? PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod
    : '—';

  const linesHtml = data.lines
    .map((item, idx) => {
      const lineTotal = item.price * item.quantity;
      const detail = item.isCustomCombo
        ? ''
        : `\n   ${item.size || ''} · Túi ${item.bagSize || '-'} · ${item.protein ?? ''}g protein`;
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
    ${
      data.note
        ? `<div class="line"></div><div style="font-size:12px;font-weight:bold;border:1px dashed #000;padding:4px;">Ghi chú: ${data.note}</div>`
        : ''
    }
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

  await printViaUsbOrWindow('receipt', 'Hóa đơn khách', html, '58mm');
}

/** Tem thành phần — dán lên ly (không cần giá, rõ vị + size + topping) */
export async function printCupLabels(
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
  <div class="cup-meta">${item.size || '360ml'} · Túi ${item.bagSize || '-'} · Protein ${item.protein ?? 40}g</div>
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

  await printViaUsbOrWindow('label', 'Tem dán ly', stickers.join(''), '48mm');
}

export function printBothAfterPayment(
  receipt: CustomerReceiptData,
  cupLines: PosPrintLine[]
) {
  printCupLabels(cupLines, { orderNumber: receipt.orderNumber, time: receipt.time });
  setTimeout(() => printCustomerReceipt(receipt), 400);
}

export interface ShiftItemSummary {
  productName: string;
  quantity: number;
  revenue: number;
}

/** Gộp sản phẩm đã bán trong ca từ danh sách đơn hàng (mỗi đơn có items: any[]) */
export function aggregateShiftItems(orders: { items: any[] }[]): ShiftItemSummary[] {
  const map = new Map<string, ShiftItemSummary>();
  for (const order of orders) {
    for (const item of order.items || []) {
      const productName = typeof item === 'string' ? item : item.productName || item.name || 'Khác';
      const quantity = typeof item === 'string' ? 1 : item.quantity || 1;
      const price = typeof item === 'string' ? 0 : item.price || 0;
      const cur = map.get(productName) || { productName, quantity: 0, revenue: 0 };
      cur.quantity += quantity;
      cur.revenue += price * quantity;
      map.set(productName, cur);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
}

export interface ShiftClosingReceiptData {
  employeeName: string;
  startTime: string;
  endTime: string;
  checkIn?: Date;
  checkOut?: Date;
  items: ShiftItemSummary[];
  orderCount: number;
  totalRevenue: number;
}

/** Bill kết ca — tổng hợp sản phẩm đã bán trong ca, đưa quản lý/nhân viên đối chiếu */
export async function printShiftClosingReceipt(data: ShiftClosingReceiptData) {
  const itemsHtml = data.items
    .map(
      (it) => `
<div style="display:flex;justify-content:space-between;margin-bottom:4px">
  <span>${it.productName} x${it.quantity}</span>
  <span>${it.revenue.toLocaleString('vi-VN')}đ</span>
</div>`
    )
    .join('');

  const html = `
    <div class="center bold" style="font-size:14px">FITBLEND</div>
    <div class="center" style="font-size:11px">Bill Kết Ca</div>
    <div class="line"></div>
    <div style="font-size:11px">
      NV: ${data.employeeName}<br/>
      Ca: ${data.startTime} - ${data.endTime}<br/>
      Vào ca: ${data.checkIn ? data.checkIn.toLocaleString('vi-VN') : '—'}<br/>
      Kết ca: ${data.checkOut ? data.checkOut.toLocaleString('vi-VN') : '—'}
    </div>
    <div class="line"></div>
    <div class="bold" style="margin-bottom:6px">Sản phẩm đã bán</div>
    ${itemsHtml || '<div style="font-size:11px">Không có đơn hàng</div>'}
    <div class="line"></div>
    <div style="display:flex;justify-content:space-between"><span>Số đơn</span><span>${data.orderCount} đơn</span></div>
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;margin-top:4px">
      <span>TỔNG DOANH THU</span><span>${data.totalRevenue.toLocaleString('vi-VN')}đ</span>
    </div>
    <div class="line"></div>
    <div class="center" style="font-size:11px">Cảm ơn bạn đã làm việc chăm chỉ 💪</div>
  `;

  await printViaUsbOrWindow('receipt', 'Bill kết ca', html, '58mm');
}
