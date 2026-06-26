import { useEffect, useState } from 'react';
import { AlertTriangle, Package, Plus, TrendingDown, Truck, X } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';

interface BranchInventoryProps {
  branchId: string;
}

function stockStatus(current: number, min: number): 'critical' | 'warning' | 'ok' {
  if (current <= 0) return 'critical';
  if (current <= min) return 'warning';
  return 'ok';
}

export function BranchInventory({ branchId }: BranchInventoryProps) {
  const {
    inventory,
    loadForBranch,
    purchaseStock,
    isWarehouseReady,
    getLowStockItems,
    getOutOfStockItems,
  } = useInventory();

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseItemId, setPurchaseItemId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseNote, setPurchaseNote] = useState('');
  const [purchaseSaving, setPurchaseSaving] = useState(false);

  useEffect(() => {
    loadForBranch(branchId);
  }, [branchId, loadForBranch]);

  const criticalItems = getOutOfStockItems();
  const warningItems = getLowStockItems();
  const okItems = inventory.filter(
    (item) => stockStatus(item.currentStock, item.minStock) === 'ok'
  );

  const openPurchase = (itemId?: string) => {
    setPurchaseItemId(itemId || '');
    setPurchaseQty('');
    setPurchaseSupplier('');
    setPurchaseNote('');
    setShowPurchaseModal(true);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(purchaseQty);
    if (!purchaseItemId || !qty || qty <= 0) return alert('Chọn nguyên liệu và số lượng nhập');
    setPurchaseSaving(true);
    try {
      const ok = await purchaseStock(
        purchaseItemId,
        qty,
        'Admin',
        purchaseNote || 'Nhap kho',
        purchaseSupplier || undefined
      );
      if (ok) {
        alert('Nhập kho thành công!');
        setShowPurchaseModal(false);
      } else {
        alert('Nhập kho thất bại');
      }
    } finally {
      setPurchaseSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tồn Kho — {branchId}</h2>
          <p className="text-sm text-gray-500 mt-1">Mỗi chi nhánh quản lý kho riêng</p>
        </div>
        <button
          type="button"
          onClick={() => openPurchase()}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nhập Kho
        </button>
      </div>

      {!isWarehouseReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-amber-800">
          <p className="font-bold">Chưa có phiếu nhập kho tại chi nhánh này</p>
          <p className="text-sm mt-1">POS {branchId} không thể bán cho đến khi nhập kho lần đầu.</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6" />
            <div className="text-sm opacity-90">Hết hàng</div>
          </div>
          <div className="text-3xl font-bold">{criticalItems.length}</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-6 h-6" />
            <div className="text-sm opacity-90">Sắp hết</div>
          </div>
          <div className="text-3xl font-bold">{warningItems.length}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-6 h-6" />
            <div className="text-sm opacity-90">Đủ dùng</div>
          </div>
          <div className="text-3xl font-bold">{okItems.length}</div>
        </div>
      </div>

      {inventory.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 text-lg">Chưa có danh mục nguyên liệu</p>
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
              {inventory.map((item) => {
                const status = stockStatus(item.currentStock, item.minStock);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-600">{item.id}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">{item.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-bold ${
                          status === 'critical'
                            ? 'text-red-600'
                            : status === 'warning'
                              ? 'text-emerald-700'
                              : 'text-green-600'
                        }`}
                      >
                        {item.currentStock} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {item.minStock} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {status === 'critical' && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                          Hết hàng
                        </span>
                      )}
                      {status === 'warning' && (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                          Sắp hết
                        </span>
                      )}
                      {status === 'ok' && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          Đủ dùng
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => openPurchase(item.id)}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-sm font-semibold transition-colors"
                      >
                        Nhập kho
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Truck className="w-6 h-6 text-emerald-600" /> Nhập kho — {branchId}
              </h3>
              <button type="button" onClick={() => setShowPurchaseModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nguyên liệu</label>
                <select
                  value={purchaseItemId}
                  onChange={(e) => setPurchaseItemId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                >
                  <option value="">-- Chọn --</option>
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (còn {item.currentStock} {item.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số lượng</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nhà cung cấp</label>
                <input
                  type="text"
                  value={purchaseSupplier}
                  onChange={(e) => setPurchaseSupplier(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Tùy chọn"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={purchaseNote}
                  onChange={(e) => setPurchaseNote(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Phiếu nhập kho..."
                />
              </div>
              <button
                type="submit"
                disabled={purchaseSaving}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-lg font-bold disabled:opacity-50"
              >
                {purchaseSaving ? 'Đang lưu...' : 'Xác nhận nhập kho'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
