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
    { no: '04', name: 'NUTTY CRUNCH', nameEn: '', ingredients: 'Bơ đậu phộng + Dừa + Hạt dác', ingredientsEn: 'Peanut butter + Coconut + Palm seeds', stat: '+150 kcal · +5g béo tốt', statEn: '+150 kcal · +5g healthy fat', price: '29K', was: 'was 35K', color: '#c68a1a' },
  ],
  singleToppings: [
    { name: 'Mật mía', nameEn: 'Sugarcane molasses', price: 'FREE' },
    { name: 'Whey Gold Standard', nameEn: 'Premium whey', price: '39k' },
    { name: 'Dừa xấy giòn', nameEn: 'Toasted coconut', price: '10k' },
    { name: 'Bơ đậu phộng', nameEn: 'Peanut butter', price: '10k' },
    { name: 'Sữa hạt 100%', nameEn: 'Nut milk', price: '15k' },
    { name: 'Collagen', nameEn: 'Marine collagen', price: '49k' },
    { name: 'Cỏ ngọt (Stevia)', nameEn: 'Stevia', price: '10k' },
    { name: 'Bơ hạnh nhân', nameEn: 'Almond butter', price: '20k' },
    { name: 'Sữa A2', nameEn: 'A2 milk', price: '20k' },
    { name: 'Yến mạch', nameEn: 'Rolled oats', price: '10k' },
    { name: 'Mật ong', nameEn: 'Raw honey', price: '15k' },
    { name: 'Bơ hạt điều', nameEn: 'Cashew butter', price: '15k' },
    { name: 'Bột đậu hà lan', nameEn: 'Pea protein', price: '20k' },
    { name: 'Hạt chia', nameEn: 'Chia seeds', price: '10k' },
    { name: 'Chà là', nameEn: 'Date', price: '5k' },
    { name: 'Hạt đác', nameEn: 'Sugar palm seeds', price: '10k' },
  ],
  plans: [
    { title: 'GIẢM MỠ · TONE DÁNG', titleEn: 'Fat Loss · Tone', color: '#e0701f', size: '360ml × 40g protein', bullets: [
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
  flavoursTitle: '24 VỊ',
  flavoursNote: 'Trái cây thật, không syrup',
  flavours: [
    { no: '01', name: 'Dâu hạt chia', nameEn: 'Strawberry chia' },
    { no: '02', name: 'Dâu chuối', nameEn: 'Strawberry banana' },
    { no: '03', name: 'Dâu cam', nameEn: 'Strawberry orange' },
    { no: '04', name: 'Mãng cầu dâu', nameEn: 'Soursop strawberry' },
    { no: '05', name: 'Dâu tằm chuối', nameEn: 'Mulberry banana', tag: 'new' },
    { no: '06', name: 'Dâu tằm yến mạch', nameEn: 'Mulberry oat', tag: 'new' },
    { no: '07', name: 'Phúc bồn tử chuối', nameEn: 'Raspberry banana', tag: 'new' },
    { no: '08', name: 'Phúc bồn tử yến mạch', nameEn: 'Raspberry oat', tag: 'new' },
    { no: '09', name: 'Thanh long chuối', nameEn: 'Dragonfruit banana', tag: 'new' },
    { no: '10', name: 'Thanh long yến mạch', nameEn: 'Dragonfruit oat', tag: 'try' },
    { no: '11', name: 'Xoài thơm', nameEn: 'Mango pineapple' },
    { no: '12', name: 'Xoài cam', nameEn: 'Mango orange', tag: 'hot' },
    { no: '13', name: 'Xoài dâu', nameEn: 'Mango strawberry', tag: 'new' },
    { no: '14', name: 'Xoài chuối', nameEn: 'Mango banana', tag: 'new' },
    { no: '15', name: 'Chuối hạt chia', nameEn: 'Banana chia' },
    { no: '16', name: 'Chanh dây chuối', nameEn: 'Passionfruit banana' },
    { no: '17', name: 'Cacao yến mạch', nameEn: 'Cacao oat', tag: 'hot' },
    { no: '18', name: 'Cacao chuối', nameEn: 'Cacao banana', tag: 'hot' },
    { no: '19', name: 'Cà phê chuối', nameEn: 'Coffee banana' },
    { no: '20', name: 'Bơ', nameEn: 'Avocado' },
    { no: '21', name: 'Bơ chuối', nameEn: 'Avocado banana' },
    { no: '22', name: 'Matcha', nameEn: 'Matcha green tea' },
    { no: '23', name: 'Matcha chuối', nameEn: 'Matcha banana', tag: 'new' },
    { no: '24', name: 'Matcha yến mạch', nameEn: 'Matcha oat', tag: 'new' },
  ],
  sizesTitle: 'BẢNG GIÁ LY LẺ',
  sizesNote: 'Mặt mía MIỄN PHÍ kèm mỗi ly',
  sizes: [
    { name: 'FLAGSHIP', ml: '700', desc: 'Dành gym chuyên nghiệp', descEn: 'Pro Athletes', color: '#e0701f', rows: [ { label: '60g protein', price: '139K' }, { label: '90g protein', price: '179K' } ] },
    { name: 'SIGNATURE', ml: '500', desc: 'Thay bữa sáng', descEn: 'Meal Replacement', color: '#2f7d4f', rows: [ { label: '40g protein', price: '99K' }, { label: '60g protein', price: '115K' } ] },
    { name: 'STANDARD', ml: '360', desc: 'Giảm mỡ · Tone dáng', descEn: 'Fat Loss · Tone', color: '#d1442f', rows: [ { label: '20g protein', price: '55K' }, { label: '40g protein', price: '79K' } ] },
    { name: 'TRY FIRST', ml: '250', desc: 'Thử lần đầu', descEn: 'Sampling', color: '#2f6fb0', rows: [ { label: '20g protein', price: '39K' } ] },
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
