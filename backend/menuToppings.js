const { removeDiacritics } = require('./vietnamese');

const vi = removeDiacritics;

/** Giữ ID ổn định — chỉ cập nhật giá / thêm TP-16 */
const DEFAULT_TOPPINGS = [
  { id: 'TP-01', name: vi('Sua hat 100%'), price: 15000, image: '🥛' },
  { id: 'TP-02', name: vi('Sua A2'), price: 20000, image: '🥛' },
  { id: 'TP-03', name: vi('Bot dau ha lan'), price: 20000, image: '🫛' },
  { id: 'TP-04', name: 'Whey Gold Standard', price: 39000, image: '💪' },
  { id: 'TP-05', name: 'Collagen', price: 49000, image: '✨' },
  { id: 'TP-06', name: vi('Yen mach'), price: 10000, image: '🌾' },
  { id: 'TP-07', name: vi('Hat chia'), price: 10000, image: '🌾' },
  { id: 'TP-08', name: vi('Dua say gion'), price: 10000, image: '🥥' },
  { id: 'TP-09', name: vi('Co ngot'), price: 10000, image: '🌿' },
  { id: 'TP-10', name: vi('Mat ong'), price: 15000, image: '🍯' },
  { id: 'TP-11', name: vi('Mat mia'), price: 0, image: '🍯' },
  { id: 'TP-12', name: vi('Cha la'), price: 5000, image: '🌴' },
  { id: 'TP-13', name: vi('Bo hanh nhan'), price: 20000, image: '🥜' },
  { id: 'TP-14', name: vi('Bo dau phong'), price: 10000, image: '🥜' },
  { id: 'TP-15', name: vi('Bo hat dieu'), price: 15000, image: '🥜' },
  { id: 'TP-16', name: vi('Hat dac'), price: 10000, image: '🌰' },
];

const DEFAULT_COMBO_TOPPINGS = [
  {
    id: 'healthy-boost',
    name: 'Healthy Boost',
    items: vi('Yen mach + Hat chia + Co ngot'),
    price: 25000,
    originalPrice: 30000,
    save: 5000,
  },
  {
    id: 'protein-plus',
    name: 'Protein Plus',
    items: 'Whey Gold + Sua A2',
    price: 49000,
    originalPrice: 59000,
    save: 10000,
  },
  {
    id: 'beauty-blend',
    name: 'Beauty Blend',
    items: vi('Collagen + Sua hat + Mat ong'),
    price: 65000,
    originalPrice: 79000,
    save: 14000,
  },
  {
    id: 'nutty-crunch',
    name: 'Nutty Crunch',
    items: vi('Bo dau phong + Dua say + Hat dac'),
    price: 29000,
    originalPrice: 35000,
    save: 6000,
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
