/**
 * Sinh thêm 1 bản HTML tĩnh riêng cho từng cổng (VD /staff) từ dist/index.html gốc sau khi
 * build — CHỈ đổi title/manifest/icon/theme-color ngay trong HTML tĩnh, giữ nguyên thẻ <script>
 * trỏ tới đúng file JS đã build (nên app React chạy y hệt sau khi tải xong).
 *
 * Lý do cần bản tĩnh riêng thay vì chỉ đổi bằng JS lúc chạy (App.tsx vẫn giữ cách đó cho khi
 * chuyển cổng ngay trong 1 phiên đang mở): tính năng "Thêm vào Màn hình chính" của Safari/Chrome
 * đọc title/icon từ HTML TĨNH ban đầu server trả về, không đợi JavaScript chạy xong mới đọc lại
 * — nên nếu chỉ có 1 index.html dùng chung, mọi cổng đều bị đọc nhầm thành cổng đầu tiên (POS).
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const baseHtmlPath = path.join(distDir, 'index.html');

const MODES = [
  {
    outputFile: 'staff.html',
    title: 'FitBlend Nhân Viên',
    manifest: '/manifest-staff.webmanifest',
    icon: '/images/staff-icon.svg',
    themeColor: '#7c3aed',
  },
];

function main() {
  if (!fs.existsSync(baseHtmlPath)) {
    console.warn('generate-mode-html: khong tim thay dist/index.html, bo qua.');
    return;
  }
  const baseHtml = fs.readFileSync(baseHtmlPath, 'utf8');

  for (const mode of MODES) {
    let html = baseHtml;
    html = html.replace(/<title>.*?<\/title>/, `<title>${mode.title}</title>`);
    html = html.replace(/(<link rel="manifest" href=")[^"]*(")/, `$1${mode.manifest}$2`);
    html = html.replace(/(<link rel="icon" href=")[^"]*(" type="image\/svg\+xml")/, `$1${mode.icon}$2`);
    html = html.replace(/(<link rel="apple-touch-icon" href=")[^"]*(")/, `$1${mode.icon}$2`);
    html = html.replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/, `$1${mode.title}$2`);
    html = html.replace(/(<meta name="theme-color" content=")[^"]*(")/, `$1${mode.themeColor}$2`);

    const outputPath = path.join(distDir, mode.outputFile);
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`generate-mode-html: da tao ${mode.outputFile}`);
  }
}

main();
