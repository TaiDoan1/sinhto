const { removeDiacritics } = require('./vietnamese');
const { PRODUCT } = require('./imagePaths');

const vi = removeDiacritics;

/** 24 vị smoothie — khớp menu2.jpg, basePrice = 0 (giá theo size/protein) */
const DEFAULT_SMOOTHIE_FLAVORS = [
  { id: 'SM-01', name: vi('Dau hat chia'), image: PRODUCT.strawberry, description: 'Strawberry Chia' },
  { id: 'SM-02', name: vi('Dau chuoi'), image: PRODUCT.strawberry, description: 'Strawberry Banana' },
  { id: 'SM-03', name: vi('Mang cau dau'), image: PRODUCT.strawberry, description: 'Soursop Strawberry' },
  { id: 'SM-04', name: vi('Dau cam'), image: PRODUCT.strawberry, description: 'Strawberry Orange' },
  { id: 'SM-05', name: vi('Dau tam chuoi'), image: PRODUCT.strawberry, description: 'Mulberry Banana' },
  { id: 'SM-06', name: vi('Phuc bon tu chuoi'), image: PRODUCT.strawberry, description: 'Raspberry Banana' },
  { id: 'SM-07', name: vi('Chuoi hat chia'), image: PRODUCT.cacaoOat, description: 'Banana Chia' },
  { id: 'SM-08', name: vi('Chanh day chuoi'), image: PRODUCT.mango, description: 'Passionfruit Banana' },
  { id: 'SM-09', name: vi('Xoai thom'), image: PRODUCT.mango, description: 'Mango Pineapple' },
  { id: 'SM-10', name: vi('Xoai cam'), image: PRODUCT.mango, description: 'Mango Orange' },
  { id: 'SM-11', name: vi('Cacao yen mach'), image: PRODUCT.cacaoOat, description: 'Cacao Oat' },
  { id: 'SM-12', name: vi('Ca phe chuoi'), image: PRODUCT.cacaoOat, description: 'Coffee Banana' },
  { id: 'SM-13', name: vi('Bo'), image: PRODUCT.hero, description: 'Avocado' },
  { id: 'SM-14', name: vi('Bo chuoi'), image: PRODUCT.hero, description: 'Avocado Banana' },
  { id: 'SM-15', name: 'Matcha', image: PRODUCT.hero, description: 'Matcha' },
  { id: 'SM-16', name: vi('Dau tam yen mach'), image: PRODUCT.strawberry, description: 'Mulberry Oat' },
  { id: 'SM-17', name: vi('Phuc bon tu yen mach'), image: PRODUCT.strawberry, description: 'Raspberry Oat' },
  { id: 'SM-18', name: vi('Thanh long chuoi'), image: PRODUCT.mango, description: 'Dragonfruit Banana' },
  { id: 'SM-19', name: vi('Thanh long yen mach'), image: PRODUCT.mango, description: 'Dragonfruit Oat' },
  { id: 'SM-20', name: vi('Xoai dau'), image: PRODUCT.mango, description: 'Mango Strawberry' },
  { id: 'SM-21', name: vi('Xoai chuoi'), image: PRODUCT.mango, description: 'Mango Banana' },
  { id: 'SM-22', name: vi('Cacao chuoi'), image: PRODUCT.cacaoOat, description: 'Cacao Banana' },
  { id: 'SM-23', name: vi('Matcha chuoi'), image: PRODUCT.hero, description: 'Matcha Banana' },
  { id: 'SM-24', name: vi('Matcha yen mach'), image: PRODUCT.hero, description: 'Matcha Oat' },
];

function getSmoothieProductRows() {
  return DEFAULT_SMOOTHIE_FLAVORS.map((f) => [
    f.id,
    f.name,
    'smoothies',
    0,
    f.image,
    f.description,
  ]);
}

module.exports = { DEFAULT_SMOOTHIE_FLAVORS, getSmoothieProductRows };
