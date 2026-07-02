/** Topping đơn lẻ + combo topping — khớp menu in (menu1.jpg) */

export interface MenuTopping {
  name: string;
  price: number;
}

export interface MenuComboTopping {
  id: string;
  name: string;
  items: string;
  price: number;
  originalPrice: number;
  save: number;
  image?: string;
}

export interface MenuToppingProduct {
  id: string;
  name: string;
  category: 'toppings';
  basePrice: number;
  image: string;
  description: string;
}

/** Giữ ID ổn định với DB — thứ tự hiển thị theo menu in */
export const DEFAULT_TOPPINGS: MenuTopping[] = [
  { name: 'Mật mía', price: 0 },
  { name: 'Whey Gold Standard', price: 39000 },
  { name: 'Dừa sấy giòn', price: 10000 },
  { name: 'Bơ đậu phộng', price: 10000 },
  { name: 'Sữa hạt 100%', price: 15000 },
  { name: 'Collagen', price: 49000 },
  { name: 'Cỏ ngọt', price: 10000 },
  { name: 'Bơ hạnh nhân', price: 20000 },
  { name: 'Sữa A2', price: 20000 },
  { name: 'Yến mạch', price: 10000 },
  { name: 'Mật ong', price: 15000 },
  { name: 'Bơ hạt điều', price: 15000 },
  { name: 'Bột đậu hà lan', price: 20000 },
  { name: 'Hạt chia', price: 10000 },
  { name: 'Chà là', price: 5000 },
  { name: 'Hạt đác', price: 10000 },
];

export const DEFAULT_COMBO_TOPPINGS: MenuComboTopping[] = [
  {
    id: 'healthy-boost',
    name: 'Healthy Boost',
    items: 'Yến mạch + Hạt chia + Cỏ ngọt',
    price: 25000,
    originalPrice: 30000,
    save: 5000,
    image: '🌿',
  },
  {
    id: 'protein-plus',
    name: 'Protein Plus',
    items: 'Whey Gold + Sữa A2',
    price: 49000,
    originalPrice: 59000,
    save: 10000,
    image: '💪',
  },
  {
    id: 'beauty-blend',
    name: 'Beauty Blend',
    items: 'Collagen + Sữa hạt + Mật ong',
    price: 65000,
    originalPrice: 79000,
    save: 14000,
    image: '✨',
  },
  {
    id: 'nutty-crunch',
    name: 'Nutty Crunch',
    items: 'Bơ đậu phộng + Dừa sấy + Hạt đác',
    price: 29000,
    originalPrice: 35000,
    save: 6000,
    image: '🥜',
  },
];

const TOPPING_ID_BY_NAME: Record<string, string> = {
  'Sữa hạt 100%': 'TP-01',
  'Sữa A2': 'TP-02',
  'Bột đậu hà lan': 'TP-03',
  'Whey Gold Standard': 'TP-04',
  Collagen: 'TP-05',
  'Yến mạch': 'TP-06',
  'Hạt chia': 'TP-07',
  'Dừa sấy giòn': 'TP-08',
  'Cỏ ngọt': 'TP-09',
  'Mật ong': 'TP-10',
  'Mật mía': 'TP-11',
  'Chà là': 'TP-12',
  'Bơ hạnh nhân': 'TP-13',
  'Bơ đậu phộng': 'TP-14',
  'Bơ hạt điều': 'TP-15',
  'Hạt đác': 'TP-16',
};

const TOPPING_IMAGES: Record<string, string> = {
  'Mật mía': '🍯',
  'Whey Gold Standard': '💪',
  'Dừa sấy giòn': '🥥',
  'Bơ đậu phộng': '🥜',
  'Sữa hạt 100%': '🥛',
  Collagen: '✨',
  'Cỏ ngọt': '🌿',
  'Bơ hạnh nhân': '🥜',
  'Sữa A2': '🥛',
  'Yến mạch': '🌾',
  'Mật ong': '🍯',
  'Bơ hạt điều': '🥜',
  'Bột đậu hà lan': '🫛',
  'Hạt chia': '🌾',
  'Chà là': '🌴',
  'Hạt đác': '🌰',
};

export const DEFAULT_TOPPING_PRODUCTS: MenuToppingProduct[] = DEFAULT_TOPPINGS.map((t) => ({
  id: TOPPING_ID_BY_NAME[t.name] || `TP-${t.name}`,
  name: t.name,
  category: 'toppings',
  basePrice: t.price,
  image: TOPPING_IMAGES[t.name] || '🍯',
  description: '',
}));

export function formatToppingPrice(price: number): string {
  return price <= 0 ? 'Miễn phí' : `+${price.toLocaleString('vi-VN')}đ`;
}
