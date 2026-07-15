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

/**
 * Render element ra ảnh (canvas) với chiều rộng cố định theo khổ giấy, rồi trả về
 * toàn bộ chuỗi lệnh ESC/POS sẵn sàng gửi qua USB: khởi tạo → raster ảnh → xuống dòng → cắt giấy.
 */
export async function elementToEscposCommands(
  element: HTMLElement,
  printerDotsWidth = 384 // 384 dots ~ 58mm khổ giấy phổ biến ở 203dpi; đổi 576 nếu máy khổ 80mm
): Promise<Uint8Array> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: printerDotsWidth / element.offsetWidth,
    width: element.offsetWidth,
    windowWidth: element.offsetWidth,
    logging: false,
  });

  // html2canvas có thể lệch vài dot do làm tròn — ép đúng khổ máy in yêu cầu.
  let finalCanvas = canvas;
  if (canvas.width !== printerDotsWidth) {
    const resized = document.createElement('canvas');
    resized.width = printerDotsWidth;
    resized.height = Math.round((canvas.height * printerDotsWidth) / canvas.width);
    const rctx = resized.getContext('2d');
    if (rctx) {
      rctx.fillStyle = '#ffffff';
      rctx.fillRect(0, 0, resized.width, resized.height);
      rctx.drawImage(canvas, 0, 0, resized.width, resized.height);
      finalCanvas = resized;
    }
  }

  const init = new Uint8Array([ESC, 0x40]); // ESC @ — reset máy in
  const raster = canvasToRasterCommand(finalCanvas);
  const feedAndCut = new Uint8Array([0x0a, 0x0a, 0x0a, GS, 0x56, 0x00]); // feed 3 dòng + cắt giấy (full cut)

  return concatBytes([init, raster, feedAndCut]);
}
