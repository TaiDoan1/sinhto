import { useState } from 'react';
import { Building2, Package, Plus, X } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';

/** Danh mục nguyên liệu chung — tồn kho theo từng chi nhánh xem tại Tổng Quan → Chi nhánh */
export function InventoryDashboard() {
  const { addInventoryItem } = useInventory();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState<'kg' | 'lít' | 'gói' | 'cái'>('kg');
  const [newMinStock, setNewMinStock] = useState(1);
  const [newCost, setNewCost] = useState(0);
  const [newCategory, setNewCategory] = useState<'fruit' | 'dairy' | 'protein' | 'topping' | 'other'>('fruit');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return alert('Vui lòng nhập tên nguyên liệu');
    const success = await addInventoryItem({
      name: newName.trim(),
      unit: newUnit,
      currentStock: 0,
      minStock: Number(newMinStock),
      cost: Number(newCost),
      category: newCategory,
    });
    if (success) {
      alert('Thêm nguyên liệu thành công! Nhập kho tại từng chi nhánh.');
      setShowAddModal(false);
      setNewName('');
      setNewMinStock(1);
      setNewCost(0);
    } else {
      alert('Có lỗi xảy ra khi thêm nguyên liệu.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Danh Mục Nguyên Liệu</h1>
        <p className="text-gray-600">Thêm loại nguyên liệu mới cho toàn hệ thống</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex gap-4">
        <Building2 className="w-10 h-10 text-emerald-700 shrink-0" />
        <div>
          <p className="font-bold text-emerald-900 text-lg">Tồn kho theo chi nhánh</p>
          <p className="text-emerald-800 mt-1">
            Mỗi chi nhánh có kho riêng. Để xem tồn kho, nhập kho và lịch sử — vào{' '}
            <strong>Tổng Quan</strong>, chọn chi nhánh (CN1 / CN2 / CN3), mở tab <strong>Tồn Kho</strong>.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-600 mb-4">Thêm nguyên liệu mới vào danh mục (áp dụng cho cả 3 chi nhánh)</p>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Thêm nguyên liệu
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Thêm nguyên liệu mới</h3>
              <button type="button" onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Đơn vị</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as typeof newUnit)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="kg">kg</option>
                    <option value="lít">lít</option>
                    <option value="gói">gói</option>
                    <option value="cái">cái</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tồn tối thiểu</label>
                  <input
                    type="number"
                    min="0"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Giá vốn</label>
                  <input
                    type="number"
                    min="0"
                    value={newCost}
                    onChange={(e) => setNewCost(Number(e.target.value))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Loại</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as typeof newCategory)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="fruit">Trái cây</option>
                    <option value="dairy">Sữa</option>
                    <option value="protein">Protein</option>
                    <option value="topping">Topping</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-lg font-bold"
              >
                Lưu
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
