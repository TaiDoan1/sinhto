import { useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api';
import { useSSE } from '../contexts/SSEContext';

// Bố cục topping lẻ trên máy POS: gán mỗi topping vào 1 trong 3 NHÓM CỐ ĐỊNH và lưu thứ tự
// hiển thị. Lưu vào 1 setting duy nhất (key theo TÊN topping) nên chạy cho cả topping mặc định
// lẫn topping là sản phẩm, không cần đổi schema DB. (Combo topping là khu riêng, không nằm ở đây.)
export type ToppingGroupKey = 'fruit' | 'sweet' | 'single';
/** Section = nhóm hiển thị trên POS, GỒM cả 'combo' (khu combo topping). Dùng để xếp thứ tự nhóm. */
export type SectionKey = 'combo' | ToppingGroupKey;

export const TOPPING_GROUPS: { key: ToppingGroupKey; label: string; emoji: string }[] = [
  { key: 'fruit', label: 'Trái cây', emoji: '🍓' },
  { key: 'sweet', label: 'Ngọt', emoji: '🍯' },
  { key: 'single', label: 'Lẻ', emoji: '🍬' },
];

/** 4 nhóm hiển thị trên POS (theo thứ tự mặc định). */
export const ALL_SECTIONS: { key: SectionKey; label: string; emoji: string }[] = [
  { key: 'combo', label: 'Combo Topping', emoji: '🌟' },
  { key: 'fruit', label: 'Trái cây', emoji: '🍓' },
  { key: 'sweet', label: 'Ngọt', emoji: '🍯' },
  { key: 'single', label: 'Lẻ', emoji: '🍬' },
];
const DEFAULT_SECTION_ORDER: SectionKey[] = ['combo', 'fruit', 'sweet', 'single'];

export interface ToppingLayout {
  assignments: Record<string, ToppingGroupKey>;
  order: string[];
  /** Thứ tự hiển thị các nhóm trên POS (nhóm số 1 hiện đầu tiên). Trống = mặc định. */
  groupOrder?: SectionKey[];
}

/** Trả 4 nhóm theo đúng thứ tự người dùng đã đặt (groupOrder), thiếu thì dùng mặc định. */
export function orderedSections(layout: ToppingLayout): { key: SectionKey; label: string; emoji: string }[] {
  const go = Array.isArray(layout.groupOrder) && layout.groupOrder.length ? layout.groupOrder : DEFAULT_SECTION_ORDER;
  const rank = (k: SectionKey) => {
    const i = go.indexOf(k);
    return i < 0 ? 999 : i;
  };
  return [...ALL_SECTIONS].sort((a, b) => rank(a.key) - rank(b.key));
}

/** Di chuyển 1 nhóm tới vị trí `toPos` (0-based) trong groupOrder; trả về mảng groupOrder mới. */
export function moveSection(layout: ToppingLayout, key: SectionKey, toPos: number): SectionKey[] {
  const base = Array.isArray(layout.groupOrder) && layout.groupOrder.length
    ? [...layout.groupOrder]
    : [...DEFAULT_SECTION_ORDER];
  // đảm bảo đủ 4 nhóm
  ALL_SECTIONS.forEach((s) => { if (!base.includes(s.key)) base.push(s.key); });
  const from = base.indexOf(key);
  if (from >= 0) base.splice(from, 1);
  base.splice(Math.max(0, Math.min(toPos, base.length)), 0, key);
  return base;
}

const SETTING_KEY = 'posToppingLayout';
const EMPTY: ToppingLayout = { assignments: {}, order: [] };

export function groupKeyOf(name: string, assignments: Record<string, ToppingGroupKey>): ToppingGroupKey {
  return assignments[name] || 'single';
}

/** Nhóm + sắp xếp danh sách topping theo layout. Trả về mảng theo đúng thứ tự TOPPING_GROUPS. */
export function groupToppings<T extends { name: string }>(
  list: T[],
  layout: ToppingLayout
): { key: ToppingGroupKey; label: string; emoji: string; items: T[] }[] {
  const idx = (n: string) => {
    const i = layout.order.indexOf(n);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  const sorted = [...list].sort((a, b) => idx(a.name) - idx(b.name) || a.name.localeCompare(b.name));
  return TOPPING_GROUPS.map((g) => ({
    ...g,
    items: sorted.filter((t) => groupKeyOf(t.name, layout.assignments) === g.key),
  }));
}

/** Đảm bảo mọi tên đều có trong order (bổ sung vào cuối), giữ nguyên thứ tự cũ. */
export function normalizedOrder(order: string[], allNames: string[]): string[] {
  const set = new Set(allNames);
  const base = order.filter((n) => set.has(n));
  const seen = new Set(base);
  const missing = allNames.filter((n) => !seen.has(n));
  return [...base, ...missing];
}

/** Di chuyển 1 topping lên/xuống TRONG NHÓM của nó; trả về mảng order mới. */
export function moveWithinGroup(
  name: string,
  dir: 'up' | 'down',
  list: { name: string }[],
  layout: ToppingLayout
): string[] {
  const grouped = groupToppings(list, layout);
  const g = grouped.find((gr) => gr.items.some((it) => it.name === name));
  if (!g) return layout.order;
  const names = g.items.map((it) => it.name);
  const pos = names.indexOf(name);
  const swapWith = names[pos + (dir === 'up' ? -1 : 1)];
  if (!swapWith) return layout.order;
  const order = normalizedOrder(layout.order, list.map((t) => t.name));
  const i = order.indexOf(name);
  const j = order.indexOf(swapWith);
  [order[i], order[j]] = [order[j], order[i]];
  return order;
}

/** Kéo-thả: đặt `dragged` ngay TRƯỚC `target` trong order; trả về mảng order mới. */
export function reorderByDrop(
  dragged: string,
  target: string,
  list: { name: string }[],
  layout: ToppingLayout
): string[] {
  if (dragged === target) return layout.order;
  const order = normalizedOrder(layout.order, list.map((t) => t.name));
  const from = order.indexOf(dragged);
  if (from < 0) return order;
  order.splice(from, 1);
  const to = order.indexOf(target);
  order.splice(to < 0 ? order.length : to, 0, dragged);
  return order;
}

/** Kéo-thả VÀO 1 nhóm: chuyển `dragged` sang `groupKey` + đặt vị trí (trước `beforeName`, hoặc
 *  cuối nhóm nếu beforeName = null). Trả về layout mới (đổi cả assignments lẫn order). */
export function dropIntoGroup(
  dragged: string,
  groupKey: ToppingGroupKey,
  beforeName: string | null,
  list: { name: string }[],
  layout: ToppingLayout
): ToppingLayout {
  if (!dragged) return layout;
  const assignments = { ...layout.assignments, [dragged]: groupKey };
  const order = normalizedOrder(layout.order, list.map((t) => t.name));
  const from = order.indexOf(dragged);
  if (from >= 0) order.splice(from, 1);
  if (beforeName && beforeName !== dragged) {
    const to = order.indexOf(beforeName);
    order.splice(to < 0 ? order.length : to, 0, dragged);
  } else {
    // Thả vào vùng trống của nhóm → đặt ngay sau item cuối cùng đang thuộc nhóm đó
    let lastIdx = -1;
    order.forEach((n, i) => {
      if (n !== dragged && (assignments[n] || 'single') === groupKey) lastIdx = i;
    });
    order.splice(lastIdx + 1, 0, dragged);
  }
  return { ...layout, assignments, order };
}

export function useToppingLayout() {
  const { subscribe } = useSSE();
  const [layout, setLayout] = useState<ToppingLayout>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .fetchSetting(SETTING_KEY)
      .then((v: any) => {
        if (alive && v && typeof v === 'object') {
          setLayout({
            assignments: v.assignments || {},
            order: Array.isArray(v.order) ? v.order : [],
            groupOrder: Array.isArray(v.groupOrder) ? v.groupOrder : undefined,
          });
        }
      })
      .catch(() => { /* chưa có setting → dùng mặc định (tất cả nhóm Lẻ) */ })
      .finally(() => { if (alive) setLoading(false); });

    const unsub = subscribe('SETTING_UPDATED', (data: { key: string; value: any }) => {
      if (data.key === SETTING_KEY && data.value) {
        setLayout({
          assignments: data.value.assignments || {},
          order: Array.isArray(data.value.order) ? data.value.order : [],
          groupOrder: Array.isArray(data.value.groupOrder) ? data.value.groupOrder : undefined,
        });
      }
    });
    return () => { alive = false; unsub(); };
  }, [subscribe]);

  const save = useCallback(async (next: ToppingLayout) => {
    setLayout(next); // cập nhật ngay (optimistic)
    await api.saveSetting(SETTING_KEY, next);
  }, []);

  return { layout, save, loading };
}
