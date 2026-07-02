import { ArrowLeft, Users, Package, ShoppingBag, Truck, MapPin, Phone, Pencil } from 'lucide-react';
import { useState } from 'react';
import { BranchStaff } from './BranchStaff';
import { BranchInventory } from './BranchInventory';
import { BranchOrders } from './BranchOrders';
import { BranchComboDeliveries } from './BranchComboDeliveries';
import type { Branch } from '../../types/branch';

interface BranchDetailProps {
  branch: Branch;
  onBack: () => void;
  onEdit: () => void;
}

export function BranchDetail({ branch, onBack, onEdit }: BranchDetailProps) {
  const [activeTab, setActiveTab] = useState<'staff' | 'inventory' | 'orders' | 'combos'>('staff');

  const renderContent = () => {
    switch (activeTab) {
      case 'staff':
        return <BranchStaff branchId={branch.id} branchName={branch.name} />;
      case 'inventory':
        return <BranchInventory branchId={branch.id} />;
      case 'orders':
        return <BranchOrders branchId={branch.id} />;
      case 'combos':
        return <BranchComboDeliveries branchId={branch.id} />;
      default:
        return <BranchStaff branchId={branch.id} branchName={branch.name} />;
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
          Quay lại danh sách cửa hàng
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{branch.name}</h1>
            <p className="text-gray-600 mt-1">Mã: {branch.id}</p>
            {branch.address && (
              <p className="text-gray-600 mt-2 flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 shrink-0" />
                {branch.address}
              </p>
            )}
            {branch.phone && (
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {branch.phone}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-800 rounded-lg font-semibold hover:bg-emerald-100"
          >
            <Pencil className="w-4 h-4" />
            Sửa địa chỉ / thông tin
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b overflow-x-auto">
          {[
            { id: 'staff' as const, label: 'Nhân Viên', icon: Users },
            { id: 'inventory' as const, label: 'Tồn Kho', icon: Package },
            { id: 'orders' as const, label: 'Đơn Hàng', icon: ShoppingBag },
            { id: 'combos' as const, label: 'Lịch Giao Combo', icon: Truck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-4 font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-emerald-700 border-b-2 border-emerald-700 bg-emerald-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
