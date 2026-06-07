import { Calendar, Package, MapPin, Check } from 'lucide-react';
import { useState } from 'react';

interface ComboDelivery {
  id: string;
  customerName: string;
  address: string;
  plan: 'weekly' | 'monthly';
  items: string[];
  deliveryTime: string;
  shipped: boolean;
}

const mockCombos: ComboDelivery[] = [
  {
    id: 'COMBO-001',
    customerName: 'Nguyễn Văn A',
    address: '123 Lê Lợi, Q.1',
    plan: 'weekly',
    items: ['Green Power', 'Protein Shake'],
    deliveryTime: '8:00 AM',
    shipped: false
  },
  {
    id: 'COMBO-002',
    customerName: 'Trần Thị B',
    address: '456 Nguyễn Huệ, Q.1',
    plan: 'monthly',
    items: ['Berry Mix', 'Tropical Paradise'],
    deliveryTime: '9:00 AM',
    shipped: false
  },
  {
    id: 'COMBO-003',
    customerName: 'Lê Văn C',
    address: '789 Pasteur, Q.3',
    plan: 'weekly',
    items: ['Strawberry Blast'],
    deliveryTime: '10:00 AM',
    shipped: true
  },
  {
    id: 'COMBO-004',
    customerName: 'Phạm Thị D',
    address: '321 Hai Bà Trưng, Q.3',
    plan: 'monthly',
    items: ['Mango Tango', 'Avocado Dream', 'Green Power'],
    deliveryTime: '11:00 AM',
    shipped: false
  },
];

export function ComboTracking() {
  const [combos, setCombos] = useState<ComboDelivery[]>(mockCombos);

  const handleShipped = (id: string) => {
    setCombos(combos.map(combo =>
      combo.id === id ? { ...combo, shipped: true } : combo
    ));
  };

  const pendingCount = combos.filter(c => !c.shipped).length;
  const completedCount = combos.filter(c => c.shipped).length;

  return (
    <div className="p-4 max-w-md mx-auto pb-20">
      <h1 className="text-2xl mb-4">Giao Hàng Combo</h1>

      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg p-4 mb-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5" />
          <span className="font-semibold">Lịch Hôm Nay</span>
        </div>
        <div className="text-3xl font-bold mb-1">{combos.length} Đơn Giao</div>
        <div className="flex gap-4 text-sm opacity-90">
          <span>{pendingCount} Chưa Giao</span>
          <span>{completedCount} Đã Giao</span>
        </div>
      </div>

      <div className="space-y-3">
        {combos.map(combo => (
          <div
            key={combo.id}
            className={`bg-white rounded-lg shadow-md p-4 ${combo.shipped ? 'opacity-60' : ''}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-lg">{combo.customerName}</div>
                <div className="text-sm text-gray-600">{combo.id}</div>
              </div>
              <div className={`px-3 py-1 rounded text-sm font-semibold ${
                combo.plan === 'weekly'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {combo.plan === 'weekly' ? 'Hàng Tuần' : 'Hàng Tháng'}
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{combo.address}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">Giờ giao: {combo.deliveryTime}</span>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <Package className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  {combo.items.map((item, idx) => (
                    <div key={idx} className="text-gray-700">• {item}</div>
                  ))}
                </div>
              </div>
            </div>

            {!combo.shipped ? (
              <button
                onClick={() => handleShipped(combo.id)}
                className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 font-semibold transition-colors"
              >
                Đánh Dấu Đã Giao
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-green-100 text-green-700 rounded-lg py-2 font-semibold">
                <Check className="w-5 h-5" />
                Đã Giao
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
