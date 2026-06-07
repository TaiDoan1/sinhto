import { useState } from 'react';
import { Package, AlertTriangle, TrendingDown, DollarSign, History, ChevronDown, ChevronUp } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';

export function InventoryDashboard() {
  const { inventory, movements, getLowStockItems, getOutOfStockItems, getTodayStats } = useInventory();
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const lowStockItems = getLowStockItems();
  const outOfStockItems = getOutOfStockItems();
  const stats = getTodayStats();

  const categories = {
    fruit: { name: 'Trái Cây', icon: '🍓', color: 'bg-red-100 text-red-700' },
    dairy: { name: 'Sữa', icon: '🥛', color: 'bg-emerald-100 text-emerald-800' },
    protein: { name: 'Protein', icon: '💪', color: 'bg-emerald-100 text-emerald-700' },
    topping: { name: 'Topping', icon: '✨', color: 'bg-yellow-100 text-yellow-700' },
    other: { name: 'Khác', icon: '📦', color: 'bg-gray-100 text-gray-700' }
  };

  const groupedInventory = inventory.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof inventory>);

  const getStockStatus = (item: typeof inventory[0]) => {
    if (item.currentStock <= 0) return { label: 'Hết hàng', color: 'bg-red-500 text-white' };
    if (item.currentStock <= item.minStock) return { label: 'Sắp hết', color: 'bg-emerald-600 text-white' };
    return { label: 'Đủ', color: 'bg-green-500 text-white' };
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-emerald-100 text-emerald-800';
      case 'void_return': return 'bg-green-100 text-green-700';
      case 'waste': return 'bg-red-100 text-red-700';
      case 'refund': return 'bg-emerald-100 text-emerald-700';
      case 'purchase': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'sale': return 'Bán hàng';
      case 'void_return': return 'Hoàn kho';
      case 'waste': return 'Lãng phí';
      case 'refund': return 'Hoàn tiền';
      case 'purchase': return 'Nhập kho';
      default: return 'Điều chỉnh';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Quản Lý Tồn Kho</h1>
        <p className="text-gray-600">Theo dõi nguyên liệu và chi phí hoạt động</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-600">Nguyên Liệu Sử Dụng</div>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-800">{stats.totalUsed.toLocaleString('vi-VN')}đ</div>
          <div className="text-xs text-gray-500 mt-1">Hôm nay</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-600">Lãng Phí</div>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-gray-800">{stats.totalWaste.toLocaleString('vi-VN')}đ</div>
          <div className="text-xs text-gray-500 mt-1">{stats.wastePercentage.toFixed(1)}% của tổng sử dụng</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-600">Cảnh Báo</div>
            <AlertTriangle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-800">{lowStockItems.length}</div>
          <div className="text-xs text-gray-500 mt-1">Nguyên liệu sắp hết</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-600">Tổng Tồn Kho</div>
            <Package className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-gray-800">{inventory.length}</div>
          <div className="text-xs text-gray-500 mt-1">Loại nguyên liệu</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
            activeTab === 'stock'
              ? 'bg-emerald-700 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Package className="w-5 h-5 inline mr-2" />
          Tồn Kho
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
            activeTab === 'movements'
              ? 'bg-emerald-700 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <History className="w-5 h-5 inline mr-2" />
          Lịch Sử Xuất Nhập
        </button>
      </div>

      {/* Content */}
      {activeTab === 'stock' ? (
        <div className="space-y-4">
          {/* Alerts */}
          {outOfStockItems.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-red-800">Hết Hàng ({outOfStockItems.length})</h3>
              </div>
              <div className="space-y-1">
                {outOfStockItems.map(item => (
                  <div key={item.id} className="text-sm text-red-700">
                    • {item.name} - Cần nhập thêm tối thiểu {item.minStock} {item.unit}
                  </div>
                ))}
              </div>
            </div>
          )}

          {lowStockItems.length > 0 && (
            <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-orange-800">Sắp Hết ({lowStockItems.length})</h3>
              </div>
              <div className="space-y-1">
                {lowStockItems.map(item => (
                  <div key={item.id} className="text-sm text-emerald-700">
                    • {item.name} - Còn {item.currentStock} {item.unit} (tối thiểu {item.minStock} {item.unit})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory by Category */}
          {Object.entries(groupedInventory).map(([category, items]) => {
            const cat = categories[category as keyof typeof categories];
            const isExpanded = expandedCategory === category;

            return (
              <div key={category} className="bg-white rounded-xl shadow-md overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-800">{cat.name}</h3>
                      <p className="text-sm text-gray-600">{items.length} mặt hàng</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold text-gray-600">Nguyên Liệu</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-600">Tồn Kho</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-600">Tối Thiểu</th>
                          <th className="text-right p-3 text-sm font-semibold text-gray-600">Giá Vốn</th>
                          <th className="text-center p-3 text-sm font-semibold text-gray-600">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => {
                          const status = getStockStatus(item);
                          return (
                            <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="p-3 text-sm font-medium text-gray-800">{item.name}</td>
                              <td className="p-3 text-sm text-center text-gray-700">
                                {item.currentStock} {item.unit}
                              </td>
                              <td className="p-3 text-sm text-center text-gray-600">
                                {item.minStock} {item.unit}
                              </td>
                              <td className="p-3 text-sm text-right font-semibold text-gray-700">
                                {item.cost.toLocaleString('vi-VN')}đ/{item.unit}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${status.color}`}>
                                  {status.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-gray-600">Thời Gian</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-600">Loại</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-600">Nguyên Liệu</th>
                  <th className="text-center p-3 text-sm font-semibold text-gray-600">Số Lượng</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-600">Lý Do</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-600">Nhân Viên</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-600">Giá Trị</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Chưa có hoạt động</p>
                    </td>
                  </tr>
                ) : (
                  movements.slice(0, 50).map(movement => (
                    <tr key={movement.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-3 text-xs text-gray-600">{formatDate(movement.timestamp)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getMovementColor(movement.type)}`}>
                          {getMovementLabel(movement.type)}
                        </span>
                      </td>
                      <td className="p-3 text-sm font-medium text-gray-800">{movement.itemName}</td>
                      <td className={`p-3 text-sm text-center font-semibold ${
                        movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </td>
                      <td className="p-3 text-sm text-gray-600">{movement.reason}</td>
                      <td className="p-3 text-sm text-gray-600">{movement.performedBy}</td>
                      <td className="p-3 text-sm text-right font-semibold text-gray-700">
                        {movement.cost.toLocaleString('vi-VN')}đ
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
