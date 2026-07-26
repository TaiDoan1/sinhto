import html2canvas from 'html2canvas';

/**
 * Render 1 phần tử HTML thành ảnh rồi đóng gói thành lệnh ESC/POS raster (GS v 0).
 * In bằng ảnh (thay vì gửi text) để đảm bảo tiếng Việt có dấu luôn hiển thị đúng,
 * bất kể máy in có hỗ trợ bảng mã UTF-8/1258 hay không — máy in chỉ cần vẽ điểm ảnh.
 */

const ESC = 0x1b;
const GS = 0x1d;

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

/** Chuyển canvas sang bitmap đen/trắng 1-bit rồi đóng gói raster theo chuẩn ESC/POS (GS v 0). */
function canvasToRasterCommand(canvas: HTMLCanvasElement): Uint8Array {
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
      const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
      const isDark = a > 128 && luminance < 200;
      if (isDark) {
        const byteIndex = y * widthBytes + (x >> 3);
        bitmap[byteIndex] |= 0x80 >> (x % 8);
      }
    }
  }

  const xL = widthBytes & 0xff;
  const xH = (widthBytes >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;

  const header = new Uint8Array([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
  return concatBytes([header, bitmap]);
}

export const BASE_RENDER_WIDTH_PX = 300;

/**
 * Render HTML trong 1 iframe cô lập hoàn toàn (document riêng, không dính CSS của app) rồi chụp
 * bằng html2canvas. Bắt buộc phải cô lập vì html2canvas không hiểu được hàm màu CSS hiện đại
 * như oklch()/oklab() — nếu render ngay trong trang, nó sẽ "dính" theo CSS global của app (ví dụ
 * Tailwind) và crash với lỗi "unsupported color function". Trong iframe riêng, ta tự viết toàn bộ
 * CSS (chỉ dùng màu hex) nên không thể dính phải oklch từ bất kỳ đâu khác.
 *
 * `renderWidthPx` hẹp hơn BASE_RENDER_WIDTH_PX mặc định sẽ làm chữ (vốn có font-size cố định theo
 * px trong các mẫu bill) chiếm tỉ lệ lớn hơn trong khung render — dùng để phóng to cỡ chữ khi co
 * giãn về khổ giấy thật ở bước sau, không cần sửa từng font-size trong mẫu.
 */
export async function renderIsolatedHtml(
  bodyHtml: string,
  styleCss: string,
  renderWidthPx: number = BASE_RENDER_WIDTH_PX
): Promise<HTMLCanvasElement> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = `${renderWidthPx}px`;
  iframe.style.height = '1px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error('Không tạo được khung render cô lập.');

    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('Không tải được nội dung để render.'));
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              * { box-sizing: border-box; }
              html, body { margin: 0; padding: 0; background: #ffffff; color: #000000; }
              body { font-family: 'Courier New', monospace; width: ${renderWidthPx}px; padding: 8px; }
              ${styleCss}
            </style>
          </head>
          <body>${bodyHtml}</body>
        </html>
      `);
      doc.close();
      // Một số trình duyệt không bắn 'load' cho document.write — resolve dự phòng.
      setTimeout(resolve, 50);
    });

    const body = iframe.contentDocument?.body;
    if (!body) throw new Error('Không đọc được nội dung để render.');

    // Chiều cao thật sau khi nội dung đã dàn trang.
    iframe.style.height = `${body.scrollHeight}px`;

    return await html2canvas(body, {
      backgroundColor: '#ffffff',
      width: renderWidthPx,
      windowWidth: renderWidthPx,
      logging: false,
    });
  } finally {
    document.body.removeChild(iframe);
  }
}

/**
 * Render HTML hóa đơn (đã cô lập CSS) thành ảnh rồi đóng gói thành lệnh ESC/POS raster,
 * sẵn sàng gửi qua USB: khởi tạo → raster ảnh → xuống dòng → cắt giấy.
 */
export async function htmlToEscposCommands(
  bodyHtml: string,
  styleCss: string,
  printerDotsWidth = 384, // 384 dots ~ 58mm khổ giấy phổ biến ở 203dpi; đổi 576 nếu máy khổ 80mm
  renderWidthPx: number = BASE_RENDER_WIDTH_PX
): Promise<Uint8Array> {
  const canvas = await renderIsolatedHtml(bodyHtml, styleCss, renderWidthPx);

  // Scale đúng khổ máy in yêu cầu (canvas gốc render theo renderWidthPx css px, không phải dot thật).
  const resized = document.createElement('canvas');
  resized.width = printerDotsWidth;
  resized.height = Math.round((canvas.height * printerDotsWidth) / canvas.width);
  const rctx = resized.getContext('2d');
  if (!rctx) throw new Error('Không lấy được canvas context');
  rctx.fillStyle = '#ffffff';
  rctx.fillRect(0, 0, resized.width, resized.height);
  rctx.drawImage(canvas, 0, 0, resized.width, resized.height);

  const init = new Uint8Array([ESC, 0x40]); // ESC @ — reset máy in
  const raster = canvasToRasterCommand(resized);
  const feedAndCut = new Uint8Array([0x0a, 0x0a, 0x0a, GS, 0x56, 0x00]); // feed 3 dòng + cắt giấy (full cut)

  return concatBytes([init, raster, feedAndCut]);
}
