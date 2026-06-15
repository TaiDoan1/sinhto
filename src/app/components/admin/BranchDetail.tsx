import { ArrowLeft, Users, Package, ShoppingBag, Truck } from 'lucide-react';
import { useState } from 'react';
import { BranchStaff } from './BranchStaff';
import { BranchInventory } from './BranchInventory';
import { BranchOrders } from './BranchOrders';
import { BranchComboDeliveries } from './BranchComboDeliveries';

interface BranchDetailProps {
  branchId: string;
  branchName: string;
  onBack: () => void;
}

export function BranchDetail({ branchId, branchName, onBack }: BranchDetailProps) {
  const [activeTab, setActiveTab] = useState<'staff' | 'inventory' | 'orders' | 'combos'>('staff');

  const renderContent = () => {
    switch (activeTab) {
      case 'staff':
        return <BranchStaff branchId={branchId} />;
      case 'inventory':
        return <BranchInventory branchId={branchId} />;
      case 'orders':
        return <BranchOrders branchId={branchId} />;
      case 'combos':
        return <BranchComboDeliveries branchId={branchId} />;
      default:
        return <BranchStaff branchId={branchId} />;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-semibold mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Quay lại
        </button>
        <h1 className="text-3xl font-bold text-gray-800">{branchName}</h1>
        <p className="text-gray-600 mt-1">Mã chi nhánh: {branchId}</p>
      </div>

      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'staff'
                ? 'text-emerald-700 border-b-2 border-emerald-700 bg-emerald-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            Nhân Viên
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'inventory'
                ? 'text-emerald-700 border-b-2 border-emerald-700 bg-emerald-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package className="w-5 h-5" />
            Tồn Kho
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'orders'
                ? 'text-emerald-700 border-b-2 border-emerald-700 bg-emerald-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            Đơn Hàng
          </button>
          <button
            onClick={() => setActiveTab('combos')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'combos'
                ? 'text-emerald-700 border-b-2 border-emerald-700 bg-emerald-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Truck className="w-5 h-5" />
            Lịch Giao Combo
          </button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
