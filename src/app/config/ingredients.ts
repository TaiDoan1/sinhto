/**
 * Nguyên liệu ĐƠN (vị lẻ) dùng để pha các vị smoothie ghép tên trên menu — thay cho hệ thống cân
 * theo gram cũ. Mỗi vị ghép tên (vd "Cacao chuối") trừ ĐÚNG 1 TÚI của MỖI nguyên liệu tên trong đó
 * (1 túi Cacao + 1 túi Chuối), theo đúng size ly (S=360ml, M=500ml, L=700ml) — không cân gram.
 *
 * Tồn kho nguyên liệu lưu chung cơ chế với "Kho Vị" cũ (setting branchProductInventory_<branchId>,
 * bucket "smoothies"), chỉ đổi KHÓA từ mã sản phẩm bán (SM-xx) sang mã nguyên liệu (ING-xx).
 */

export interface IngredientDef {
  id: string;
  name: string;
}

export const INGREDIENT_CATALOG: IngredientDef[] = [
  { id: 'ING-THANH-LONG', name: 'Thanh long' },
  { id: 'ING-THOM', name: 'Thơm (dứa)' },
  { id: 'ING-XOAI', name: 'Xoài' },
  { id: 'ING-CHUOI', name: 'Chuối' },
  { id: 'ING-LE', name: 'Lê' },
  { id: 'ING-CAM', name: 'Cam' },
  { id: 'ING-CHANH-DAY', name: 'Chanh dây' },
  { id: 'ING-CACAO', name: 'Cacao' },
  { id: 'ING-BO', name: 'Bơ' },
  { id: 'ING-DAU', name: 'Dâu' },
  { id: 'ING-DU-DU', name: 'Đu đủ' },
  { id: 'ING-MATCHA', name: 'Matcha' },
  { id: 'ING-VIET-QUAT', name: 'Việt quất' },
  { id: 'ING-CAI-KALE', name: 'Cải Kale' },
  { id: 'ING-TAO', name: 'Táo' },
  { id: 'ING-MANG-CAU', name: 'Mãng cầu' },
  { id: 'ING-CA-PHE', name: 'Cà phê' },
  { id: 'ING-NHO', name: 'Nho' },
  { id: 'ING-DAU-TAM', name: 'Dâu tằm' },
  { id: 'ING-PHUC-BON-TU', name: 'Phúc bồn tử' },
  { id: 'ING-YEN-MACH', name: 'Yến mạch' },
];

const ING = {
  thanhLong: 'ING-THANH-LONG', thom: 'ING-THOM', xoai: 'ING-XOAI', chuoi: 'ING-CHUOI',
  le: 'ING-LE', cam: 'ING-CAM', chanhDay: 'ING-CHANH-DAY', cacao: 'ING-CACAO', bo: 'ING-BO',
  dau: 'ING-DAU', duDu: 'ING-DU-DU', matcha: 'ING-MATCHA', vietQuat: 'ING-VIET-QUAT',
  caiKale: 'ING-CAI-KALE', tao: 'ING-TAO', mangCau: 'ING-MANG-CAU', caPhe: 'ING-CA-PHE',
  nho: 'ING-NHO', dauTam: 'ING-DAU-TAM', phucBonTu: 'ING-PHUC-BON-TU', yenMach: 'ING-YEN-MACH',
};

/** Vị (mã sản phẩm SM-xx) → danh sách nguyên liệu đơn cấu thành. Các vị in gọn trên poster bằng
 * dấu ngoặc (vd "Đu đủ (xoài-thơm-chuối)") đã TÁCH thành nhiều vị riêng khi bán trên POS (Đu đủ
 * xoài / Đu đủ thơm / Đu đủ chuối) — mỗi vị bán đúng 2 nguyên liệu, khớp DEFAULT_SMOOTHIE_FLAVORS
 * trong menuFlavors.js (35 vị). */
export const FLAVOR_INGREDIENTS: Record<string, string[]> = {
  'SM-01': [ING.thanhLong, ING.thom], // Thanh long thơm
  'SM-02': [ING.thanhLong, ING.xoai], // Thanh long xoài
  'SM-03': [ING.thanhLong, ING.chuoi], // Thanh long chuối
  'SM-04': [ING.cacao, ING.chuoi], // Cacao chuối
  'SM-05': [ING.cacao, ING.yenMach], // Cacao yến mạch
  'SM-06': [ING.le, ING.chuoi], // Lê chuối
  'SM-07': [ING.xoai, ING.thom], // Xoài thơm
  'SM-08': [ING.xoai, ING.chuoi], // Xoài chuối
  'SM-09': [ING.xoai, ING.cam], // Xoài cam
  'SM-10': [ING.chanhDay, ING.xoai], // Chanh dây xoài
  'SM-11': [ING.cacao, ING.xoai], // Cacao xoài
  'SM-12': [ING.bo, ING.chuoi], // Bơ chuối
  'SM-13': [ING.dau, ING.chuoi], // Dâu chuối
  'SM-14': [ING.xoai, ING.dau], // Xoài dâu
  'SM-15': [ING.duDu, ING.xoai], // Đu đủ xoài
  'SM-16': [ING.duDu, ING.thom], // Đu đủ thơm
  'SM-17': [ING.duDu, ING.chuoi], // Đu đủ chuối
  'SM-18': [ING.matcha, ING.xoai], // Matcha xoài
  'SM-19': [ING.matcha, ING.chuoi], // Matcha chuối
  'SM-20': [ING.vietQuat, ING.chuoi], // Việt quất chuối
  'SM-21': [ING.vietQuat, ING.xoai], // Việt quất xoài
  'SM-22': [ING.vietQuat, ING.duDu], // Việt quất đu đủ
  'SM-23': [ING.chuoi, ING.cam], // Chuối cam
  'SM-24': [ING.chuoi], // Chuối bơ đậu phộng — bơ đậu phộng dùng topping có sẵn (xem FLAVOR_BUILTIN_TOPPINGS)
  'SM-25': [ING.caiKale, ING.tao], // Cải Kale táo
  'SM-26': [ING.caiKale, ING.xoai], // Cải Kale xoài
  'SM-27': [ING.caiKale, ING.chuoi], // Cải Kale chuối
  'SM-28': [ING.mangCau, ING.xoai], // Mãng cầu xoài
  'SM-29': [ING.caPhe, ING.chuoi], // Cà phê chuối
  'SM-30': [ING.cacao, ING.xoai], // Cacao xoài
  'SM-31': [ING.bo, ING.chuoi], // Bơ chuối
  'SM-32': [ING.nho, ING.chuoi], // Nho chuối
  'SM-33': [ING.dauTam, ING.xoai], // Dâu tằm xoài
  'SM-34': [ING.xoai, ING.cam], // Xoài cam
  'SM-35': [ING.phucBonTu, ING.chuoi], // Phúc bồn tử chuối
};

/** Vị nào có nguyên liệu đi kèm là TOPPING có sẵn (không phải vị lẻ) — tự trừ thêm khi bán, không
 * cần khách chọn thêm. VD "Chuối bơ đậu phộng" luôn kèm 1 phần Bơ đậu phộng (TP-14). */
export const FLAVOR_BUILTIN_TOPPINGS: Record<string, string[]> = {
  'SM-24': ['TP-14'], // Chuối bơ đậu phộng → kèm Bơ đậu phộng
};
