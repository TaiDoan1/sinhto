// Render nội dung "Sách menu" thành trang HTML đẹp (thay ảnh menu). Trang dựng ở kích thước
// thiết kế cố định 620×898 (tỉ lệ ~ ảnh menu gốc) rồi được scale vừa khung flipbook ở
// CustomerLanding — nhờ vậy bố cục luôn cân đối trên mọi màn hình.
import type { MenuBookData, FlavourTag } from '../../config/menuBook';
import { BRAND } from './landing/brand';
import { LANDING_IMAGES } from '../../config/images';

export const MENU_PAGE_W = 560;
export const MENU_PAGE_H = 1160;

// Bìa sách — lấp đầy trang (không dùng khung 560×898 cố định như trang menu) để phủ trọn màn
// hình trên điện thoại. Logo lớn ở giữa + tagline + hướng dẫn vuốt lật.
export function MenuBookCover({ data }: { data: MenuBookData }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(160deg, #0d530e 0%, #0b7a3e 60%, #0d530e 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '9% 8%',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* khung viền trang trí */}
      <div style={{ position: 'absolute', inset: '16px', border: '1.5px solid rgba(255,255,255,.28)', borderRadius: 10, pointerEvents: 'none' }} />

      <img src={LANDING_IMAGES.logo} alt="FitBlend" style={{ height: '24%', width: 'auto', maxWidth: '82%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
      <div style={{ letterSpacing: '0.3em', fontWeight: 800, fontSize: 14, opacity: 0.92, marginTop: 20 }}>{data.tagline}</div>

      <div style={{ width: 50, height: 2, background: 'rgba(255,255,255,.5)', margin: '22px 0' }} />

      <div style={{ fontWeight: 900, fontSize: 46, letterSpacing: '0.1em', lineHeight: 1 }}>MENU</div>
      <div style={{ fontSize: 12.5, opacity: 0.78, marginTop: 10, letterSpacing: '0.04em' }}>
        {data.flavours.length} vị · Protein cao · Tươi mỗi ngày
      </div>

      <span
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '6%',
          transform: 'translateX(-50%)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          whiteSpace: 'nowrap',
          fontSize: 13,
          fontWeight: 700,
          color: '#0d530e',
          background: '#fff',
          borderRadius: 999,
          padding: '9px 18px',
          boxShadow: '0 6px 18px rgba(0,0,0,.25)',
        }}
      >
        👉 Vuốt / chạm để lật như sách
      </span>
    </div>
  );
}

const TAG_STYLE: Record<FlavourTag, { label: string; bg: string }> = {
  hot: { label: 'BÁN CHẠY', bg: '#e0701f' },
  try: { label: 'PHẢI THỬ', bg: '#6b3f8c' },
  new: { label: 'MỚI', bg: '#d6336c' },
};

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: MENU_PAGE_W,
        height: MENU_PAGE_H,
        background: '#fffdf7',
        color: BRAND.ink,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        padding: '22px 24px 14px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}

function Header({ data, right }: { data: MenuBookData; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <img src={LANDING_IMAGES.logo} alt="FitBlend" style={{ height: 46, width: 'auto', objectFit: 'contain', alignSelf: 'flex-start' }} />
        <span style={{ fontSize: 11, letterSpacing: '0.12em', color: '#6b7b70', marginTop: 4, fontWeight: 700 }}>{data.tagline}</span>
      </div>
      {right}
    </div>
  );
}

function SectionTitle({ vi, en, note }: { vi: string; en: string; note?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '14px 0 10px' }}>
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: BRAND.green, letterSpacing: '0.01em' }}>{vi}</h3>
      <span style={{ fontSize: 12, fontStyle: 'italic', color: '#8a9990' }}>/ {en}</span>
      {note && <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, color: '#8a9990' }}>{note}</span>}
    </div>
  );
}

function Branches({ data }: { data: MenuBookData }) {
  return (
    <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(0,0,0,.08)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <b style={{ fontSize: 12.5, color: BRAND.green }}>{data.branches.length} CHI NHÁNH</b>
        <span style={{ fontSize: 10, fontStyle: 'italic', color: '#8a9990' }}>/ {data.branches.length} Branches</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {data.branches.map((b) => (
          <div key={b.district} style={{ fontSize: 9 }}>
            <div style={{ fontWeight: 800, color: BRAND.ink }}>{b.district}</div>
            <div style={{ color: '#444' }}>{b.address}</div>
            <div style={{ color: '#777' }}>{b.ward}</div>
            <div style={{ fontWeight: 700, color: BRAND.green, marginTop: 2 }}>{b.note}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, background: '#1a1a1a', color: '#fff', borderRadius: 8, padding: '7px 12px' }}>
        <span style={{ fontStyle: 'italic', fontWeight: 800, fontSize: 12 }}>Đặt ngay / Order now</span>
        <b style={{ fontSize: 14, letterSpacing: '0.04em' }}>{data.phone}</b>
        <span style={{ fontSize: 9, textAlign: 'right', opacity: 0.85 }}>{data.web}<br />Zalo OA: {data.zalo}</span>
      </div>
    </div>
  );
}

export function MenuBookPage1({ data }: { data: MenuBookData }) {
  const left = data.singleToppings.slice(0, 8);
  const right = data.singleToppings.slice(8);
  return (
    <PageFrame>
      <Header
        data={data}
        right={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid rgba(0,0,0,.15)', borderRadius: 999, padding: '5px 11px', fontSize: 10.5, fontWeight: 800, color: BRAND.ink }}>
            ★ TIẾT KIỆM HƠN MUA LẺ
          </span>
        }
      />

      <SectionTitle vi="COMBO TOPPING" en="Curated combos" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {data.comboToppings.map((c) => (
          <div key={c.no} style={{ background: `${c.color}0f`, border: `1px solid ${c.color}33`, borderRadius: 12, padding: '9px 11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ background: c.color, color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 900, padding: '2px 6px' }}>{c.no}</span>
              <b style={{ fontSize: 13.5, color: c.color }}>{c.name}</b>
            </div>
            <div style={{ fontSize: 10, marginTop: 4, color: '#333', fontWeight: 600 }}>{c.ingredients}</div>
            <div style={{ fontSize: 8.5, fontStyle: 'italic', color: '#999' }}>/ {c.ingredientsEn}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: c.color }}>{c.stat}</div>
                <div style={{ fontSize: 8, fontStyle: 'italic', color: '#aaa' }}>/ {c.statEn}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.price}</span>
                <div style={{ fontSize: 8, color: '#aaa', textDecoration: 'line-through' }}>{c.was}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle vi="TOPPING ĐƠN LẺ" en="Single toppings" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 22px' }}>
        {[left, right].map((col, ci) => (
          <div key={ci}>
            {col.map((t) => (
              <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 0', borderBottom: '1px dotted rgba(0,0,0,.08)' }}>
                <span>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{t.name}</span>
                  <span style={{ fontSize: 8.5, fontStyle: 'italic', color: '#999', marginLeft: 5 }}>{t.nameEn}</span>
                </span>
                <b style={{ fontSize: 11, color: t.price === 'FREE' ? BRAND.green : BRAND.ink }}>{t.price}</b>
              </div>
            ))}
          </div>
        ))}
      </div>

      <SectionTitle vi="HƯỚNG DẪN CHỌN GÓI" en="Which plan fits you?" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {data.plans.map((p) => (
          <div key={p.title} style={{ background: `${p.color}0f`, borderTop: `3px solid ${p.color}`, borderRadius: '2px 2px 8px 8px', padding: '8px 9px' }}>
            <b style={{ fontSize: 10.5, color: p.color, display: 'block' }}>{p.title}</b>
            <span style={{ fontSize: 8.5, fontStyle: 'italic', color: '#999' }}>/ {p.titleEn}</span>
            <ul style={{ margin: '6px 0', padding: 0, listStyle: 'none' }}>
              {p.bullets.map((b) => (
                <li key={b.vi} style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 600 }}>— {b.vi}</div>
                  <div style={{ fontSize: 8, fontStyle: 'italic', color: '#aaa', paddingLeft: 8 }}>{b.en}</div>
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 8, color: '#999', fontWeight: 700 }}>SIZE GỢI Ý</div>
            <b style={{ fontSize: 11, color: p.color }}>{p.size}</b>
          </div>
        ))}
      </div>

      <Branches data={data} />
    </PageFrame>
  );
}

export function MenuBookPage2({ data }: { data: MenuBookData }) {
  return (
    <PageFrame>
      <Header
        data={data}
        right={
          <div style={{ textAlign: 'right' }}>
            <div><span style={{ fontSize: 22, fontWeight: 900, color: BRAND.ink }}>{data.flavoursTitle}</span> <span style={{ fontSize: 11, fontStyle: 'italic', color: '#8a9990' }}>/ {data.flavours.length} Flavours</span></div>
            <div style={{ fontSize: 9, color: '#8a9990', marginTop: 2 }}>Không syrup · Protein cao · Tươi mỗi ngày</div>
          </div>
        }
      />

      <div style={{ background: BRAND.green, color: '#fff', borderRadius: 8, padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <b style={{ fontSize: 16 }}>{data.flavoursTitle} <span style={{ fontSize: 10, fontStyle: 'italic', opacity: 0.85 }}>/ {data.flavours.length} Flavours</span></b>
        <i style={{ fontSize: 12 }}>{data.flavoursNote}</i>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '3px 8px' }}>
        {data.flavours.map((f) => (
          <div key={f.no} style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 8, color: '#bbb', fontWeight: 700, width: 12, flex: 'none' }}>{f.no}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, lineHeight: 1.25, color: f.tag ? TAG_STYLE[f.tag].bg : BRAND.ink }}>
                {f.name}
                {f.tag && (
                  <span style={{ fontSize: 7, fontWeight: 800, color: TAG_STYLE[f.tag].bg, marginLeft: 3, whiteSpace: 'nowrap' }}>
                    · {TAG_STYLE[f.tag].label}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 8, fontStyle: 'italic', color: '#aaa', lineHeight: 1.2 }}>{f.nameEn}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '8px 0', fontSize: 8, color: '#777' }}>
        {(['hot', 'try', 'new'] as FlavourTag[]).map((t) => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 8, fontWeight: 800, color: TAG_STYLE[t].bg }}>{TAG_STYLE[t].label}</span>
            {t === 'hot' ? 'Bestseller' : t === 'try' ? 'Must try' : 'New'}
          </span>
        ))}
      </div>

      <div style={{ background: '#152238', color: '#fff', borderRadius: '8px 8px 0 0', padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b style={{ fontSize: 15 }}>{data.sizesTitle} <span style={{ fontSize: 9, fontStyle: 'italic', opacity: 0.8 }}>/ Retail price</span></b>
        <span style={{ fontSize: 9.5 }}>{data.sizesNote}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, background: '#f4f6f8', padding: 8, borderRadius: '0 0 8px 8px' }}>
        {data.sizes.map((s) => (
          <div key={s.name} style={{ background: '#fff', borderRadius: 8, padding: '7px 8px', border: '1px solid #e6eaee' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: s.color }}>{s.name}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.ml}<span style={{ fontSize: 10 }}> ml</span></div>
            <div style={{ fontSize: 8.5, fontWeight: 700, marginTop: 2 }}>{s.desc}</div>
            <div style={{ fontSize: 7.5, fontStyle: 'italic', color: '#aaa', marginBottom: 4 }}>{s.descEn}</div>
            {s.rows.map((r) => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4, fontSize: 9, borderTop: '1px dotted #ddd', paddingTop: 2 }}>
                <span style={{ color: '#666', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                <b style={{ color: s.color, whiteSpace: 'nowrap', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.price}</b>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 6px' }}>
        <b style={{ fontSize: 15, color: BRAND.ink }}>{data.savingsTitle} <span style={{ fontSize: 9, fontStyle: 'italic', color: '#999' }}>/ Savings combo</span></b>
        <span style={{ marginLeft: 'auto', fontSize: 9.5, color: '#999' }}>{data.savingsNote}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {data.savings.map((s) => (
          <div key={s.title} style={{ background: `${s.color}0f`, border: `1px solid ${s.color}33`, borderRadius: 8, padding: '7px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: 10, color: BRAND.ink }}>{s.title}</b>
              <span style={{ background: s.color, color: '#fff', fontSize: 10, fontWeight: 900, borderRadius: 5, padding: '1px 6px' }}>{s.discount}</span>
            </div>
            <div style={{ fontSize: 7.5, fontStyle: 'italic', color: '#999', marginBottom: 4 }}>/ {s.titleEn}</div>
            {s.rows.map((r) => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4, fontSize: 9.5, padding: '1px 0' }}>
                <span style={{ color: '#555', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                <b style={{ whiteSpace: 'nowrap', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.price}</b>
              </div>
            ))}
            <div style={{ fontSize: 8, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.gift}</div>
          </div>
        ))}
      </div>

      <Branches data={data} />
    </PageFrame>
  );
}
