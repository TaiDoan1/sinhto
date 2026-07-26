/** In POS — 2 kiểu: bill tiền (khách) + tem thành phần (dán ly) */

import { getRememberedPrinter, sendToPrinter, type PrinterRole } from './webUsbPrinter';
import { htmlToEscposCommands, renderIsolatedHtml, BASE_RENDER_WIDTH_PX } from './escposRaster';
import * as api from './api';

/** Cấu hình khổ giấy + cỡ chữ cho bill khách (role "receipt") — nhân viên tự chỉnh trong màn
 * hình "Kết nối máy in USB" cho khớp với khổ giấy thật của máy in (VD 58mm, 75mm, 80mm...). */
export interface PosPrinterSettings {
  paperWidthMm: number;
  fontScale: number;
}

export const DEFAULT_PRINTER_SETTINGS: PosPrinterSettings = { paperWidthMm: 58, fontScale: 1 };

const PRINTER_SETTINGS_KEY = 'posPrinterSettings';
let cachedPrinterSettings: PosPrinterSettings = DEFAULT_PRINTER_SETTINGS;

export async function loadPosPrinterSettings(): Promise<PosPrinterSettings> {
  try {
    const saved = await api.fetchSetting(PRINTER_SETTINGS_KEY);
    if (saved && typeof saved === 'object') {
      cachedPrinterSettings = { ...DEFAULT_PRINTER_SETTINGS, ...saved };
    }
  } catch {
    // Lỗi mạng — giữ nguyên giá trị cache/mặc định, không chặn luồng in.
  }
  return cachedPrinterSettings;
}

export async function savePosPrinterSettings(settings: PosPrinterSettings): Promise<void> {
  cachedPrinterSettings = settings;
  await api.saveSetting(PRINTER_SETTINGS_KEY, settings);
}

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

export const RECEIPT_STYLE = `
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

function openPrintWindow(title: string, bodyHtml: string, paperWidthMm = 58, fontScale = 1) {
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
          body { font-family: 'Courier New', monospace; width: ${paperWidthMm}mm; margin: 0 auto; padding: 8px; font-size: ${fontScale}em; }
          ${RECEIPT_STYLE}
        </style>
      </head>
      <body>${bodyHtml}</body>
      <script>window.onload = () => { window.print(); window.close(); };</script>
    </html>
  `);
  printWindow.document.close();
}

/** Số dot ngang theo khổ giấy thật (mm) — 203dpi là chuẩn phổ biến nhất của máy in nhiệt. */
function dotsForWidthMm(widthMm: number): number {
  return Math.round((widthMm / 25.4) * 203);
}

/** Render 1 đoạn HTML hóa đơn ra lệnh ESC/POS và gửi thẳng qua USB tới máy in đã kết nối cho role này. */
export async function printHtmlViaUsb(
  role: PrinterRole,
  bodyHtml: string,
  paperWidthMm = 58,
  fontScale = 1
): Promise<{ ok: true } | { ok: false; error: string }> {
  const device = await getRememberedPrinter(role).catch(() => null);
  if (!device) {
    return { ok: false, error: 'Chưa kết nối máy in này. Bấm "Kết nối" trước.' };
  }

  try {
    // Render ảnh ở bề rộng hẹp hơn khi fontScale > 1 — cùng 1 kích thước chữ tuyệt đối (px)
    // sẽ chiếm tỉ lệ lớn hơn trong bề rộng render, nên sau khi co giãn về đúng khổ giấy thật,
    // chữ hiện to hơn tương ứng mà không cần sửa từng font-size trong các mẫu bill.
    const renderWidthPx = Math.round(BASE_RENDER_WIDTH_PX / fontScale);
    const commands = await htmlToEscposCommands(bodyHtml, RECEIPT_STYLE, dotsForWidthMm(paperWidthMm), renderWidthPx);
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
 *
 * Khổ giấy + cỡ chữ chỉ tùy chỉnh được cho bill khách ("receipt") — tem dán ly ("label") là
 * khổ cố định của loại tem đang dùng, không phụ thuộc cấu hình máy in bill.
 */
async function printViaUsbOrWindow(
  role: PrinterRole,
  title: string,
  bodyHtml: string,
  fallbackWidthMm: number
) {
  const settings = role === 'receipt' ? await loadPosPrinterSettings() : DEFAULT_PRINTER_SETTINGS;
  const widthMm = role === 'receipt' ? settings.paperWidthMm : fallbackWidthMm;
  const fontScale = role === 'receipt' ? settings.fontScale : 1;
  const result = await printHtmlViaUsb(role, bodyHtml, widthMm, fontScale);
  if (!result.ok) {
    openPrintWindow(title, bodyHtml, widthMm, fontScale);
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

  await printViaUsbOrWindow('receipt', 'Hóa đơn khách', html, 58);
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

  await printViaUsbOrWindow('label', 'Tem dán ly', stickers.join(''), 48);
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

export interface ShiftClosingBillTemplate {
  title: string;
  shopName: string;
  transferLabel: string;
  showTransfer: boolean;
  showZalopay: boolean;
  showMomo: boolean;
  footerNote: string;
}

export const DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE: ShiftClosingBillTemplate = {
  title: 'BÁO CÁO KẾT CA',
  shopName: 'FITBLEND',
  transferLabel: 'Chuyển khoản',
  showTransfer: true,
  showZalopay: true,
  showMomo: true,
  footerNote: 'Cảm ơn bạn đã làm việc chăm chỉ 💪',
};

export interface ShiftClosingReceiptData {
  employeeName: string;
  startTime: string;
  endTime: string;
  checkIn?: Date;
  checkOut?: Date;
  items: ShiftItemSummary[];
  orderCount: number;
  totalRevenue: number;
  startCash: number;
  endCashActual: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  cashDiscrepancy: number;
  breakdown: { cash: number; transfer: number; zalopay: number; momo: number };
  template: ShiftClosingBillTemplate;
}

interface ShiftLike {
  employeeName: string;
  startTime: string;
  endTime: string;
  checkIn?: string;
  checkOut?: string;
  startCash?: number;
  endCashActual?: number;
}

interface ShiftOrderLike {
  total: number;
  paymentMethod?: string;
  items: any[];
}

interface CashMovementLike {
  type: 'in' | 'out';
  amount: number;
}

/**
 * Tính toán đối chiếu tiền mặt + doanh thu theo hình thức thanh toán cho 1 ca — dùng chung giữa
 * POSInterface (lúc kết ca) và BranchShiftClosings (lúc admin xem/in lại) để tránh 2 nơi tự tính
 * lệch nhau. `endCashActualOverride` cho phép xem trước bill khi nhân viên đang gõ số đếm được,
 * trước khi số đó được lưu vào shift.endCashActual qua API.
 */
export function buildShiftClosingReceiptData(
  shift: ShiftLike,
  shiftOrders: ShiftOrderLike[],
  cashMovements: CashMovementLike[],
  template: ShiftClosingBillTemplate = DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE,
  endCashActualOverride?: number
): ShiftClosingReceiptData {
  const breakdown = { cash: 0, transfer: 0, zalopay: 0, momo: 0 };
  for (const o of shiftOrders) {
    const amt = o.total || 0;
    if (o.paymentMethod === 'qr' || o.paymentMethod === 'transfer') breakdown.transfer += amt;
    else if (o.paymentMethod === 'momo') breakdown.momo += amt;
    else if (o.paymentMethod === 'zalopay') breakdown.zalopay += amt;
    else breakdown.cash += amt;
  }

  const cashIn = cashMovements.filter((m) => m.type === 'in').reduce((s, m) => s + (m.amount || 0), 0);
  const cashOut = cashMovements.filter((m) => m.type === 'out').reduce((s, m) => s + (m.amount || 0), 0);
  const startCash = shift.startCash || 0;
  const endCashActual = endCashActualOverride ?? shift.endCashActual ?? 0;
  const expectedCash = startCash + breakdown.cash + cashIn - cashOut;
  const totalRevenue = breakdown.cash + breakdown.transfer + breakdown.zalopay + breakdown.momo;

  return {
    employeeName: shift.employeeName,
    startTime: shift.startTime,
    endTime: shift.endTime,
    checkIn: shift.checkIn ? new Date(shift.checkIn) : undefined,
    checkOut: shift.checkOut ? new Date(shift.checkOut) : new Date(),
    items: aggregateShiftItems(shiftOrders as any),
    orderCount: shiftOrders.length,
    totalRevenue,
    startCash,
    endCashActual,
    cashIn,
    cashOut,
    expectedCash,
    cashDiscrepancy: endCashActual - expectedCash,
    breakdown,
    template,
  };
}

function moneyRow(label: string, value: number, opts?: { bold?: boolean; colorByValue?: boolean }) {
  const color = opts?.colorByValue ? (value < 0 ? '#c0392b' : '#1e8449') : undefined;
  const weight = opts?.bold ? 'font-weight:bold;' : '';
  const sign = opts?.colorByValue && value > 0 ? '+' : '';
  return `<div style="display:flex;justify-content:space-between;${weight}${color ? `color:${color};` : ''}"><span>${label}</span><span>${sign}${value.toLocaleString('vi-VN')}đ</span></div>`;
}

/** Xây HTML bill kết ca (tách riêng khỏi lệnh in để admin dùng lại cho preview). */
export function buildShiftClosingHtml(data: ShiftClosingReceiptData): string {
  const t = data.template;
  const itemsHtml = data.items
    .map(
      (it) => `
<div style="display:flex;justify-content:space-between;margin-bottom:4px">
  <span>${it.productName} x${it.quantity}</span>
  <span>${it.revenue.toLocaleString('vi-VN')}đ</span>
</div>`
    )
    .join('');

  const methodSectionsHtml = [
    t.showTransfer
      ? `<div class="bold" style="margin-top:8px">Tổng ${t.transferLabel}</div>${moneyRow('Thu vào', data.breakdown.transfer)}${moneyRow('Chi ra', 0)}${moneyRow('Dự kiến', data.breakdown.transfer)}`
      : '',
    t.showZalopay
      ? `<div class="bold" style="margin-top:8px">Tổng Zalopay</div>${moneyRow('Thu vào', data.breakdown.zalopay)}${moneyRow('Chi ra', 0)}${moneyRow('Dự kiến', data.breakdown.zalopay)}`
      : '',
    t.showMomo
      ? `<div class="bold" style="margin-top:8px">Tổng MoMo</div>${moneyRow('Thu vào', data.breakdown.momo)}${moneyRow('Chi ra', 0)}${moneyRow('Dự kiến', data.breakdown.momo)}`
      : '',
  ].join('');

  const revenueListHtml = [
    moneyRow('Tiền mặt', data.breakdown.cash),
    t.showTransfer ? moneyRow(t.transferLabel, data.breakdown.transfer) : '',
    t.showZalopay ? moneyRow('Zalopay', data.breakdown.zalopay) : '',
    t.showMomo ? moneyRow('MoMo', data.breakdown.momo) : '',
  ].join('');

  return `
    <div class="center bold" style="font-size:14px">${t.shopName}</div>
    <div class="center" style="font-size:11px">${t.title}</div>
    <div class="line"></div>
    <div class="bold">Đầu ca</div>
    <div style="font-size:11px">
      Giờ: ${data.checkIn ? data.checkIn.toLocaleString('vi-VN') : '—'}<br/>
      NV: ${data.employeeName}<br/>
      Tiền mặt đầu ca: ${data.startCash.toLocaleString('vi-VN')}đ
    </div>
    <div class="bold" style="margin-top:8px">Cuối ca</div>
    <div style="font-size:11px">
      Giờ: ${data.checkOut ? data.checkOut.toLocaleString('vi-VN') : '—'}<br/>
      NV: ${data.employeeName}<br/>
      Tiền mặt thực tế: ${data.endCashActual.toLocaleString('vi-VN')}đ
    </div>
    <div class="line"></div>
    <div class="bold">Tổng tiền mặt</div>
    ${moneyRow('Thu vào', data.breakdown.cash + data.cashIn)}
    ${moneyRow('Chi ra', data.cashOut)}
    ${moneyRow('Dự kiến', data.expectedCash)}
    ${moneyRow('Thực tế', data.endCashActual)}
    ${moneyRow('Chênh lệch', data.cashDiscrepancy, { bold: true, colorByValue: true })}
    ${methodSectionsHtml}
    <div class="line"></div>
    <div class="bold" style="margin-bottom:6px">Tổng doanh thu tạm tính</div>
    ${revenueListHtml}
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;margin-top:4px">
      <span>TỔNG CỘNG</span><span>${data.totalRevenue.toLocaleString('vi-VN')}đ</span>
    </div>
    <div class="line"></div>
    <div class="bold" style="margin-bottom:6px">Sản phẩm đã bán</div>
    ${itemsHtml || '<div style="font-size:11px">Không có đơn hàng</div>'}
    <div style="display:flex;justify-content:space-between;margin-top:4px"><span>Số đơn</span><span>${data.orderCount} đơn</span></div>
    <div class="line"></div>
    <div class="center" style="font-size:11px">${t.footerNote}</div>
  `;
}

/** Bill kết ca — đối chiếu tiền mặt/doanh thu theo hình thức thanh toán, đưa quản lý/nhân viên xác nhận */
export async function printShiftClosingReceipt(data: ShiftClosingReceiptData) {
  await printViaUsbOrWindow('receipt', 'Bill kết ca', buildShiftClosingHtml(data), 58);
}

/** Lưu bill kết ca thành ảnh PNG — ưu tiên lưu THẲNG vào album ảnh máy (qua hộp thoại chia sẻ
 * gốc của điện thoại, chọn "Lưu vào Ảnh"/"Save Image"), không phải tải về thư mục Downloads.
 * Render rộng hơn khổ giấy nhiệt (58mm) để chữ rõ khi xem lại trên điện thoại. */
export async function saveShiftClosingReceiptAsImage(data: ShiftClosingReceiptData, employeeName?: string) {
  const canvas = await renderIsolatedHtml(buildShiftClosingHtml(data), RECEIPT_STYLE, 420);
  const dateStr = new Date().toISOString().slice(0, 10);
  const namePart = (employeeName || data.employeeName || 'bill').replace(/\s+/g, '-');
  const fileName = `bill-ket-ca-${namePart}-${dateStr}.png`;

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Không tạo được ảnh bill');
  const file = new File([blob], fileName, { type: 'image/png' });

  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean; share?: (data: ShareData) => Promise<void> };
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: 'Bill kết ca' });
      return;
    } catch (err) {
      // Người dùng tự bấm Hủy trên hộp thoại chia sẻ — không phải lỗi, không cần rơi về cách khác.
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  }

  // Trình duyệt không hỗ trợ chia sẻ file (VD desktop) — mở ảnh ở tab mới để nhấn giữ lưu thủ
  // công; nếu popup bị chặn thì mới rơi về tải file thông thường.
  const dataUrl = canvas.toDataURL('image/png');
  const win = window.open(dataUrl, '_blank');
  if (!win) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
