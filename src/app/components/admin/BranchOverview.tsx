import { Building2, ChevronRight, MapPin, Phone, Plus, Pencil, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BranchDetail } from './BranchDetail';
import { BranchFormModal } from './BranchFormModal';
import { useBranches } from '../../contexts/BranchContext';
import type { Branch } from '../../types/branch';
import * as api from '../../utils/api';

export function BranchOverview() {
  const { branches, refresh } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [formBranch, setFormBranch] = useState<Branch | null | undefined>(undefined);
  const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    api.fetchEmployees()
      .then((emps) => {
        const counts: Record<string, number> = {};
        for (const e of emps) {
          if (e.branch) counts[e.branch] = (counts[e.branch] || 0) + 1;
        }
        setEmployeeCounts(counts);
      })
      .catch(() => {});
  }, [branches]);

  const sorted = useMemo(
    () => [...branches].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    [branches]
  );

  const handleSave = async (data: Partial<Branch>) => {
    await api.saveBranch(data as Branch);
    await refresh();
  };

  if (selectedBranch) {
    const latest = branches.find((b) => b.id === selectedBranch.id) || selectedBranch;
    return (
      <>
        <BranchDetail
          branch={latest}
          onBack={() => setSelectedBranch(null)}
          onEdit={() => setFormBranch(latest)}
        />
        {formBranch !== undefined && (
          <BranchFormModal
            branch={formBranch}
            onClose={() => setFormBranch(undefined)}
            onSave={async (data) => {
              await handleSave(data);
              if (selectedBranch && data.id === selectedBranch.id) {
                setSelectedBranch({ ...latest, ...data } as Branch);
              }
            }}
          />
        )}
      </>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản Lý Cửa Hàng</h1>
          <p className="text-gray-600 mt-1">
            Tạo chi nhánh, cập nhật địa chỉ và quản lý nhân viên từng cửa hàng.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormBranch(null)}
          className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md"
        >
          <Plus className="w-5 h-5" />
          Thêm chi nhánh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sorted.map((branch) => (
          <div
            key={branch.id}
            className={`bg-white rounded-xl shadow-lg border-l-4 ${
              branch.active ? 'border-emerald-600' : 'border-gray-400 opacity-75'
            } overflow-hidden`}
          >
            <button
              type="button"
              onClick={() => setSelectedBranch(branch)}
              className="w-full p-6 text-left hover:bg-emerald-50/50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-emerald-700">
                      {branch.name}
                    </h3>
                    <span className="text-sm text-gray-500">{branch.id}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600" />
              </div>

              {branch.address && (
                <p className="text-sm text-gray-600 mt-3 flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
                  {branch.address}
                </p>
              )}
              {branch.phone && (
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {branch.phone}
                </p>
              )}

              <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{employeeCounts[branch.id] || 0} nhân viên</span>
                {!branch.active && (
                  <span className="ml-auto px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-semibold">
                    Tạm ngưng
                  </span>
                )}
              </div>
            </button>

            <div className="px-6 pb-4">
              <button
                type="button"
                onClick={() => setFormBranch(branch)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
              >
                <Pencil className="w-4 h-4" />
                Sửa thông tin
              </button>
            </div>
          </div>
        ))}
      </div>

      {formBranch !== undefined && (
        <BranchFormModal
          branch={formBranch}
          onClose={() => setFormBranch(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
