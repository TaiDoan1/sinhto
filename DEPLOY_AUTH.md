# Deploy an toàn khi thêm xác thực (không gián đoạn máy POS đang chạy)

Vì web + API chung 1 service, khi bản mới (bắt buộc token) lên, máy POS đang mở bản CŨ sẽ gửi
request KHÔNG token → bị 401. Dùng biến `AUTH_ENFORCE` để chuyển tiếp mượt.

## Biến môi trường cần đặt trên Railway (trước khi deploy)

| Biến | Giá trị | Ý nghĩa |
|---|---|---|
| `JWT_SECRET` | chuỗi ngẫu nhiên dài (>= 32 ký tự) | **BẮT BUỘC.** Khoá ký token. Không đặt = dùng secret dev (mất an toàn). |
| `AUTH_ENFORCE` | `false` (lúc deploy đầu) | Cổng chỉ ghi log, chưa chặn → máy cũ vẫn chạy. |

Tạo secret nhanh:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Quy trình deploy (2 bước, zero-downtime)

### Bước 1 — Deploy với grace mode
1. Đặt `JWT_SECRET=<secret>` và `AUTH_ENFORCE=false` trên Railway.
2. Deploy bản mới.
3. Máy POS/NV đang mở: vẫn hoạt động (cổng chưa chặn). Khi tiện, mỗi máy **tải lại trang + đăng
   nhập lại 1 lần** để nhận token. Dữ liệu ca/đơn ở server, không mất.
4. Theo dõi log Railway: dòng `[AUTH grace] ... thiếu token` cho biết máy nào còn chưa có token.

### Bước 2 — Bật chặn (sau khi mọi máy đã đăng nhập lại, VD hôm sau)
1. Đổi `AUTH_ENFORCE=true` (hoặc xoá hẳn biến — mặc định là chặn).
2. Railway tự restart. Từ đây request thiếu token → 401.
3. Kiểm tra nhanh: `curl -s -o /dev/null -w "%{http_code}" https://<domain>/api/customers` → phải là **401**.

> Muốn deploy đơn giản, chấp nhận gián đoạn vài phút: bỏ qua grace, deploy giờ đóng cửa với
> `AUTH_ENFORCE=true`, rồi báo NV mở POS → F5 → đăng nhập lại.

## Tách domain landing (Phase 2 — đã có sẵn trong code)

Kiến trúc: **1 service Railway, định tuyến theo hostname**. Build tạo 2 bundle tách biệt —
`landing.html` (chỉ code khách) và `index.html` (hệ quản lý). Bundle landing KHÔNG chứa code
admin/pos → F12 trên domain landing không lộ gì về hệ quản lý. API same-origin nên KHÔNG cần CORS.

### Các bước (làm 1 lần)
1. Trỏ 2 domain vào cùng service Railway hiện tại (Railway → Settings → Domains):
   - `fitblend.vn` (+ `www.fitblend.vn`) → **domain khách/landing**.
   - `quanly.fitblend.vn` (tên khó đoán) → **domain quản lý** (admin/pos/nhân viên).
2. Đặt env trên Railway: `LANDING_HOSTS=fitblend.vn,www.fitblend.vn`
   - Domain trong danh sách này: mọi path (kể cả `/admin`, `/pos`) đều trả `landing.html` → hệ
     quản lý KHÔNG truy cập được qua domain khách.
   - Domain khác (quanly...): phục vụ `index.html` như bình thường; nhân viên vào `/admin`, `/pos`.
   - KHÔNG set `LANDING_HOSTS` = giữ nguyên hành vi cũ (1 domain phục vụ tất cả).
3. Build phải chạy `npm run build` (Vite multi-entry tạo cả `dist/landing.html`). Railway dùng
   `build.sh` — đảm bảo nó chạy `vite build`.

### Kiểm tra sau khi trỏ domain
- `https://fitblend.vn/` → trang khách; xem source chỉ thấy `landing-*.js` (không có `main-*.js`).
- `https://fitblend.vn/admin` → vẫn ra trang khách (admin bị chặn khỏi domain này).
- `https://quanly.fitblend.vn/admin` → trang đăng nhập admin.

## Sau go-live (việc bảo mật còn lại)
- Đổi/loại mật khẩu mặc định `123` (seed tạo `nhondo/123` và NV pass `123`).
- Bỏ nhánh so sánh mật khẩu plaintext trong `backend/password.js` sau khi mọi tài khoản đã hash.
- Thêm rate-limit cho `/api/auth/employee-login`.
