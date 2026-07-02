/** Công thức nguyên liệu FitBlend — dùng chung Admin / POS / CSKH */

export interface RecipeIngredient {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
}

export interface ProductRecipe {
  productId: string;
  productName: string;
  /** Nguyên liệu cơ bản cho ly 360ml · 40g protein */
  baseIngredients: RecipeIngredient[];
}

const milk = (q = 0.2): RecipeIngredient => ({
  itemId: 'INV-008', itemName: 'Sua tuoi', quantity: q, unit: 'lit',
});
const whey = (q = 1): RecipeIngredient => ({
  itemId: 'INV-010', itemName: 'Whey Protein', quantity: q, unit: 'goi',
});
const fruit = (id: string, name: string, q: number): RecipeIngredient => ({
  itemId: id, itemName: name, quantity: q, unit: 'kg',
});

export const SIZE_MULTIPLIERS: Record<string, number> = {
  '250ml': 0.75,
  '360ml': 1,
  '500ml': 1.25,
  '700ml': 1.5,
};

/** Whey gói theo mức protein (ly 360ml) */
export const PROTEIN_WHEY: Record<number, number> = {
  20: 0.5,
  40: 1,
  60: 1.5,
  90: 2,
};

export const FITBLEND_RECIPES: ProductRecipe[] = [
  { productId: 'SM-01', productName: 'Dau hat chia', baseIngredients: [fruit('INV-001', 'Dau tay', 0.12), milk(), whey()] },
  { productId: 'SM-02', productName: 'Dau chuoi', baseIngredients: [fruit('INV-001', 'Dau tay', 0.08), fruit('INV-003', 'Chuoi', 0.1), milk()] },
  { productId: 'SM-03', productName: 'Mang cau dau', baseIngredients: [fruit('INV-001', 'Dau tay', 0.1), fruit('INV-005', 'Dua', 0.08), milk()] },
  { productId: 'SM-04', productName: 'Dau cam', baseIngredients: [fruit('INV-001', 'Dau tay', 0.1), milk(0.18)] },
  { productId: 'SM-05', productName: 'Dau tam chuoi', baseIngredients: [fruit('INV-024', 'Dau tam', 0.1), fruit('INV-003', 'Chuoi', 0.08), milk()] },
  { productId: 'SM-06', productName: 'Phuc bon tu chuoi', baseIngredients: [fruit('INV-025', 'Phuc bon tu', 0.1), fruit('INV-003', 'Chuoi', 0.08), milk()] },
  { productId: 'SM-07', productName: 'Chuoi hat chia', baseIngredients: [fruit('INV-003', 'Chuoi', 0.15), milk()] },
  { productId: 'SM-08', productName: 'Chanh day chuoi', baseIngredients: [fruit('INV-003', 'Chuoi', 0.12), fruit('INV-005', 'Dua', 0.06), milk()] },
  { productId: 'SM-09', productName: 'Xoai thom', baseIngredients: [fruit('INV-002', 'Xoai', 0.15), fruit('INV-005', 'Dua', 0.05), milk()] },
  { productId: 'SM-10', productName: 'Xoai cam', baseIngredients: [fruit('INV-002', 'Xoai', 0.12), milk(0.18)] },
  { productId: 'SM-11', productName: 'Cacao yen mach', baseIngredients: [fruit('INV-003', 'Chuoi', 0.08), milk(0.15), { itemId: 'INV-016', itemName: 'Yen mach', quantity: 0.03, unit: 'kg' }] },
  { productId: 'SM-12', productName: 'Ca phe chuoi', baseIngredients: [fruit('INV-003', 'Chuoi', 0.12), milk(0.2), whey(0.5)] },
  { productId: 'SM-13', productName: 'Bo', baseIngredients: [fruit('INV-004', 'Bo', 0.18), milk(0.22)] },
  { productId: 'SM-14', productName: 'Bo chuoi', baseIngredients: [fruit('INV-004', 'Bo', 0.15), fruit('INV-003', 'Chuoi', 0.08), milk()] },
  { productId: 'SM-15', productName: 'Matcha', baseIngredients: [milk(0.25), whey(0.5), { itemId: 'INV-007', itemName: 'Rau bina', quantity: 0.02, unit: 'kg' }] },
  { productId: 'SM-16', productName: 'Dau tam yen mach', baseIngredients: [fruit('INV-024', 'Dau tam', 0.1), milk(0.18), { itemId: 'INV-016', itemName: 'Yen mach', quantity: 0.02, unit: 'kg' }] },
  { productId: 'SM-17', productName: 'Phuc bon tu yen mach', baseIngredients: [fruit('INV-025', 'Phuc bon tu', 0.1), milk(0.18), { itemId: 'INV-016', itemName: 'Yen mach', quantity: 0.02, unit: 'kg' }] },
  { productId: 'SM-18', productName: 'Thanh long chuoi', baseIngredients: [fruit('INV-026', 'Thanh long', 0.12), fruit('INV-003', 'Chuoi', 0.08), milk()] },
  { productId: 'SM-19', productName: 'Thanh long yen mach', baseIngredients: [fruit('INV-026', 'Thanh long', 0.12), milk(0.18), { itemId: 'INV-016', itemName: 'Yen mach', quantity: 0.02, unit: 'kg' }] },
  { productId: 'SM-20', productName: 'Xoai dau', baseIngredients: [fruit('INV-002', 'Xoai', 0.1), fruit('INV-001', 'Dau tay', 0.06), milk()] },
  { productId: 'SM-21', productName: 'Xoai chuoi', baseIngredients: [fruit('INV-002', 'Xoai', 0.1), fruit('INV-003', 'Chuoi', 0.08), milk()] },
  { productId: 'SM-22', productName: 'Cacao chuoi', baseIngredients: [fruit('INV-003', 'Chuoi', 0.12), milk(0.18)] },
  { productId: 'SM-23', productName: 'Matcha chuoi', baseIngredients: [fruit('INV-003', 'Chuoi', 0.1), milk(0.2), whey(0.5)] },
  { productId: 'SM-24', productName: 'Matcha yen mach', baseIngredients: [milk(0.2), whey(0.5), { itemId: 'INV-016', itemName: 'Yen mach', quantity: 0.02, unit: 'kg' }] },
];

/** Topping menu → nguyên liệu kho (mỗi lần thêm) */
export const TOPPING_STOCK_MAP: Record<string, RecipeIngredient> = {
  'Sua hat 100%': { itemId: 'INV-008', itemName: 'Sua tuoi', quantity: 0.05, unit: 'lit' },
  'Sua A2': { itemId: 'INV-012', itemName: 'Sua A2', quantity: 0.05, unit: 'lit' },
  'Bot dau ha lan': { itemId: 'INV-013', itemName: 'Bot dau ha lan', quantity: 0.02, unit: 'kg' },
  'Whey Gold Standard': { itemId: 'INV-010', itemName: 'Whey Protein', quantity: 1, unit: 'goi' },
  'Collagen': { itemId: 'INV-015', itemName: 'Collagen', quantity: 1, unit: 'goi' },
  'Yen mach': { itemId: 'INV-016', itemName: 'Yen mach', quantity: 0.02, unit: 'kg' },
  'Hat chia': { itemId: 'INV-017', itemName: 'Hat chia', quantity: 0.01, unit: 'kg' },
  'Dua say gion': { itemId: 'INV-018', itemName: 'Dua say', quantity: 0.015, unit: 'kg' },
  'Co ngot': { itemId: 'INV-019', itemName: 'Co ngot', quantity: 0.005, unit: 'kg' },
  'Mat ong': { itemId: 'INV-014', itemName: 'Mat ong', quantity: 0.015, unit: 'lit' },
  'Mat mia': { itemId: 'INV-020', itemName: 'Mat mia', quantity: 0.01, unit: 'lit' },
  'Cha la': { itemId: 'INV-021', itemName: 'Cha la', quantity: 0.01, unit: 'kg' },
  'Bo hanh nhan': { itemId: 'INV-022', itemName: 'Bo hat', quantity: 0.015, unit: 'kg' },
  'Bo dau phong': { itemId: 'INV-022', itemName: 'Bo hat', quantity: 0.02, unit: 'kg' },
  'Bo hat dieu': { itemId: 'INV-022', itemName: 'Bo hat', quantity: 0.015, unit: 'kg' },
  'Hat dac': { itemId: 'INV-023', itemName: 'Hat dac', quantity: 0.015, unit: 'kg' },
};

/** Chuẩn hóa tên topping (có dấu / không dấu) */
function normName(s: string) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

const TOPPING_LOOKUP = Object.fromEntries(
  Object.entries(TOPPING_STOCK_MAP).map(([k, v]) => [normName(k), v])
);

export interface CartStockLine {
  productId?: string;
  productName?: string;
  name?: string;
  size?: string;
  protein?: number;
  toppings?: string[];
  quantity?: number;
  isCustomCombo?: boolean;
}

export function findRecipe(productId?: string, productName?: string): ProductRecipe | undefined {
  if (productId) {
    const byId = FITBLEND_RECIPES.find((r) => r.productId === productId);
    if (byId) return byId;
  }
  if (productName) {
    const n = normName(productName);
    return FITBLEND_RECIPES.find(
      (r) => normName(r.productName) === n || n.includes(normName(r.productName))
    );
  }
  return undefined;
}

export function lineToIngredients(line: CartStockLine): RecipeIngredient[] {
  if (line.isCustomCombo) return []; // combo gói — không trừ NVL lẻ tại POS

  const recipe = findRecipe(line.productId, line.productName || line.name);
  if (!recipe) return [];

  const sizeMul = SIZE_MULTIPLIERS[line.size || '360ml'] ?? 1;
  const protein = line.protein ?? 40;
  const wheyQty = (PROTEIN_WHEY[protein] ?? 1) * sizeMul;
  const qty = line.quantity ?? 1;

  const merged = new Map<string, RecipeIngredient>();

  const add = (ing: RecipeIngredient, mult = 1) => {
    const q = ing.quantity * mult * qty;
    const prev = merged.get(ing.itemId);
    if (prev) prev.quantity += q;
    else merged.set(ing.itemId, { ...ing, quantity: q });
  };

  for (const ing of recipe.baseIngredients) {
    if (ing.itemId === 'INV-010') add(ing, wheyQty);
    else add(ing, sizeMul);
  }

  for (const top of line.toppings || []) {
    const clean = top.replace(/^Combo Topping:\s*/i, '').trim();
    const ing = TOPPING_LOOKUP[normName(clean)];
    if (ing) add(ing, 1);
    else {
      for (const [key, val] of Object.entries(TOPPING_LOOKUP)) {
        if (normName(clean).includes(key) || key.includes(normName(clean))) {
          add(val, 1);
          break;
        }
      }
    }
  }

  return [...merged.values()];
}

export function aggregateIngredients(lines: CartStockLine[]): RecipeIngredient[] {
  const merged = new Map<string, RecipeIngredient>();
  for (const line of lines) {
    for (const ing of lineToIngredients(line)) {
      const prev = merged.get(ing.itemId);
      if (prev) prev.quantity += ing.quantity;
      else merged.set(ing.itemId, { ...ing });
    }
  }
  return [...merged.values()];
}

export interface StockShortage {
  itemId: string;
  itemName: string;
  need: number;
  have: number;
  unit: string;
}

export function checkStockAvailability(
  lines: CartStockLine[],
  inventory: { id: string; name: string; currentStock: number; unit: string }[]
): { ok: boolean; shortages: StockShortage[] } {
  const needed = aggregateIngredients(lines);
  const shortages: StockShortage[] = [];

  for (const ing of needed) {
    const inv = inventory.find((i) => i.id === ing.itemId);
    const have = inv?.currentStock ?? 0;
    if (have < ing.quantity - 1e-6) {
      shortages.push({
        itemId: ing.itemId,
        itemName: inv?.name || ing.itemName,
        need: ing.quantity,
        have,
        unit: inv?.unit || ing.unit,
      });
    }
  }

  return { ok: shortages.length === 0, shortages };
}
