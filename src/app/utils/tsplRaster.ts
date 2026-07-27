import { renderIsolatedHtml } from './escposRaster';

/**
 * Render HTML thành lệnh TSPL/TSPL2 (chuẩn lệnh phổ biến của máy in tem/nhãn nhiệt như iTP3350
 * — KHÁC với ESC/POS dùng cho máy in bill dạng cuộn giấy). Gửi nhầm ESC/POS cho máy in tem khiến
 * USB kết nối/gửi lệnh vẫn báo thành công nhưng máy hoàn toàn im lặng vì không hiểu lệnh.
 */

const CRLF = '\r\n';

/** Chuyển canvas sang bitmap đen/trắng 1-bit, đóng gói đúng thứ tự byte mà lệnh BITMAP của TSPL yêu cầu. */
function canvasToTsplBitmap(canvas: HTMLCanvasElement): { widthBytes: number; height: number; bitmap: Uint8Array } {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không lấy được canvas context');
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const widthBytes = Math.ceil(width / 8);

  const bitmap = new Uint8Array(widthBytes * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = imageData.data[idx];
      const g = imageData.data[idx + 1];
      const b = imageData.data[idx + 2];
      const a = imageData.data[idx + 3];
      const luminance = r * 0.299 + g * 0.587 + b * 0.114;
      const isDark = a > 128 && luminance < 200;
      // Firmware của máy này hiểu bit=1 là "để trắng" và bit=0 là "in đen" — ngược với quy ước
      // ESC/POS raster thông thường (bit=1 = in đen). Không đảo lại thì tem ra nền đen chữ trắng.
      if (!isDark) {
        const byteIndex = y * widthBytes + (x >> 3);
        bitmap[byteIndex] |= 0x80 >> (x % 8);
      }
    }
  }

  return { widthBytes, height, bitmap };
}

function dotsForMm(mm: number, dpi = 203): number {
  return Math.round((mm / 25.4) * dpi);
}

function mmForDots(dots: number, dpi = 203): number {
  return dots / dpi * 25.4;
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

/**
 * Render HTML tem thành lệnh TSPL sẵn sàng gửi qua USB. Coi cuộn tem là giấy liên tục (GAP 0mm)
 * vì code hiện tại in nhiều tem của 1 đơn gộp thành 1 ảnh dài duy nhất (không tách rời từng
 * nhãn có gap cảm biến) — khớp với cách máy in tem nhiệt trực tiếp giá rẻ loại này hay dùng.
 */
export async function htmlToTsplCommands(
  bodyHtml: string,
  styleCss: string,
  widthMm: number,
  renderWidthPx: number
): Promise<Uint8Array> {
  const widthDots = dotsForMm(widthMm);
  const canvas = await renderIsolatedHtml(bodyHtml, styleCss, renderWidthPx);

  // Co giãn đúng bề rộng thật của tem (canvas gốc render theo renderWidthPx css px, không phải dot thật).
  const resized = document.createElement('canvas');
  resized.width = widthDots;
  resized.height = Math.round((canvas.height * widthDots) / canvas.width);
  const rctx = resized.getContext('2d');
  if (!rctx) throw new Error('Không lấy được canvas context');
  rctx.fillStyle = '#ffffff';
  rctx.fillRect(0, 0, resized.width, resized.height);
  rctx.drawImage(canvas, 0, 0, resized.width, resized.height);

  const { widthBytes, height, bitmap } = canvasToTsplBitmap(resized);
  // Dư 2mm cuối tem để chắc chắn không bị cắt mất đáy nội dung khi máy tính sai lệch làm tròn.
  const heightMm = mmForDots(height) + 2;

  const encoder = new TextEncoder();
  const header = encoder.encode(
    `SIZE ${widthMm} mm, ${heightMm.toFixed(1)} mm${CRLF}` +
    `GAP 0 mm, 0 mm${CRLF}` +
    `DIRECTION 1${CRLF}` +
    `CLS${CRLF}` +
    `BITMAP 0,0,${widthBytes},${height},0,`
  );
  const footer = encoder.encode(`${CRLF}PRINT 1,1${CRLF}`);

  return concatBytes([header, bitmap, footer]);
}
