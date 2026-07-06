import { useState, useEffect } from 'react';
import { Package, ArrowRight, AlertTriangle } from 'lucide-react';
import { useBranches } from '../../contexts/BranchContext';
import * as api from '../../utils/api';

export interface InventoryItem {
  id: string;
  name: string;
  unit: 'kg' | 'lít' | 'gói' | 'cái';
  category: 'fruit' | 'dairy' | 'protein' | 'topping' | 'other';
  minStock: number;
  cost: number;
}

interface BranchInventory extends InventoryItem {
  currentStock: number;
  branchId: string;
  status: 'low' | 'ok' | 'none';
}

export function CrossBranchInventory() {
  const { activeBranches } = useBranches();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [branchInventories, setBranchInventories] = useState<Map<string, BranchInventory[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [moveModal, setMoveModal] = useState<{
    fromBranch: string;
    toBranch: string;
    itemId: string;
    itemName: string;
    quantity: number;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const inventories = new Map<string, BranchInventory[]>();

        // Fetch inventory for each branch
        for (const branch of activeBranches) {
          const branchData = (await api.fetchInventory(branch.id)) as any;
          const itemsList = branchData.items || [];
          const withStatus = itemsList.map((inv: any) => ({
            id: inv.id,
            name: inv.name,
            unit: inv.unit,
            category: inv.category || 'other',
            minStock: inv.minStock || 0,
            cost: inv.cost || 0,
            currentStock: inv.currentStock || 0,
            branchId: branch.id,
            status: (inv.currentStock || 0) === 0 ? 'none' : (inv.currentStock || 0) < (inv.minStock || 0) ? 'low' : 'ok',
          }));
          inventories.set(branch.id, withStatus);

          // Collect unique items
          setItems(prev => {
            const existing = new Map<string, InventoryItem>();
            prev.forEach(item => existing.set(item.id, item));
            itemsList.forEach((inv: any) => {
              if (!existing.has(inv.id)) {
                existing.set(inv.id, {
                  id: inv.id,
                  name: inv.name,
                  unit: inv.unit,
                  category: inv.category || 'other',
                  minStock: inv.minStock || 0,
                  cost: inv.cost || 0,
                });
              }
            });
            return Array.from(existing.values());
          });
        }

        setBranchInventories(inventories);
      } catch (err) {
        console.error('Failed to load cross-branch inventory:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [activeBranches]);

  const handleMoveStock = async () => {
    if (!moveModal || !moveModal.fromBranch || !moveModal.toBranch) return;
    try {
      // Get current inventory for both branches
      const fromBranchData = (await api.fetchInventory(moveModal.fromBranch)) as any;
      const toBranchData = (await api.fetchInventory(moveModal.toBranch)) as any;

      const fromItem = fromBranchData.items?.find((i: any) => i.id === moveModal.itemId);
      const toItem = toBranchData.items?.find((i: any) => i.id === moveModal.itemId);

      if (!fromItem || (fromItem.currentStock || 0) < moveModal.quantity) {
        alert('Kho không đủ hàng để chuyển.');
        return;
      }

      // Update both branches
      const updatedFromItems = fromBranchData.items.map((i: any) =>
        i.id === moveModal.itemId ? { ...i, currentStock: (i.currentStock || 0) - moveModal.quantity } : i
      );
      const updatedToItems = toBranchData.items.map((i: any) =>
        i.id === moveModal.itemId ? { ...i, currentStock: (i.currentStock || 0) + moveModal.quantity } : i
      );

      // Create movements for tracking
      const movement = {
        id: `move-${Date.now()}`,
        timestamp: new Date(),
        type: 'adjustment' as const,
        itemId: moveModal.itemId,
        itemName: moveModal.itemName,
        quantity: moveModal.quantity,
        reason: `Chuyển từ ${moveModal.fromBranch} sang ${moveModal.toBranch}`,
        performedBy: 'store_manager',
        cost: 0,
        branchId: moveModal.fromBranch,
      };

      await api.updateInventory(updatedFromItems, [movement], moveModal.fromBranch);
      await api.updateInventory(updatedToItems, [], moveModal.toBranch);

      alert('Chuyển kho thành công!');
      setMoveModal(null);
      // Reload data
      window.location.reload();
    } catch (err) {
      console.error('Failed to move stock:', err);
      alert('Lỗi chuyển kho. Vui lòng thử lại.');
    }
  };

  const categories = ['all', 'fruit', 'dairy', 'protein', 'topping', 'other'];
  const categoryLabels: Record<string, string> = {
    all: 'Tất cả',
    fruit: 'Trái cây',
    dairy: 'Sản phẩm sữa',
    protein: 'Protein',
    topping: 'Topping',
    other: 'Khác',
  };

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter((i) => i.category === selectedCategory);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Đang tải kho...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-3 sm:px-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Quản Lý Kho Toàn Cửa Hàng</h1>
        <p className="text-sm sm:text-base text-gray-600">So sánh tồn kho giữa các chi nhánh và điều chuyển hàng</p>
      </div>

      {/* Category filter */}
      <div className="bg-white rounded-xl shadow-md p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold text-gray-700">Tên</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold text-gray-700">Đơn vị</th>
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-left font-semibold text-gray-700">Min</th>
                {activeBranches.map((branch) => (
                  <th key={branch.id} className="px-2 sm:px-6 py-2 sm:py-3 text-center font-semibold text-gray-700">
                    {branch.id}
                  </th>
                ))}
                <th className="px-2 sm:px-6 py-2 sm:py-3 text-center font-semibold text-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-2 sm:px-6 py-2 sm:py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 text-gray-600">{item.unit}</td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 text-gray-600">{item.minStock}</td>
                  {activeBranches.map((branch) => {
                    const inv = branchInventories
                      .get(branch.id)
                      ?.find((i) => i.id === item.id);
                    const stock = inv?.currentStock ?? 0;
                    const isLow = stock < item.minStock;
                    const isEmpty = stock === 0;

                    return (
                      <td
                        key={branch.id}
                        className={`px-2 sm:px-6 py-2 sm:py-4 text-center font-semibold ${
                          isEmpty
                            ? 'text-red-700 bg-red-50'
                            : isLow
                            ? 'text-orange-700 bg-orange-50'
                            : 'text-green-700 bg-green-50'
                        }`}
                      >
                        {stock} {isEmpty && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                      </td>
                    );
                  })}
                  <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">
                    <button
                      onClick={() => setMoveModal({ fromBranch: '', toBranch: '', itemId: item.id, itemName: item.name, quantity: 0 })}
                      className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs sm:text-sm whitespace-nowrap"
                    >
                      <ArrowRight className="inline w-3 sm:w-4 h-3 sm:h-4" /> Chuyển
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Move stock modal */}
      {moveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Chuyển kho - {moveModal.itemName}</h3>
              <button onClick={() => setMoveModal(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Từ chi nhánh</label>
                <select
                  value={moveModal.fromBranch}
                  onChange={(e) => setMoveModal({ ...moveModal, fromBranch: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Chọn chi nhánh</option>
                  {activeBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.id} — {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Đến chi nhánh</label>
                <select
                  value={moveModal.toBranch}
                  onChange={(e) => setMoveModal({ ...moveModal, toBranch: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Chọn chi nhánh</option>
                  {activeBranches.map((branch) => (
                    <option key={branch.id} value={branch.id} disabled={branch.id === moveModal.fromBranch}>
                      {branch.id} — {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Số lượng</label>
                <input
                  type="number"
                  min="1"
                  value={moveModal.quantity}
                  onChange={(e) => setMoveModal({ ...moveModal, quantity: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setMoveModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleMoveStock}
                  disabled={!moveModal.fromBranch || !moveModal.toBranch || moveModal.quantity <= 0}
                  className="flex-1 px-4 py-2 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 disabled:bg-gray-300"
                >
                  Chuyển
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
