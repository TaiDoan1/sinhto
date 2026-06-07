import { AlertTriangle, Package, Plus, TrendingDown } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minThreshold: number;
  unit: string;
  status: 'critical' | 'warning' | 'ok';
}

const mockInventory: Record<string, InventoryItem[]> = {
  CN1: [
    {
      id: 'ING-001',
      name: 'Bột Protein',
      currentStock: 15,
      minThreshold: 5,
      unit: 'kg',
      status: 'ok'
    },
    {
      id: 'ING-002',
      name: 'Sữa Hạt',
      currentStock: 25,
      minThreshold: 15,
      unit: 'lít',
      status: 'ok'
    },
    {
      id: 'ING-003',
      name: 'Dâu Tây Đông Lạnh',
      currentStock: 12,
      minThreshold: 10,
      unit: 'kg',
      status: 'ok'
    },
    {
      id: 'ING-004',
      name: 'Xoài',
      currentStock: 20,
      minThreshold: 15,
      unit: 'kg',
      status: 'ok'
    },
  ],
};

interface BranchInventoryProps {
  branchId: string;
}

export function BranchInventory({ branchId }: BranchInventoryProps) {
  const inventory = mockInventory[branchId] || [];
  const criticalItems = inventory.filter(item => item.status === 'critical');
  const warningItems = inventory.filter(item => item.status === 'warning');
  const okItems = inventory.filter(item => item.status === 'ok');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Quản Lý Tồn Kho
        </h2>
        <button className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
          <Plus className="w-5 h-5" />
          Nhập Kho
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6" />
            <div className="text-sm opacity-90">Cần Đặt Gấp</div>
          </div>
          <div className="text-3xl font-bold">{criticalItems.length}</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-6 h-6" />
            <div className="text-sm opacity-90">Sắp Hết</div>
          </div>
          <div className="text-3xl font-bold">{warningItems.length}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-6 h-6" />
            <div className="text-sm opacity-90">Tốt</div>
          </div>
          <div className="text-3xl font-bold">{okItems.length}</div>
        </div>
      </div>

      {inventory.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-lg">Chưa có dữ liệu tồn kho</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mã</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nguyên Liệu</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Tồn Kho</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Mức Tối Thiểu</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Trạng Thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inventory.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-600">{item.id}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{item.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${
                      item.status === 'critical' ? 'text-red-600' :
                      item.status === 'warning' ? 'text-emerald-700' :
                      'text-green-600'
                    }`}>
                      {item.currentStock} {item.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-700">
                    {item.minThreshold} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.status === 'critical' && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                        Cần đặt gấp
                      </span>
                    )}
                    {item.status === 'warning' && (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                        Sắp hết
                      </span>
                    )}
                    {item.status === 'ok' && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        Đủ dùng
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-sm font-semibold transition-colors">
                      Nhập kho
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
