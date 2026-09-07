/** Topping lẻ + combo topping — khớp menu in mới (poster "SINH TỐ PROTEIN TƯƠI"). Giữ ID ổn định
 * cho món cũ (chỉ đổi tên/giá khi cần); món mới nối tiếp ID. Tên giữ NGUYÊN DẤU tiếng Việt. */
const DEFAULT_TOPPINGS = [
  { id: 'TP-01', name: 'Sữa hạt 100%', price: 15000, image: '🥛' },
  { id: 'TP-02', name: 'Sữa A2', price: 20000, image: '🥛' },
  { id: 'TP-03', name: 'Bột đậu hà lan', price: 20000, image: '🫛' },
  { id: 'TP-04', name: 'Whey Gold Standard', price: 39000, image: '💪' },
  { id: 'TP-05', name: 'Collagen Vital Protein', price: 49000, image: '✨' },
  { id: 'TP-06', name: 'Yến mạch', price: 10000, image: '🌾' },
  { id: 'TP-07', name: 'Hạt chia', price: 10000, image: '🌾' },
  { id: 'TP-08', name: 'Dừa sấy giòn', price: 10000, image: '🥥' },
  { id: 'TP-09', name: 'Lá cỏ ngọt', price: 10000, image: '🌿' },
  { id: 'TP-10', name: 'Mật ong', price: 15000, image: '🍯' },
  { id: 'TP-11', name: 'Mật mía', price: 0, image: '🍯' },
  { id: 'TP-12', name: 'Chà là', price: 5000, image: '🌴' },
  { id: 'TP-13', name: 'Bơ hạnh nhân', price: 20000, image: '🥜' },
  { id: 'TP-14', name: 'Bơ đậu phộng', price: 10000, image: '🥜' },
  { id: 'TP-15', name: 'Bơ hạt điều', price: 15000, image: '🥜' },
  { id: 'TP-17', name: 'Chuối', price: 10000, image: '🍌' },
  { id: 'TP-18', name: 'Cải Kale', price: 15000, image: '🥬' },
  { id: 'TP-19', name: 'Bơ mè đen', price: 15000, image: '🟤' },
  { id: 'TP-20', name: 'Cần tây', price: 10000, image: '🌱' },
  { id: 'TP-21', name: 'Dưa leo', price: 7000, image: '🥒' },
  { id: 'TP-22', name: 'Bơ hạt macca', price: 25000, image: '🌰' },
  { id: 'TP-23', name: 'Bơ mè', price: 10000, image: '⚪' },
  { id: 'TP-24', name: 'Bơ hạt bí xanh', price: 20000, image: '🟢' },
  { id: 'TP-25', name: 'Bơ hạt hướng dương', price: 15000, image: '🌻' },
  { id: 'TP-26', name: 'Bơ hạt dẻ cười', price: 25000, image: '🥜' },
  { id: 'TP-27', name: 'Bạc hà', price: 15000, image: '🍃' },
];

const DEFAULT_COMBO_TOPPINGS = [
  {
    id: 'healthy-boost',
    name: 'Healthy Boost',
    items: 'Yến mạch + Hạt chia + Cỏ ngọt',
    price: 25000,
    originalPrice: 30000,
    save: 5000,
  },
  {
    id: 'protein-plus',
    name: 'Protein Plus',
    items: 'Whey Gold + Sữa A2',
    price: 49000,
    originalPrice: 59000,
    save: 10000,
  },
  {
    id: 'beauty-blend',
    name: 'Beauty Blend',
    items: 'Collagen + Sữa hạt + Mật ong',
    price: 65000,
    originalPrice: 79000,
    save: 14000,
  },
];

function getToppingProductRows() {
  return DEFAULT_TOPPINGS.map((t) => [t.id, t.name, 'toppings', t.price, t.image, '']);
}

module.exports = {
  DEFAULT_TOPPINGS,
  DEFAULT_COMBO_TOPPINGS,
  getToppingProductRows,
};
