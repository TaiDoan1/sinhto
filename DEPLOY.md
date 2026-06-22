# Huong dan deploy chi phi thap ($0/thang)

Stack: **Supabase** (DB) + **Render** (API) + **Vercel** (giao dien)

---

## Buoc 0: Chuan bi

- Tai khoan GitHub (code da push len GitHub)
- Tai khoan mien phi: [Supabase](https://supabase.com), [Render](https://render.com), [Vercel](https://vercel.com)

---

## Buoc 1: Supabase — Database

1. Vao [supabase.com](https://supabase.com) → **New project**
2. Chon region **Southeast Asia (Singapore)**
3. Dat ten project, mat khau database (luu lai!)
4. Doi project tao xong (~2 phut)
5. Vao **Project Settings** (icon banh rang) → **Database**
6. Phan **Connection string** → tab **URI**
7. Chon **Session pooler** → copy chuoi ket noi
8. Thay `[YOUR-PASSWORD]` bang mat khau vua tao

Vi du:
```
postgresql://postgres.abcdefgh:[MAT_KHAU]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### (Tuy chon) Import du lieu SQLite cu

Tren may local, sua file `backend/.env`:
```env
DATABASE_URL=<chuoi Supabase vua copy>
```

Chay:
```bash
cd backend && npm install
npm run migrate:sqlite
```

### Kiem tra

Vao Supabase → **Table Editor** — se thay bang `employees`, `products`, `orders`...

---

## Buoc 2: Render — Backend API

1. Vao [render.com](https://render.com) → dang nhap bang GitHub
2. **New +** → **Blueprint** (neu co `render.yaml`) HOAC **Web Service**
3. Ket noi repo GitHub cua ban

### Neu dung Web Service (thu cong)

| Truong | Gia tri |
|--------|---------|
| Name | `fitblend-api` (hoac ten ban muon) |
| Region | Singapore (neu co) |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | **Free** |

### Bien moi truong (Environment Variables)

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Chuoi Supabase buoc 1 |
| `NODE_ENV` | `production` |

4. Bam **Create Web Service**
5. Doi deploy xong (~3-5 phut)
6. Copy URL backend, vi du: `https://fitblend-api.onrender.com`
7. Kiem tra: mo `https://fitblend-api.onrender.com/api/health` → thay `{"ok":true,...}`

**Luu y Render Free:** server "ngu" sau ~15 phut khong co ai goi. Lan dau mo sau do cham ~30-60 giay.

---

## Buoc 3: Vercel — Frontend

1. Sua file `vercel.json` o thu muc goc project:
   - Thay `REPLACE_ME` bang ten service Render cua ban
   - Vi du URL la `https://fitblend-api.onrender.com` thi destination la:
     `https://fitblend-api.onrender.com/api/:path*`

2. Push len GitHub:
```bash
git add vercel.json
git commit -m "Configure Vercel proxy to Render API"
git push
```

3. Vao [vercel.com](https://vercel.com) → **Add New Project**
4. Import repo GitHub
5. Cau hinh:

| Truong | Gia tri |
|--------|---------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Root Directory | `.` (goc repo) |

6. Bam **Deploy**
7. Khi xong, copy URL Vercel, vi du: `https://fitblend-xxx.vercel.app`

### Kiem tra

- Mo URL Vercel → vao Admin / POS
- Dang nhap nhan vien (username `vanan`, password `123`)
- Tao don hang thu → kiem tra Supabase bang `orders` co dong moi

---

## Buoc 4: Dung tren nhieu may

Tren moi may (POS, Admin, dien thoai staff):

1. Mo trinh duyet → vao URL Vercel
2. **Staff app:** them vao man hinh chinh (Add to Home Screen)
3. Tat ca may dung **cung 1 URL** — du lieu dong bo qua Supabase

Khong can cai gi them tren tung may.

---

## Sua loi thuong gap

### Backend khong start / crash

- Kiem tra `DATABASE_URL` dung, co mat khau, dung Session pooler
- Xem log tren Render → **Logs**

### Frontend goi API loi 502 / CORS

- Kiem tra `vercel.json` da thay `REPLACE_ME` dung URL Render
- Redeploy Vercel sau khi sua `vercel.json`

### Du lieu trong nhung may khac khong khop

- Tat ca phai qua URL Vercel (khong mo `localhost`)
- Kiem tra Supabase Table Editor — data co tang khong

### Anh upload mat

- Render Free xoa file khi redeploy
- Nang cap sau: Supabase Storage (mien phi 1GB)

---

## Nang cap khi can (~$7/thang)

Render → Settings → chuyen **Free** sang **Starter** ($7/th):
- Khong bi "ngu" khi idle
- POS phan hoi nhanh hon luc dau ca

---

## Tom tat URL can luu

| Muc | URL |
|-----|-----|
| Ung dung (mo tren may) | `https://xxx.vercel.app` |
| API (chi de debug) | `https://xxx.onrender.com` |
| Database | Supabase Dashboard |
