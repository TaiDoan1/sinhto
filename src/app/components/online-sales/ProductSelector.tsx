import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';

interface SelectedProduct {
  id: string;
  name: string;
  size: string;
  toppings: string[];
  quantity: number;
  price: number;
  protein: number;
  productName?: string;
  productId?: string;
}

interface ProductSelectorProps {
  onAdd: (product: SelectedProduct) => void;
  onClose: () => void;
}

const SIZES = [
  { id: '360ml', label: '360ml', protein: 40 },
  { id: '500ml', label: '500ml', protein: 60 },
  { id: '700ml', label: '700ml', protein: 90 },
];

const PRODUCTS = [
  { id: 'combo_1', name: 'Fat Loss Plan', price: 67000 },
  { id: 'combo_2', name: 'Muscle Build Plan', price: 98000 },
  { id: 'combo_3', name: 'Elite Mass Plan', price: 132000 },
];

const TOPPINGS = [
  'Dâu',
  'Cam',
  'Xoài',
  'Chuối',
  'Trà xanh',
  'Cà phê',
  'Socola',
  'Vani',
  'Dưa lưới',
  'Nước dừa',
];

export function ProductSelector({ onAdd, onClose }: ProductSelectorProps) {
  const [step, setStep] = useState<'size' | 'product' | 'toppings' | 'checkout'>('size');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<string>('');

  const currentSize = SIZES.find((s) => s.id === selectedSize);
  const currentProduct = PRODUCTS.find((p) => p.id === selectedProduct);

  const handleSizeSelect = (sizeId: string) => {
    setSelectedSize(sizeId);
    setStep('product');
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    setStep('toppings');
  };

  const handleToppingToggle = (topping: string) => {
    setSelectedToppings((prev) =>
      prev.includes(topping) ? prev.filter((t) => t !== topping) : [...prev, topping]
    );
  };

  const handleCheckout = () => {
    if (!selectedSize || !selectedProduct) {
      alert('Vui lòng chọn size và sản phẩm');
      return;
    }

    const price = customPrice ? parseInt(customPrice) : currentProduct?.price || 0;

    onAdd({
      id: `${selectedProduct}_${Date.now()}`,
      name: currentProduct?.name || 'Sản phẩm',
      productName: currentProduct?.name || 'Sản phẩm',
      productId: selectedProduct,
      size: selectedSize,
      toppings: selectedToppings,
      quantity,
      price,
      protein: currentSize?.protein || 40,
    });

    setSelectedSize('');
    setSelectedProduct('');
    setSelectedToppings([]);
    setQuantity(1);
    setCustomPrice('');
    setStep('size');
    onClose();
  };

  const handleBack = () => {
    if (step === 'product') {
      setSelectedSize('');
      setStep('size');
    } else if (step === 'toppings') {
      setSelectedProduct('');
      setStep('product');
    } else if (step === 'checkout') {
      setSelectedToppings([]);
      setStep('toppings');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {step === 'size' && 'Chọn Size (ml)'}
            {step === 'product' && `${selectedSize} - Chọn Sản Phẩm`}
            {step === 'toppings' && `${currentProduct?.name} - Chọn Vị`}
            {step === 'checkout' && 'Xác Nhận Đơn Hàng'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Size Selection */}
          {step === 'size' && (
            <div className="space-y-4">
              <p className="text-gray-600 mb-6">Chọn size (ml) trước tiên</p>
              <div className="grid grid-cols-1 gap-3">
                {SIZES.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => handleSizeSelect(size.id)}
                    className="p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-lg">{size.label}</div>
                        <div className="text-sm text-gray-600">{size.protein}g Protein</div>
                      </div>
                      <div className="text-emerald-600">→</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Product Selection */}
          {step === 'product' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {PRODUCTS.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductSelect(product.id)}
                    className="p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold">{product.name}</div>
                        <div className="text-sm text-gray-600">{product.price.toLocaleString('vi-VN')} đ</div>
                      </div>
                      <div className="text-emerald-600">→</div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleBack}
                className="w-full mt-4 py-2 text-gray-600 hover:text-gray-800 font-semibold"
              >
                ← Quay lại
              </button>
            </div>
          )}

          {/* Step 3: Toppings Selection */}
          {step === 'toppings' && (
            <div className="space-y-4">
              <p className="text-gray-600">Chọn vị (toppings) - có thể chọn nhiều</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TOPPINGS.map((topping) => (
                  <button
                    key={topping}
                    onClick={() => handleToppingToggle(topping)}
                    className={`p-3 rounded-lg font-semibold transition-all ${
                      selectedToppings.includes(topping)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {topping}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  ← Quay lại
                </button>
                <button
                  onClick={() => setStep('checkout')}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
                >
                  Tiếp tục →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Checkout */}
          {step === 'checkout' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sản phẩm:</span>
                    <span className="font-semibold">{currentProduct?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Size:</span>
                    <span className="font-semibold">{selectedSize}</span>
                  </div>
                  {selectedToppings.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vị:</span>
                      <span className="font-semibold">{selectedToppings.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-600">Protein:</span>
                    <span className="font-semibold">{currentSize?.protein}g</span>
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Số lượng</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg px-3 py-2"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Giá</label>
                <div className="flex items-baseline gap-3">
                  <span className="text-sm text-gray-600">Mặc định:</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {(customPrice ? parseInt(customPrice) : currentProduct?.price || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <input
                  type="number"
                  placeholder="Nhập giá tùy chỉnh (nếu cần)"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full mt-3 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  ← Quay lại
                </button>
                <button
                  onClick={handleCheckout}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
                >
                  ✓ Thêm vào đơn
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
