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
}

export const COMBO_PACKAGE_SETTING_KEY = 'comboPackageTemplates';
