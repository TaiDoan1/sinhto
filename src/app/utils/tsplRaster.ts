import { renderIsolatedHtml } from './escposRaster';

/**
 * Render HTML thành lệnh TSPL/TSPL2 (chuẩn lệnh phổ biến của máy in tem/nhãn nhiệt như iTP3350
 * — KHÁC với ESC/POS dùng cho máy in bill dạng cuộn giấy). Gửi nhầm ESC/POS cho máy in tem khiến
 * USB kết nối/gửi lệnh vẫn báo thành công nhưng máy hoàn toàn im lặng vì không hiểu lệnh.
 *
 * Tem đang dùng là loại CẮT SẴN CỐ ĐỊNH (48x30mm, gap ~2mm giữa các tờ) — khác với giấy cuộn
 * liên tục. Vì vậy khung tem (SIZE/GAP) phải cố định đúng kích thước thật, không được tự giãn
 * theo nội dung như trước (giãn cao hơn 30mm sẽ khiến nội dung tràn qua tờ kế tiếp, bị cắt đứt
 * đoạn giữa chừng). Nếu nội dung dài hơn khung (VD nhiều topping), tự thu nhỏ chữ lại cho vừa.
 */

const CRLF = '\r\n';
const DPI = 203;

function dotsForMm(mm: number): number {
  return Math.round((mm / 25.4) * DPI);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Chuyển canvas (chỉ lấy đúng heightDots đầu, phần dư nếu có sẽ không được lấy) sang bitmap
 * đen/trắng 1-bit, đóng gói đúng thứ tự byte mà lệnh BITMAP của TSPL yêu cầu. */
function canvasToTsplBitmap(canvas: HTMLCanvasElement, heightDots: number): { widthBytes: number; bitmap: Uint8Array } {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không lấy được canvas context');
  const width = canvas.width;
  const widthBytes = Math.ceil(width / 8);
  const imageData = ctx.getImageData(0, 0, width, heightDots);

  const bitmap = new Uint8Array(widthBytes * heightDots);
  for (let y = 0; y < heightDots; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = imageData.data[idx];
      const g = imageData.data[idx + 1];
      const b = imageData.data[idx + 2];
      const a = imageData.data[idx + 3];
      const luminance = r * 0.299 + g * 0.587 + b * 0.114;
      // Ngưỡng 220 (thay vì 200) để các điểm ảnh xám mờ ở viền chữ (do khử răng cưa) cũng được
      // tính là "chữ" luôn — chữ in ra dày/rõ hơn, đỡ mờ hơn so với ngưỡng chặt trước đó.
      const isDark = a > 128 && luminance < 220;
      // Firmware của máy này hiểu bit=1 là "để trắng" và bit=0 là "in đen" — ngược với quy ước
      // ESC/POS raster thông thường (bit=1 = in đen). Không đảo lại thì tem ra nền đen chữ trắng.
      if (!isDark) {
        const byteIndex = y * widthBytes + (x >> 3);
        bitmap[byteIndex] |= 0x80 >> (x % 8);
      }
    }
  }

  return { widthBytes, bitmap };
}

/** Render 1 tem sang bitmap vừa khít khung tem vật lý cố định (widthMm x heightMm) — nếu chữ
 * cao hơn khung, tự render lại ở "độ rộng ảo" lớn hơn (chữ co theo tỉ lệ) để vừa gọn trong 1 tem,
 * không tràn qua tem kế tiếp. Chỉ thử tối đa 2 lần để tránh vòng lặp vô hạn khi nội dung quá dài. */
async function renderLabelBitmap(
  bodyHtml: string,
  styleCss: string,
  widthMm: number,
  heightMm: number,
  baseRenderWidthPx: number
): Promise<{ widthBytes: number; heightDots: number; bitmap: Uint8Array }> {
  const widthDots = dotsForMm(widthMm);
  const maxHeightDots = dotsForMm(heightMm) - dotsForMm(1); // chừa lề an toàn 1mm mỗi tem

  let renderWidthPx = baseRenderWidthPx;
  let finalCanvas: HTMLCanvasElement | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const canvas = await renderIsolatedHtml(bodyHtml, styleCss, renderWidthPx);
    const candidate = document.createElement('canvas');
    candidate.width = widthDots;
    candidate.height = Math.round((canvas.height * widthDots) / canvas.width);
    const ctx = candidate.getContext('2d');
    if (!ctx) throw new Error('Không lấy được canvas context');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, candidate.width, candidate.height);
    ctx.drawImage(canvas, 0, 0, candidate.width, candidate.height);
    finalCanvas = candidate;

    if (candidate.height <= maxHeightDots || attempt === 1) break;
    // Chữ cao hơn khung tem — tăng renderWidthPx đúng tỉ lệ để lần render sau chữ nhỏ lại vừa khung.
    renderWidthPx = Math.ceil(renderWidthPx * (candidate.height / maxHeightDots));
  }

  const heightDots = Math.min(finalCanvas!.height, maxHeightDots);
  const { widthBytes, bitmap } = canvasToTsplBitmap(finalCanvas!, heightDots);
  return { widthBytes, heightDots, bitmap };
}

/**
 * Render 1 hoặc nhiều tem (mỗi tem 1 chuỗi HTML riêng) thành 1 chuỗi lệnh TSPL gửi 1 lần qua
 * USB — mỗi tem có khối CLS/BITMAP/PRINT riêng khớp đúng từng tờ tem cắt sẵn thật, thay vì gộp
 * nhiều tem thành 1 ảnh dài rồi để máy tự cắt ngẫu nhiên giữa chừng như trước.
 */
export async function htmlLabelsToTsplCommands(
  stickerHtmls: string[],
  styleCss: string,
  widthMm: number,
  heightMm: number,
  gapMm: number,
  renderWidthPx: number
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [
    encoder.encode(
      `SIZE ${widthMm} mm, ${heightMm} mm${CRLF}` +
      `GAP ${gapMm} mm, 0 mm${CRLF}` +
      `DIRECTION 1${CRLF}` +
      // Mực in mặc định của máy đang mờ — tăng độ đậm (DENSITY, thang 0-15) để chữ rõ hơn.
      `DENSITY 12${CRLF}` +
      `SPEED 2${CRLF}`
    ),
  ];

  for (const bodyHtml of stickerHtmls) {
    const { widthBytes, heightDots, bitmap } = await renderLabelBitmap(bodyHtml, styleCss, widthMm, heightMm, renderWidthPx);
    chunks.push(encoder.encode(`CLS${CRLF}BITMAP 0,0,${widthBytes},${heightDots},0,`));
    chunks.push(bitmap);
    chunks.push(encoder.encode(`${CRLF}PRINT 1,1${CRLF}`));
  }

  return concatBytes(chunks);
}

/** In thử 1 tem đơn lẻ (dùng cho nút "In thử" ở màn hình Kết nối máy in). */
export async function htmlToTsplCommands(
  bodyHtml: string,
  styleCss: string,
  widthMm: number,
  heightMm: number,
  gapMm: number,
  renderWidthPx: number
): Promise<Uint8Array> {
  return htmlLabelsToTsplCommands([bodyHtml], styleCss, widthMm, heightMm, gapMm, renderWidthPx);
}
