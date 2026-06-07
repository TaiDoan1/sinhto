import { AlertTriangle, Package, TrendingDown, RefreshCw } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minThreshold: number;
  unit: string;
  usedIn: string[];
  estimatedDaysLeft: number;
  status: 'critical' | 'warning' | 'ok';
}

const mockInventory: InventoryItem[] = [
  {
    id: 'ING-001',
    name: 'Bột Protein',
    currentStock: 2.5,
    minThreshold: 5,
    unit: 'kg',
    usedIn: ['Protein Shake', 'Green Power Combo'],
    estimatedDaysLeft: 2,
    status: 'critical'
  },
  {
    id: 'ING-002',
    name: 'Sữa Hạt',
    currentStock: 8,
    minThreshold: 15,
    unit: 'lít',
    usedIn: ['Berry Mix', 'Mango Tango', 'Avocado Dream'],
    estimatedDaysLeft: 3,
    status: 'warning'
  },
  {
    id: 'ING-003',
    name: 'Dâu Tây Đông Lạnh',
    currentStock: 3,
    minThreshold: 10,
    unit: 'kg',
    usedIn: ['Strawberry Blast', 'Berry Mix Combo'],
    estimatedDaysLeft: 1,
    status: 'critical'
  },
  {
    id: 'ING-004',
    name: 'Xoài',
    currentStock: 12,
    minThreshold: 15,
    unit: 'kg',
    usedIn: ['Mango Tango', 'Tropical Paradise'],
    estimatedDaysLeft: 4,
    status: 'warning'
  },
  {
    id: 'ING-005',
    name: 'Bơ',
    currentStock: 4,
    minThreshold: 8,
    unit: 'kg',
    usedIn: ['Avocado Dream', 'Green Smoothie'],
    estimatedDaysLeft: 2,
    status: 'warning'
  },
  {
    id: 'ING-006',
    name: 'Chuối',
    currentStock: 25,
    minThreshold: 20,
    unit: 'kg',
    usedIn: ['Tất cả smoothie'],
    estimatedDaysLeft: 7,
    status: 'ok'
  },
];

export function InventoryAlert() {
  const criticalItems = mockInventory.filter(item => item.status === 'critical');
  const warningItems = mockInventory.filter(item => item.status === 'warning');
  const okItems = mockInventory.filter(item => item.status === 'ok');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản Lý Kho Hàng</h1>
        <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
          <RefreshCw className="w-5 h-5" />
          Cập Nhật Kho
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-8 h-8" />
            <div className="text-sm opacity-90">Cảnh Báo Nghiêm Trọng</div>
          </div>
          <div className="text-4xl font-bold">{criticalItems.length}</div>
          <div className="text-sm opacity-90 mt-1">nguyên liệu cần đặt gấp</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-8 h-8" />
            <div className="text-sm opacity-90">Cảnh Báo</div>
          </div>
          <div className="text-4xl font-bold">{warningItems.length}</div>
          <div className="text-sm opacity-90 mt-1">nguyên liệu sắp hết</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-8 h-8" />
            <div className="text-sm opacity-90">Tồn Kho Tốt</div>
          </div>
          <div className="text-4xl font-bold">{okItems.length}</div>
          <div className="text-sm opacity-90 mt-1">nguyên liệu đủ dùng</div>
        </div>
      </div>

      {criticalItems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-600">CẢNH BÁO NGHIÊM TRỌNG</h2>
          </div>
          <div className="space-y-3">
            {criticalItems.map(item => (
              <div key={item.id} className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                      <span className="text-xs text-gray-500">{item.id}</span>
                      <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-xs font-bold">
                        CÒN {item.estimatedDaysLeft} NGÀY
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-2">
                      <div>
                        <div className="text-xs text-gray-600">Tồn Kho Hiện Tại</div>
                        <div className="text-xl font-bold text-red-600">
                          {item.currentStock} {item.unit}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Mức Tối Thiểu</div>
                        <div className="text-xl font-bold text-gray-700">
                          {item.minThreshold} {item.unit}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Cần Đặt Thêm</div>
                        <div className="text-xl font-bold text-emerald-700">
                          {(item.minThreshold - item.currentStock).toFixed(1)} {item.unit}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">
                      <strong>Dùng trong:</strong> {item.usedIn.join(', ')}
                    </div>
                  </div>
                  <button className="ml-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                    Đặt Hàng Ngay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {warningItems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-6 h-6 text-emerald-700" />
            <h2 className="text-xl font-bold text-emerald-700">CẢNH BÁO</h2>
          </div>
          <div className="space-y-3">
            {warningItems.map(item => (
              <div key={item.id} className="bg-emerald-50 border-2 border-orange-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                      <span className="text-xs text-gray-500">{item.id}</span>
                      <span className="px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-xs font-bold">
                        CÒN {item.estimatedDaysLeft} NGÀY
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-2">
                      <div>
                        <div className="text-xs text-gray-600">Tồn Kho Hiện Tại</div>
                        <div className="text-lg font-bold text-emerald-700">
                          {item.currentStock} {item.unit}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Mức Tối Thiểu</div>
                        <div className="text-lg font-bold text-gray-700">
                          {item.minThreshold} {item.unit}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Cần Đặt Thêm</div>
                        <div className="text-lg font-bold text-emerald-700">
                          {(item.minThreshold - item.currentStock).toFixed(1)} {item.unit}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">
                      <strong>Dùng trong:</strong> {item.usedIn.join(', ')}
                    </div>
                  </div>
                  <button className="ml-4 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                    Đặt Hàng
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {okItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-green-600">TỒN KHO TỐT</h2>
          </div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Nguyên Liệu</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Tồn Kho</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Mức Tối Thiểu</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Đủ Dùng</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Dùng Trong</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {okItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.id}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-green-600">
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {item.minThreshold} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        {item.estimatedDaysLeft} ngày
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.usedIn.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
