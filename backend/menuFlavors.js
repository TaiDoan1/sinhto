const { PRODUCT } = require('./imagePaths');

/** 35 vị smoothie bán trên POS — khớp menu in mới (poster "SINH TỐ PROTEIN TƯƠI"), basePrice = 0
 * (giá theo size/protein, xem menuPricing.js). Tên giữ NGUYÊN DẤU tiếng Việt.
 *
 * Các vị trên poster in có dấu ngoặc (vd "Đu đủ (xoài-thơm-chuối)") thực chất là NHIỀU vị riêng
 * (Đu đủ xoài / Đu đủ thơm / Đu đủ chuối) — poster chỉ viết gọn cho vừa chỗ in, nhưng bán trên POS
 * tách thành từng vị riêng (mỗi vị đúng 2 trái cây) để khớp đúng công thức trừ kho (mỗi vị = 1 túi
 * mỗi nguyên liệu, xem config/ingredients.ts). Vì vậy tổng vị bán > 26 (số vị in gọn trên poster).
 */
const DEFAULT_SMOOTHIE_FLAVORS = [
  { id: 'SM-01', name: 'Thanh long thơm', image: PRODUCT.mango, description: 'Dragonfruit Pineapple' },
  { id: 'SM-02', name: 'Thanh long xoài', image: PRODUCT.mango, description: 'Dragonfruit Mango' },
  { id: 'SM-03', name: 'Thanh long chuối', image: PRODUCT.mango, description: 'Dragonfruit Banana' },
  { id: 'SM-04', name: 'Cacao chuối', image: PRODUCT.cacaoOat, description: 'Cacao Banana' },
  { id: 'SM-05', name: 'Cacao yến mạch', image: PRODUCT.cacaoOat, description: 'Cacao Oat' },
  { id: 'SM-06', name: 'Lê chuối', image: PRODUCT.hero, description: 'Pear Banana' },
  { id: 'SM-07', name: 'Xoài thơm', image: PRODUCT.mango, description: 'Mango Pineapple' },
  { id: 'SM-08', name: 'Xoài chuối', image: PRODUCT.mango, description: 'Mango Banana' },
  { id: 'SM-09', name: 'Xoài cam', image: PRODUCT.mango, description: 'Mango Orange' },
  { id: 'SM-10', name: 'Chanh dây xoài', image: PRODUCT.mango, description: 'Passionfruit Mango' },
  { id: 'SM-11', name: 'Cacao xoài', image: PRODUCT.cacaoOat, description: 'Cacao Mango' },
  { id: 'SM-12', name: 'Bơ chuối', image: PRODUCT.hero, description: 'Avocado Banana' },
  { id: 'SM-13', name: 'Dâu chuối', image: PRODUCT.strawberry, description: 'Strawberry Banana' },
  { id: 'SM-14', name: 'Xoài dâu', image: PRODUCT.strawberry, description: 'Mango Strawberry' },
  { id: 'SM-15', name: 'Đu đủ xoài', image: PRODUCT.mango, description: 'Papaya Mango' },
  { id: 'SM-16', name: 'Đu đủ thơm', image: PRODUCT.mango, description: 'Papaya Pineapple' },
  { id: 'SM-17', name: 'Đu đủ chuối', image: PRODUCT.mango, description: 'Papaya Banana' },
  { id: 'SM-18', name: 'Matcha xoài', image: PRODUCT.hero, description: 'Matcha Mango' },
  { id: 'SM-19', name: 'Matcha chuối', image: PRODUCT.hero, description: 'Matcha Banana' },
  { id: 'SM-20', name: 'Việt quất chuối', image: PRODUCT.strawberry, description: 'Blueberry Banana' },
  { id: 'SM-21', name: 'Việt quất xoài', image: PRODUCT.strawberry, description: 'Blueberry Mango' },
  { id: 'SM-22', name: 'Việt quất đu đủ', image: PRODUCT.strawberry, description: 'Blueberry Papaya' },
  { id: 'SM-23', name: 'Chuối cam', image: PRODUCT.hero, description: 'Banana Orange' },
  { id: 'SM-24', name: 'Chuối bơ đậu phộng', image: PRODUCT.hero, description: 'Banana Peanut Butter' },
  { id: 'SM-25', name: 'Cải Kale táo', image: PRODUCT.hero, description: 'Kale Apple' },
  { id: 'SM-26', name: 'Cải Kale xoài', image: PRODUCT.hero, description: 'Kale Mango' },
  { id: 'SM-27', name: 'Cải Kale chuối', image: PRODUCT.hero, description: 'Kale Banana' },
  { id: 'SM-28', name: 'Mãng cầu xoài', image: PRODUCT.mango, description: 'Soursop Mango' },
  { id: 'SM-29', name: 'Cà phê chuối', image: PRODUCT.cacaoOat, description: 'Coffee Banana' },
  { id: 'SM-30', name: 'Cacao xoài', image: PRODUCT.cacaoOat, description: 'Cacao Mango' },
  { id: 'SM-31', name: 'Bơ chuối', image: PRODUCT.hero, description: 'Avocado Banana' },
  { id: 'SM-32', name: 'Nho chuối', image: PRODUCT.strawberry, description: 'Grape Banana' },
  { id: 'SM-33', name: 'Dâu tằm xoài', image: PRODUCT.strawberry, description: 'Mulberry Mango' },
  { id: 'SM-34', name: 'Xoài cam', image: PRODUCT.mango, description: 'Mango Orange' },
  { id: 'SM-35', name: 'Phúc bồn tử chuối', image: PRODUCT.strawberry, description: 'Raspberry Banana' },
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
