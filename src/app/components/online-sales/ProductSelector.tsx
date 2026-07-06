import { useState } from 'react';
import { Plus, Minus, ArrowLeft } from 'lucide-react';

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
  onCancel: () => void;
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

export function ProductSelector({ onAdd, onCancel }: ProductSelectorProps) {
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

    // Reset form
    setSelectedSize('');
    setSelectedProduct('');
    setSelectedToppings([]);
    setQuantity(1);
    setCustomPrice('');
    setStep('size');
    onCancel();
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

  const getTitle = () => {
    if (step === 'size') return 'Chọn Size (ml)';
    if (step === 'product') return `${selectedSize} - Chọn Sản Phẩm`;
    if (step === 'toppings') return `${currentProduct?.name} - Chọn Vị`;
    return 'Xác Nhận Đơn Hàng';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {step !== 'size' && (
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg"
            type="button"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <h3 className="font-bold text-lg text-gray-900">{getTitle()}</h3>
        {step === 'size' && (
          <button
            onClick={onCancel}
            className="ml-auto text-gray-500 hover:text-gray-700 font-semibold text-sm"
            type="button"
          >
            Hủy
          </button>
        )}
      </div>

      {/* Content */}
      <div>
        {/* Step 1: Size Selection */}
        {step === 'size' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Chọn size (ml) trước tiên</p>
            {SIZES.map((size) => (
              <button
                key={size.id}
                onClick={() => handleSizeSelect(size.id)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                type="button"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-base">{size.label}</div>
                    <div className="text-sm text-gray-600">{size.protein}g Protein</div>
                  </div>
                  <div className="text-indigo-600">→</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Product Selection */}
        {step === 'product' && (
          <div className="space-y-3">
            {PRODUCTS.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductSelect(product.id)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                type="button"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{product.name}</div>
                    <div className="text-sm text-gray-600">{product.price.toLocaleString('vi-VN')} đ</div>
                  </div>
                  <div className="text-indigo-600">→</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Toppings Selection */}
        {step === 'toppings' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Chọn vị (toppings) - có thể chọn nhiều</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TOPPINGS.map((topping) => (
                <button
                  key={topping}
                  onClick={() => handleToppingToggle(topping)}
                  className={`p-3 rounded-lg font-semibold transition-all text-sm ${
                    selectedToppings.includes(topping)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  type="button"
                >
                  {topping}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('checkout')}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 mt-4"
              type="button"
            >
              Tiếp tục →
            </button>
          </div>
        )}

        {/* Step 4: Checkout */}
        {step === 'checkout' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-indigo-50 rounded-xl p-4 space-y-2 text-sm">
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
                  <span className="font-semibold text-right">{selectedToppings.join(', ')}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-indigo-100">
                <span className="text-gray-600">Protein:</span>
                <span className="font-semibold">{currentSize?.protein}g</span>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Số lượng</label>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-1.5 hover:bg-white rounded"
                  type="button"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 text-center font-bold border-0 bg-transparent"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-1.5 hover:bg-white rounded"
                  type="button"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Giá</label>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-sm text-gray-600">Mặc định:</span>
                <span className="text-xl font-bold text-indigo-600">
                  {(customPrice ? parseInt(customPrice) : currentProduct?.price || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <input
                type="number"
                placeholder="Nhập giá tùy chỉnh (nếu cần)"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleBack}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                type="button"
              >
                ← Quay lại
              </button>
              <button
                onClick={handleCheckout}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                type="button"
              >
                ✓ Thêm vào đơn
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
