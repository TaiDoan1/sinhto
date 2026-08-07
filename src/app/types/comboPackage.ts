export interface ComboPackageDayItem {
  assignedDay: number;
  dayLabel: string;
  productName: string;
  size: string;
  protein: number;
  toppings: string[];
}

export interface ComboPackageTemplate {
  id: string;
  name: string;
  comboType: 'weekly' | 'monthly';
  price: number;
  active: boolean;
  items: ComboPackageDayItem[];
  // Hoa hồng cho CSKH khi bán gói này. Mỗi gói tự chọn tính theo % hay số tiền cố định.
  commissionType?: 'percent' | 'amount';
  commissionValue?: number; // % (vd 10) hoặc số tiền cố định (đ)
  // Hoa hồng khi GIA HẠN (thường thấp hơn bán mới). Bỏ trống = dùng mức bán mới.
  renewCommissionType?: 'percent' | 'amount';
  renewCommissionValue?: number;
}

export const COMBO_PACKAGE_SETTING_KEY = 'comboPackageTemplates';
