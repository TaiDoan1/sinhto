import { Building2, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { BranchDetail } from './BranchDetail';

interface BranchData {
  id: string;
  name: string;
}

const BRANCHES: BranchData[] = [
  { id: 'CN1', name: 'Chi Nhánh 1 - Quận 1' },
  { id: 'CN2', name: 'Chi Nhánh 2 - Quận 3' },
  { id: 'CN3', name: 'Chi Nhánh 3 - Thủ Đức' },
];

export function BranchOverview() {
  const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);

  if (selectedBranch) {
    return (
      <BranchDetail
        branchId={selectedBranch.id}
        branchName={selectedBranch.name}
        onBack={() => setSelectedBranch(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Chi Nhánh</h1>
        <p className="text-gray-600 mt-1">
          Chọn chi nhánh để xem nhân viên, tồn kho, đơn hàng và lịch giao combo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {BRANCHES.map((branch) => (
          <button
            key={branch.id}
            type="button"
            onClick={() => setSelectedBranch(branch)}
            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-emerald-600 hover:shadow-xl hover:scale-[1.02] transition-all text-left cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-emerald-700 transition-colors">
                    {branch.name}
                  </h3>
                  <span className="text-sm text-gray-500">{branch.id}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <p className="text-sm text-gray-500 mt-4">Nhấn để xem chi tiết</p>
          </button>
        ))}
      </div>
    </div>
  );
}
