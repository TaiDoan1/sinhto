import { X, Calendar, User, Phone, Check, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useCombos } from '../../contexts/ComboContext';

interface ComboSubscriptionModalProps {
  comboType: 'weekly' | 'monthly';
  comboPrice: number;
  onClose: () => void;
  onComplete: () => void;
}

interface CustomComboItem {
  productId: string;
  productName: string;
  size: string;
  protein: number;
  toppings: string[];
  price: number;
}

const weekDayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const products = [
  { id: 'SM-001', name: 'Strawberry Blast', price: 45000, image: '🍓' },
  { id: 'SM-002', name: 'Mango Tango', price: 48000, image: '🥭' },
  { id: 'SM-003', name: 'Green Power', price: 52000, image: '🥬' },
  { id: 'SM-004', name: 'Berry Mix', price: 55000, image: '🫐' },
  { id: 'SM-005', name: 'Tropical Paradise', price: 50000, image: '🍍' },
  { id: 'SM-006', name: 'Avocado Dream', price: 58000, image: '🥑' },
  { id: 'SM-007', name: 'Protein Shake', price: 65000, image: '💪' },
  { id: 'SM-008', name: 'Banana Blast', price: 42000, image: '🍌' },
];

const sizes = [
  { id: '250ml', label: '250ml', multiplier: 1 },
  { id: '350ml', label: '350ml', multiplier: 1.2 },
  { id: '500ml', label: '500ml', multiplier: 1.5 },
  { id: '700ml', label: '700ml', multiplier: 2 },
];

const proteinLevels = [20, 30, 40, 50, 60, 70, 80, 90];

const toppings = [
  'Hạt Chia', 'Granola', 'Dừa Nạo', 'Mật Ong', 'Hạnh Nhân',
  'Óc Chó', 'Nho Khô', 'Chuối Sấy', 'Dâu Khô', 'Bơ Đậu Phộng',
  'Siro Caramel', 'Siro Chocolate', 'Whipped Cream', 'Socola Chip', 'Trân Châu'
];

export function ComboSubscriptionModal({ comboType, comboPrice, onClose, onComplete }: ComboSubscriptionModalProps) {
  const { addCombo } = useCombos();
  const [step, setStep] = useState<'select-items' | 'customer-info'>('select-items');
  const [isCustomCombo, setIsCustomCombo] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedDays, setSelectedDays] = useState<number[]>(
    comboType === 'weekly' ? [1, 3, 5] : [1, 2, 3, 4, 5]
  );
  const [customItems, setCustomItems] = useState<CustomComboItem[]>([]);
  const [editingProduct, setEditingProduct] = useState<typeof products[0] | null>(null);
  const [tempSize, setTempSize] = useState('350ml');
  const [tempProtein, setTempProtein] = useState(30);
  const [tempToppings, setTempToppings] = useState<string[]>([]);
  const [selectedItems] = useState<string[]>(
    comboType === 'weekly'
      ? ['Strawberry Blast', 'Green Power', 'Mango Tango']
      : ['Protein Shake', 'Berry Mix', 'Avocado Dream', 'Green Power']
  );

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const toggleTopping = (topping: string) => {
    setTempToppings(prev =>
      prev.includes(topping)
        ? prev.filter(t => t !== topping)
        : [...prev, topping]
    );
  };

  const calculateItemPrice = (basePrice: number, size: string, protein: number, toppingsCount: number) => {
    const sizeMultiplier = sizes.find(s => s.id === size)?.multiplier || 1;
    const proteinExtra = (protein - 20) * 500;
    const toppingsExtra = toppingsCount * 10000;
    return Math.round(basePrice * sizeMultiplier + proteinExtra + toppingsExtra);
  };

  const handleSelectProduct = (product: typeof products[0]) => {
    setEditingProduct(product);
    setTempSize('350ml');
    setTempProtein(30);
    setTempToppings([]);
  };

  const handleAddCustomItem = () => {
    if (!editingProduct) return;

    const newItem: CustomComboItem = {
      productId: editingProduct.id,
      productName: editingProduct.name,
      size: tempSize,
      protein: tempProtein,
      toppings: tempToppings,
      price: calculateItemPrice(editingProduct.price, tempSize, tempProtein, tempToppings.length)
    };

    setCustomItems(prev => [...prev, newItem]);
    setEditingProduct(null);
  };

  const removeCustomItem = (index: number) => {
    setCustomItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const getCustomTotal = () => {
    return customItems.reduce((sum, item) => sum + item.price, 0);
  };

  const getCustomItemsList = () => {
    return customItems.map(item =>
      `${item.productName} (${item.size}, ${item.protein}g)${item.toppings.length > 0 ? ` + ${item.toppings.join(', ')}` : ''}`
    );
  };

  const handleNextStep = () => {
    if (isCustomCombo && customItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm!');
      return;
    }
    setStep('customer-info');
  };

  const handleBackStep = () => {
    setStep('select-items');
  };

  const handleSubmit = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Vui lòng nhập đầy đủ thông tin khách hàng!');
      return;
    }

    if (selectedDays.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ngày giao hàng!');
      return;
    }

    if (isCustomCombo && customItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm!');
      return;
    }

    const getNextDeliveryDate = () => {
      const start = new Date(startDate);
      const currentDay = start.getDay();

      // Tìm ngày giao tiếp theo kể từ ngày bắt đầu
      for (let i = 0; i < 7; i++) {
        const checkDay = (currentDay + i) % 7;
        if (selectedDays.includes(checkDay)) {
          const nextDate = new Date(start);
          nextDate.setDate(start.getDate() + i);
          return nextDate;
        }
      }
      return start;
    };

    const finalItems: any[] = isCustomCombo 
      ? customItems.map(item => ({
          id: Math.random().toString(),
          product: products.find(p => p.id === item.productId),
          quantity: 1,
          size: item.size,
          protein: item.protein,
          toppings: item.toppings,
          price: item.price,
          assignedDay: 'all'
        }))
      : selectedItems.map(name => ({
          id: Math.random().toString(),
          product: products.find(p => p.name === name),
          quantity: 1,
          size: '500ml',
          protein: 20,
          toppings: [],
          price: 0,
          assignedDay: 'all'
        }));

    const finalPrice = isCustomCombo ? getCustomTotal() : comboPrice;

    addCombo({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      comboType: isCustomCombo ? 'weekly' : comboType,
      startDate: new Date(startDate),
      nextDelivery: getNextDeliveryDate(),
      deliveryDays: selectedDays,
      items: finalItems,
      totalPrice: finalPrice,
      status: 'active',
      staff: 'Nguyễn Văn An',
      branchId: 'CN1'
    });

    alert(`Đã đăng ký ${isCustomCombo ? 'Combo Tùy Chỉnh' : comboType === 'weekly' ? 'Combo Tuần' : 'Combo Tháng'} thành công!`);
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-pink-500 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            {step === 'customer-info' && (
              <button
                onClick={handleBackStep}
                className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-colors"
              >
                ←
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold">
                {step === 'select-items' ? 'Chọn Món' : 'Thông Tin Khách Hàng'}
              </h2>
              <p className="text-xs opacity-90">
                Bước {step === 'select-items' ? '1' : '2'} / 2
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {step === 'select-items' ? (
            // BƯỚC 1: CHỌN MÓN
            <>
              {/* Toggle Combo Type */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCustomCombo(false)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                    !isCustomCombo
                      ? 'bg-gradient-to-r from-emerald-500 to-pink-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  📦 Combo Cố Định
                </button>
                <button
                  onClick={() => setIsCustomCombo(true)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                    isCustomCombo
                      ? 'bg-gradient-to-r from-emerald-500 to-pink-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  ✨ Tùy Chỉnh
                </button>
              </div>

              {/* Sản phẩm trong combo */}
              {isCustomCombo ? (
                <div className="space-y-3">
                  <div className="text-sm font-bold text-gray-700">Chọn sản phẩm cho combo:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {products.map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className="bg-white rounded-xl shadow-md hover:shadow-lg p-4 active:scale-95 transition-all border-2 border-gray-100"
                      >
                        <div className="text-4xl mb-2 text-center">{product.image}</div>
                        <div className="font-bold text-gray-800 text-sm text-center mb-1">
                          {product.name}
                        </div>
                        <div className="text-xs text-emerald-600 font-bold text-center">
                          {product.price.toLocaleString('vi-VN')}đ
                        </div>
                      </button>
                    ))}
                  </div>

                  {customItems.length > 0 && (
                    <div className="bg-emerald-50 border border-purple-200 rounded-lg p-3">
                      <div className="text-sm font-bold text-gray-700 mb-2">Đã chọn ({customItems.length}):</div>
                      <div className="space-y-2 mb-3">
                        {customItems.map((item, idx) => (
                          <div key={idx} className="flex items-start justify-between bg-white rounded-lg p-2">
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-800">{item.productName}</div>
                              <div className="text-xs text-gray-600">
                                {item.size} • {item.protein}g
                                {item.toppings.length > 0 && ` • ${item.toppings.length} topping`}
                              </div>
                              <div className="text-xs font-bold text-emerald-600 mt-1">
                                {item.price.toLocaleString('vi-VN')}đ
                              </div>
                            </div>
                            <button
                              onClick={() => removeCustomItem(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t border-purple-200 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700">Tổng giá trị/tuần:</span>
                        <span className="text-lg font-bold text-emerald-600">
                          {getCustomTotal().toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-sm font-bold text-gray-700 mb-2">Sản phẩm trong combo:</div>
                  <div className="space-y-1">
                    {selectedItems.map((item, idx) => (
                      <div key={idx} className="text-sm text-gray-700">• {item}</div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">Giá trị:</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {comboPrice.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            // BƯỚC 2: THÔNG TIN KHÁCH HÀNG
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Tên khách hàng *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nhập tên khách hàng..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Nhập số điện thoại..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Ngày bắt đầu */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Ngày bắt đầu combo *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Lịch giao hàng */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Chọn thứ giao hàng trong tuần *
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {weekDayLabels.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleDay(idx)}
                      className={`py-2 rounded-lg text-sm font-bold transition-all ${
                        selectedDays.includes(idx)
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Đã chọn: {selectedDays.length === 0 ? 'Chưa chọn ngày nào' : `${selectedDays.length} ngày/tuần`}
                </div>
                {selectedDays.length > 0 && (
                  <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-800">
                    💡 Combo sẽ được giao vào các {selectedDays.map(d => weekDayLabels[d]).join(', ')} hàng tuần
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-emerald-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm font-bold text-gray-700 mb-2">Tổng quan combo:</div>
                <div className="space-y-1 mb-3">
                  {isCustomCombo ? (
                    getCustomItemsList().map((item, idx) => (
                      <div key={idx} className="text-sm text-gray-700">• {item}</div>
                    ))
                  ) : (
                    selectedItems.map((item, idx) => (
                      <div key={idx} className="text-sm text-gray-700">• {item}</div>
                    ))
                  )}
                </div>
                <div className="pt-3 border-t border-purple-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Tổng giá trị:</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {(isCustomCombo ? getCustomTotal() : comboPrice).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              {/* Ghi chú */}
              <div className="bg-emerald-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong>Lưu ý:</strong> {isCustomCombo ? 'Combo tùy chỉnh' : comboType === 'weekly' ? 'Combo tuần' : 'Combo tháng'} bắt đầu từ ngày {new Date(startDate).toLocaleDateString('vi-VN')} và sẽ được giao vào các thứ đã chọn hàng tuần.
              </div>
            </>
          )}
        </div>

        <div className="p-6 pt-0">
          {step === 'select-items' ? (
            <button
              onClick={handleNextStep}
              disabled={isCustomCombo && customItems.length === 0}
              className="w-full bg-gradient-to-r from-emerald-500 to-pink-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp Theo →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-emerald-500 to-pink-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              Xác Nhận Đăng Ký
            </button>
          )}
        </div>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-end">
          <div className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-hidden">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-pink-500 text-white p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{editingProduct.image}</div>
                  <div>
                    <h3 className="text-lg font-bold">{editingProduct.name}</h3>
                    <p className="text-xs opacity-90">Tùy chỉnh sản phẩm cho combo</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(85vh-180px)] bg-gray-50 space-y-4">
              <div>
                <h4 className="font-bold text-gray-800 mb-2 text-sm flex items-center gap-2">
                  <span className="w-1 h-4 bg-emerald-700 rounded"></span>
                  Kích Thước
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {sizes.map(size => (
                    <button
                      key={size.id}
                      onClick={() => setTempSize(size.id)}
                      className={`py-2 rounded-lg font-semibold text-xs transition-all ${
                        tempSize === size.id
                          ? 'bg-emerald-700 text-white shadow-md'
                          : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2 text-sm flex items-center gap-2">
                  <span className="w-1 h-4 bg-green-600 rounded"></span>
                  Mức Protein
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {proteinLevels.map(level => (
                    <button
                      key={level}
                      onClick={() => setTempProtein(level)}
                      className={`py-2 rounded-lg font-semibold text-xs transition-all ${
                        tempProtein === level
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      {level}g
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  +{((tempProtein - 20) * 500).toLocaleString('vi-VN')}đ
                </p>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-2 text-sm flex items-center gap-2">
                  <span className="w-1 h-4 bg-emerald-600 rounded"></span>
                  Toppings
                  {tempToppings.length > 0 && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      {tempToppings.length}
                    </span>
                  )}
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {toppings.map(topping => (
                    <button
                      key={topping}
                      onClick={() => toggleTopping(topping)}
                      className={`py-2 px-2 rounded-lg font-medium text-xs transition-all relative ${
                        tempToppings.includes(topping)
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      {tempToppings.includes(topping) && (
                        <Check className="w-3 h-3 absolute top-1 right-1" />
                      )}
                      {topping}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Mỗi topping: +10.000đ</p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center shadow-lg">
              <div>
                <div className="text-xs text-gray-500">Giá</div>
                <div className="text-xl font-bold text-emerald-600">
                  {calculateItemPrice(editingProduct.price, tempSize, tempProtein, tempToppings.length).toLocaleString('vi-VN')}đ
                </div>
              </div>
              <button
                onClick={handleAddCustomItem}
                className="bg-gradient-to-r from-emerald-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
              >
                Thêm Vào Combo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
