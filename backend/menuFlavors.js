const { PRODUCT } = require('./imagePaths');

/** 26 vị smoothie — khớp menu in mới (poster "SINH TỐ PROTEIN TƯƠI"), basePrice = 0 (giá theo
 * size/protein, xem menuPricing.js). Tên giữ NGUYÊN DẤU tiếng Việt — không dùng removeDiacritics
 * cho tên món (hệ thống hiển thị có dấu ở mọi nơi). */
const DEFAULT_SMOOTHIE_FLAVORS = [
  { id: 'SM-01', name: 'Thanh long (thơm-xoài-chuối)', image: PRODUCT.mango, description: 'Dragonfruit Pineapple Banana' },
  { id: 'SM-02', name: 'Cacao chuối', image: PRODUCT.cacaoOat, description: 'Cacao Banana' },
  { id: 'SM-03', name: 'Cacao yến mạch', image: PRODUCT.cacaoOat, description: 'Cacao Oat' },
  { id: 'SM-04', name: 'Lê chuối', image: PRODUCT.hero, description: 'Pear Banana' },
  { id: 'SM-05', name: 'Xoài thơm', image: PRODUCT.mango, description: 'Mango Pineapple' },
  { id: 'SM-06', name: 'Xoài chuối', image: PRODUCT.mango, description: 'Mango Banana' },
  { id: 'SM-07', name: 'Xoài cam', image: PRODUCT.mango, description: 'Mango Orange' },
  { id: 'SM-08', name: 'Chanh dây xoài', image: PRODUCT.mango, description: 'Passionfruit Mango' },
  { id: 'SM-09', name: 'Cacao xoài', image: PRODUCT.cacaoOat, description: 'Cacao Mango' },
  { id: 'SM-10', name: 'Bơ chuối', image: PRODUCT.hero, description: 'Avocado Banana' },
  { id: 'SM-11', name: 'Dâu chuối', image: PRODUCT.strawberry, description: 'Strawberry Banana' },
  { id: 'SM-12', name: 'Xoài dâu', image: PRODUCT.strawberry, description: 'Mango Strawberry' },
  { id: 'SM-13', name: 'Đu đủ (xoài-thơm-chuối)', image: PRODUCT.mango, description: 'Papaya Mango Pineapple Banana' },
  { id: 'SM-14', name: 'Matcha (xoài-chuối)', image: PRODUCT.hero, description: 'Matcha Mango Banana' },
  { id: 'SM-15', name: 'Việt quất (chuối-xoài-đu đủ)', image: PRODUCT.strawberry, description: 'Blueberry Banana Mango Papaya' },
  { id: 'SM-16', name: 'Chuối cam', image: PRODUCT.hero, description: 'Banana Orange' },
  { id: 'SM-17', name: 'Chuối bơ đậu phộng', image: PRODUCT.hero, description: 'Banana Peanut Butter' },
  { id: 'SM-18', name: 'Cải Kale (táo-xoài-chuối)', image: PRODUCT.hero, description: 'Kale Apple Mango Banana' },
  { id: 'SM-19', name: 'Mãng cầu xoài', image: PRODUCT.mango, description: 'Soursop Mango' },
  { id: 'SM-20', name: 'Cà phê chuối', image: PRODUCT.cacaoOat, description: 'Coffee Banana' },
  { id: 'SM-21', name: 'Cacao xoài', image: PRODUCT.cacaoOat, description: 'Cacao Mango' },
  { id: 'SM-22', name: 'Bơ chuối', image: PRODUCT.hero, description: 'Avocado Banana' },
  { id: 'SM-23', name: 'Nho chuối', image: PRODUCT.strawberry, description: 'Grape Banana' },
  { id: 'SM-24', name: 'Dâu tằm xoài', image: PRODUCT.strawberry, description: 'Mulberry Mango' },
  { id: 'SM-25', name: 'Xoài cam', image: PRODUCT.mango, description: 'Mango Orange' },
  { id: 'SM-26', name: 'Phúc bồn tử chuối', image: PRODUCT.strawberry, description: 'Raspberry Banana' },
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
