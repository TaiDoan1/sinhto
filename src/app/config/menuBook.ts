// Dữ liệu "Sách menu" — nội dung menu dạng cấu trúc (thay cho ảnh menu tĩnh). Admin sửa được
// và lưu ở server qua /api/settings key 'menuBookData'. Nếu server chưa có dữ liệu → landing
// tự fallback về ảnh menu cũ (menu1.jpg/menu2.jpg).

export type FlavourTag = 'new' | 'hot' | 'try';

export interface MenuComboTopping {
  no: string;
  name: string;
  nameEn: string;
  ingredients: string;
  ingredientsEn: string;
  stat: string;
  statEn: string;
  price: string;
  was: string;
  color: string; // màu nhấn của combo
}

export interface MenuSingleTopping {
  name: string;
  nameEn: string;
  price: string;
}

export interface MenuPlan {
  title: string;
  titleEn: string;
  bullets: { vi: string; en: string }[];
  size: string;
  color: string;
}

export interface MenuFlavour {
  no: string;
  name: string;
  nameEn: string;
  tag?: FlavourTag;
}

export interface MenuSize {
  name: string;
  ml: string;
  desc: string;
  descEn: string;
  rows: { label: string; price: string }[];
  color: string;
}

export interface MenuSavings {
  title: string;
  titleEn: string;
  discount: string;
  rows: { label: string; price: string }[];
  gift: string;
  giftEn: string;
  color: string;
}

export interface MenuBranch {
  district: string;
  address: string;
  ward: string;
  note: string;
  noteEn: string;
}

export interface MenuBookData {
  tagline: string;
  comboToppings: MenuComboTopping[];
  singleToppings: MenuSingleTopping[];
  plans: MenuPlan[];
  flavoursTitle: string;
  flavoursNote: string;
  flavours: MenuFlavour[];
  sizesTitle: string;
  sizesNote: string;
  sizes: MenuSize[];
  savingsTitle: string;
  savingsNote: string;
  savings: MenuSavings[];
  branches: MenuBranch[];
  phone: string;
  web: string;
  zalo: string;
}

export const MENU_BOOK_SETTING_KEY = 'menuBookData';

export const DEFAULT_MENU_BOOK: MenuBookData = {
  tagline: 'SINH TỐ PROTEIN TƯƠI',
  comboToppings: [
    { no: '01', name: 'HEALTHY BOOST', nameEn: '', ingredients: 'Yến mạch + Hạt chia + Cỏ ngọt', ingredientsEn: 'Oats + Chia + Stevia', stat: '+45 kcal · +4g xơ', statEn: '+45 kcal · +4g fiber', price: '25K', was: 'was 30K', color: '#2f7d4f' },
    { no: '02', name: 'PROTEIN PLUS', nameEn: '', ingredients: 'Whey Gold + Sữa A2', ingredientsEn: 'Whey Gold + A2 milk', stat: '+120 kcal · +25g đạm', statEn: '+120 kcal · +25g protein', price: '49K', was: 'was 59K', color: '#e0701f' },
    { no: '03', name: 'BEAUTY BLEND', nameEn: '', ingredients: 'Collagen + Sữa hạt + Mật ong', ingredientsEn: 'Collagen + Nut milk + Honey', stat: '+80 kcal · +12g collagen', statEn: '+80 kcal · +12g collagen', price: '65K', was: 'was 79K', color: '#6b3f8c' },
  ],
  singleToppings: [
    { name: 'Mật mía', nameEn: 'Sugarcane molasses', price: 'FREE' },
    { name: 'Mật ong', nameEn: 'Raw honey', price: '15k' },
    { name: 'Chuối', nameEn: 'Banana', price: '10k' },
    { name: 'Cải Kale', nameEn: 'Kale', price: '15k' },
    { name: 'Bơ mè đen', nameEn: 'Black sesame butter', price: '15k' },
    { name: 'Cần tây', nameEn: 'Celery', price: '10k' },
    { name: 'Dưa leo', nameEn: 'Cucumber', price: '7k' },
    { name: 'Dừa sấy giòn', nameEn: 'Toasted coconut', price: '10k' },
    { name: 'Sữa A2', nameEn: 'A2 milk', price: '20k' },
    { name: 'Bơ đậu phộng', nameEn: 'Peanut butter', price: '10k' },
    { name: 'Bơ hạnh nhân', nameEn: 'Almond butter', price: '20k' },
    { name: 'Bơ hạt điều', nameEn: 'Cashew butter', price: '15k' },
    { name: 'Bơ hạt macca', nameEn: 'Macadamia butter', price: '25k' },
    { name: 'Bơ mè', nameEn: 'Sesame butter', price: '10k' },
    { name: 'Bơ hạt bí xanh', nameEn: 'Pumpkin seed butter', price: '20k' },
    { name: 'Bơ hạt hướng dương', nameEn: 'Sunflower seed butter', price: '15k' },
    { name: 'Bơ hạt dẻ cười', nameEn: 'Pistachio butter', price: '25k' },
    { name: 'Sữa hạt 100%', nameEn: 'Nut milk', price: '15k' },
    { name: 'Lá cỏ ngọt', nameEn: 'Stevia leaf', price: '10k' },
    { name: 'Bạc hà', nameEn: 'Mint', price: '15k' },
    { name: 'Chà là', nameEn: 'Date', price: '5k' },
    { name: 'Hạt chia', nameEn: 'Chia seeds', price: '10k' },
    { name: 'Yến mạch', nameEn: 'Rolled oats', price: '10k' },
    { name: 'Bột đậu hà lan', nameEn: 'Pea protein', price: '20k' },
    { name: 'Whey Gold Standard', nameEn: 'Premium whey', price: '39k' },
    { name: 'Collagen Vital Protein', nameEn: 'Marine collagen', price: '49k' },
  ],
  plans: [
    { title: 'GIẢM MỠ · TONE DÁNG', titleEn: 'Fat Loss · Tone', color: '#e0701f', size: '500ml × 40g protein', bullets: [
      { vi: 'Muốn giảm 5-10kg', en: 'Want to lose 5–10kg' },
      { vi: 'No 12h, hết thèm vặt', en: 'Stay full to noon' },
      { vi: 'Đốt mỡ, giữ cơ săn', en: 'Burn fat, keep muscle' },
    ] },
    { title: 'TĂNG CƠ · PHỤC HỒI', titleEn: 'Muscle Build · Recovery', color: '#2f7d4f', size: '500ml × 60g protein', bullets: [
      { vi: 'Tập gym thường xuyên', en: 'Regular gym training' },
      { vi: 'Phục hồi sau tập', en: 'Post-workout recovery' },
      { vi: 'Build cơ đều, chắc', en: 'Lean muscle building' },
    ] },
    { title: 'TĂNG CÂN · BULK', titleEn: 'Elite Mass · Bulk', color: '#6b3f8c', size: '700ml × 90g protein', bullets: [
      { vi: 'Tăng cân lành mạnh', en: 'Healthy weight gain' },
      { vi: 'VĐV chuyên nghiệp', en: 'Professional athletes' },
      { vi: 'Bulk không tăng mỡ', en: 'Lean bulk, no fat' },
    ] },
  ],
  flavoursTitle: '26 VỊ',
  flavoursNote: 'Trái cây thật, không syrup',
  flavours: [
    { no: '01', name: 'Thanh long (thơm-xoài-chuối)', nameEn: 'Dragonfruit pineapple banana' },
    { no: '02', name: 'Cacao chuối', nameEn: 'Cacao banana', tag: 'hot' },
    { no: '03', name: 'Cacao yến mạch', nameEn: 'Cacao oat', tag: 'hot' },
    { no: '04', name: 'Lê chuối', nameEn: 'Pear banana' },
    { no: '05', name: 'Xoài thơm', nameEn: 'Mango pineapple' },
    { no: '06', name: 'Xoài chuối', nameEn: 'Mango banana' },
    { no: '07', name: 'Xoài cam', nameEn: 'Mango orange' },
    { no: '08', name: 'Chanh dây xoài', nameEn: 'Passionfruit mango' },
    { no: '09', name: 'Cacao xoài', nameEn: 'Cacao mango' },
    { no: '10', name: 'Bơ chuối', nameEn: 'Avocado banana' },
    { no: '11', name: 'Dâu chuối', nameEn: 'Strawberry banana' },
    { no: '12', name: 'Xoài dâu', nameEn: 'Mango strawberry' },
    { no: '13', name: 'Đu đủ (xoài-thơm-chuối)', nameEn: 'Papaya mango pineapple banana', tag: 'new' },
    { no: '14', name: 'Matcha (xoài-chuối)', nameEn: 'Matcha mango banana' },
    { no: '15', name: 'Việt quất (chuối-xoài-đu đủ)', nameEn: 'Blueberry banana mango papaya' },
    { no: '16', name: 'Chuối cam', nameEn: 'Banana orange' },
    { no: '17', name: 'Chuối bơ đậu phộng', nameEn: 'Banana peanut butter' },
    { no: '18', name: 'Cải Kale (táo-xoài-chuối)', nameEn: 'Kale apple mango banana' },
    { no: '19', name: 'Mãng cầu xoài', nameEn: 'Soursop mango' },
    { no: '20', name: 'Cà phê chuối', nameEn: 'Coffee banana' },
    { no: '21', name: 'Cacao xoài', nameEn: 'Cacao mango' },
    { no: '22', name: 'Bơ chuối', nameEn: 'Avocado banana', tag: 'hot' },
    { no: '23', name: 'Nho chuối', nameEn: 'Grape banana' },
    { no: '24', name: 'Dâu tằm xoài', nameEn: 'Mulberry mango' },
    { no: '25', name: 'Xoài cam', nameEn: 'Mango orange', tag: 'hot' },
    { no: '26', name: 'Phúc bồn tử chuối', nameEn: 'Raspberry banana' },
  ],
  sizesTitle: 'BẢNG GIÁ LY LẺ',
  sizesNote: 'Mặt mía MIỄN PHÍ kèm mỗi ly',
  sizes: [
    { name: 'FLAGSHIP', ml: '700', desc: 'Dành gym chuyên nghiệp', descEn: 'Pro Athletes', color: '#e0701f', rows: [ { label: '60g protein', price: '159K' }, { label: '90g protein', price: '179K' } ] },
    { name: 'SIGNATURE', ml: '500', desc: 'Thay bữa sáng', descEn: 'Meal Replacement', color: '#2f7d4f', rows: [ { label: '40g protein', price: '99K' }, { label: '60g protein', price: '115K' } ] },
    { name: 'STANDARD', ml: '360', desc: 'Giảm mỡ · Tone dáng', descEn: 'Fat Loss · Tone', color: '#d1442f', rows: [ { label: '20g protein', price: '69K' }, { label: '40g protein', price: '79K' } ] },
  ],
  savingsTitle: 'COMBO TIẾT KIỆM',
  savingsNote: 'Giao tươi mỗi sáng, freeship',
  savings: [
    { title: 'COMBO 7 NGÀY', titleEn: 'Weekly · 7 days', discount: '-8%', color: '#2f7d4f', gift: 'Không quà tặng', giftEn: 'No gift', rows: [ { label: 'Fat Burn Pro', price: '638K' }, { label: 'Muscle Build', price: '741K' }, { label: 'Elite Mass', price: '1,152K' } ] },
    { title: 'COMBO 30 NGÀY', titleEn: 'Monthly · 30 days', discount: '-15%', color: '#c68a1a', gift: 'Không quà tặng', giftEn: 'No gift', rows: [ { label: 'Fat Burn Pro', price: '2,525K' }, { label: 'Muscle Build', price: '2,933K' }, { label: 'Elite Mass', price: '4,564K' } ] },
    { title: 'COMBO 90 NGÀY', titleEn: 'Quarterly · 90 days', discount: '-22%', color: '#6b3f8c', gift: 'Không quà tặng', giftEn: 'No gift', rows: [ { label: 'Fat Burn Pro', price: '6,950K' }, { label: 'Muscle Build', price: '8,073K' }, { label: 'Elite Mass', price: '12,565K' } ] },
  ],
  branches: [
    { district: 'QUẬN 1', address: '68/375 Trần Quang Khải', ward: 'P. Tân Định', note: 'Online', noteEn: 'Delivery only' },
    { district: 'QUẬN 4', address: '330/48 Nguyễn Tất Thành', ward: 'P. Xóm Chiếu', note: 'Online', noteEn: 'Delivery only' },
    { district: 'QUẬN 5', address: '31 Nguyễn Văn Cừ', ward: 'P. Chợ Quán', note: 'Có cửa hàng + Online', noteEn: 'In-store + Delivery' },
    { district: 'BÌNH THẠNH', address: '72 Võ Oanh', ward: 'P. Thạnh Mỹ Tây', note: 'Có cửa hàng + Online', noteEn: 'In-store + Delivery' },
    { district: 'BÌNH THẠNH', address: '122 Xô Viết Nghệ Tĩnh', ward: 'P. Thạnh Mỹ Tây', note: 'Có cửa hàng + Online', noteEn: 'In-store + Delivery' },
  ],
  phone: '0965 351 545',
  web: 'fitblend.vn',
  zalo: '@fitblend',
};
