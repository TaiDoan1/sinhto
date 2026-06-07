import { useState } from 'react';
import { Box, Search, Save, AlertTriangle, CheckCircle2, History as HistoryIcon, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';

export function InventoryManagement() {
  const { inventory, movements, updateInventoryStock } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'check' | 'history'>('check');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newValue, setNewValue] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setNewValue(item.currentStock.toString());
    setNote('');
  };

  const handleSave = (itemId: string) => {
    const val = parseFloat(newValue);
    if (isNaN(val)) return alert('Vui lòng nhập số hợp lệ');
    
    // In a real app, we'd get the current staff name
    updateInventoryStock(itemId, val, 'Nhân viên POS', note || 'Kiểm kho định kỳ');
    setEditingId(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-white p-4 border-b flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('check')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
              activeSubTab === 'check' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Kiểm Kho
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
              activeSubTab === 'history' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <HistoryIcon className="w-4 h-4" />
            Lịch Sử Nhập/Xuất
          </button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm nguyên liệu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSubTab === 'check' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInventory.map(item => (
              <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border-2 transition-all ${
                item.currentStock <= item.minStock ? 'border-amber-200' : 'border-transparent'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{item.id}</div>
                    <h3 className="text-lg font-black text-gray-900">{item.name}</h3>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                    item.category === 'fruit' ? 'bg-orange-100 text-orange-600' :
                    item.category === 'dairy' ? 'bg-blue-100 text-blue-600' :
                    item.category === 'protein' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.category}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-xs text-gray-500 font-bold">Tồn kho hiện tại</div>
                    <div className={`text-3xl font-black ${
                      item.currentStock <= item.minStock ? 'text-amber-600' : 'text-emerald-700'
                    }`}>
                      {item.currentStock} <span className="text-sm font-bold text-gray-400">{item.unit}</span>
                    </div>
                  </div>
                  {item.currentStock <= item.minStock && (
                    <div className="flex flex-col items-center text-amber-600">
                      <AlertTriangle className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-black uppercase">Sắp hết</span>
                    </div>
                  )}
                </div>

                {editingId === item.id ? (
                  <div className="space-y-3 animate-in slide-in-from-top-2">
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        type="number"
                        step="0.01"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                        placeholder="Số lượng thực tế..."
                      />
                      <button 
                        onClick={() => handleSave(item.id)}
                        className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="p-3 bg-gray-100 text-gray-400 rounded-xl hover:bg-gray-200"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs"
                      placeholder="Ghi chú (tùy chọn)..."
                    />
                  </div>
                ) : (
                  <button 
                    onClick={() => handleStartEdit(item)}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Box className="w-4 h-4" /> Cập nhật thực tế
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-black text-gray-400 uppercase tracking-widest border-b">
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4">Nguyên liệu</th>
                  <th className="px-6 py-4">Loại</th>
                  <th className="px-6 py-4 text-right">Số lượng</th>
                  <th className="px-6 py-4">Lý do</th>
                  <th className="px-6 py-4">Người thực hiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {movements.map(move => (
                  <tr key={move.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                      {new Date(move.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{move.itemName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                        move.type === 'adjustment' ? 'bg-amber-100 text-amber-600' :
                        move.type === 'sale' ? 'bg-blue-100 text-blue-600' :
                        move.type === 'waste' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {move.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-black ${
                      move.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      <div className="flex items-center justify-end gap-1">
                        {move.quantity > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(move.quantity)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 italic">{move.reason}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{move.performedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {movements.length === 0 && (
              <div className="py-20 text-center text-gray-300">
                <HistoryIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">Chưa có lịch sử biến động kho</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
