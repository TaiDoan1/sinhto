import { useEffect, useMemo, useState } from 'react';
import { Clock, Camera, History } from 'lucide-react';
import * as api from '../../utils/api';
import { useBranches } from '../../contexts/BranchContext';
import type { WorkShift } from '../../types/employee';
import type { Employee } from './EmployeeRegistration';

interface CheckInRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  location: string;
  status: 'on-time' | 'late' | 'early-leave';
  checkInPhoto?: string;
  checkOutPhoto?: string;
}

/** Lịch sử check-in/out cho Cửa hàng trưởng — dùng CHUNG kiểu hiển thị với Admin (HRPayroll tab
 * "Lịch Sử Check In/Out"): bảng đầy đủ Mã NV / giờ vào-ra / địa điểm / ảnh selfie / trạng thái
 * (Đúng giờ / Đi muộn), lọc theo khoảng ngày + chi nhánh + tên NV + sắp xếp. Chỉ khác: KHÔNG có
 * nút Backup Excel (đó là chức năng hệ thống của Admin). */
export function StoreManagerCheckinHistory() {
  const { activeBranches, branchLabel } = useBranches();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);

  const [checkinStart, setCheckinStart] = useState('');
  const [checkinEnd, setCheckinEnd] = useState('');
  const [checkinBranchFilter, setCheckinBranchFilter] = useState('ALL');
  const [checkinEmployeeQuery, setCheckinEmployeeQuery] = useState('');
  const [checkinSort, setCheckinSort] = useState<'newest' | 'oldest'>('newest');
  const [selectedCheckInRecord, setSelectedCheckInRecord] = useState<CheckInRecord | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.fetchEmployees(), api.fetchShifts()])
      .then(([emp, sh]) => {
        setEmployees(emp || []);
        setShifts(sh || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Dựng bản ghi check-in từ ca làm (giống hệt logic Admin trong HRPayroll)
  const checkinRecords = useMemo<CheckInRecord[]>(() => {
    if (employees.length === 0) return [];
    return shifts
      .filter((s) => s.checkIn)
      .map((s) => {
        const emp = employees.find((e) => e.id === s.employeeId);
        const checkInDate = new Date(s.checkIn!);
        const checkOutDate = s.checkOut ? new Date(s.checkOut) : null;
        const shiftStart = parseInt((s.startTime || '0').split(':')[0], 10);
        const isLate =
          checkInDate.getHours() > shiftStart ||
          (checkInDate.getHours() === shiftStart && checkInDate.getMinutes() > 15);
        return {
          id: s.id,
          employeeId: emp?.employeeId || s.employeeId,
          employeeName: s.employeeName,
          date: s.date,
          checkInTime: checkInDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          checkOutTime: checkOutDate
            ? checkOutDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : '—',
          location: s.branch || emp?.branch || '',
          status: (isLate ? 'late' : 'on-time') as CheckInRecord['status'],
          checkInPhoto: s.checkInPhoto,
          checkOutPhoto: s.checkOutPhoto,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.checkInTime.localeCompare(a.checkInTime));
  }, [employees, shifts]);

  const filteredCheckinRecords = useMemo(() => checkinRecords.filter((r) => {
    if (checkinStart && r.date < checkinStart) return false;
    if (checkinEnd && r.date > checkinEnd) return false;
    if (checkinBranchFilter !== 'ALL' && r.location !== checkinBranchFilter) return false;
    if (checkinEmployeeQuery.trim()) {
      const q = checkinEmployeeQuery.trim().toLowerCase();
      if (!(`${r.employeeName} ${r.employeeId}`.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [checkinRecords, checkinStart, checkinEnd, checkinBranchFilter, checkinEmployeeQuery]);

  const sortedCheckinRecords = checkinSort === 'oldest'
    ? [...filteredCheckinRecords].reverse()
    : filteredCheckinRecords;

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-1">
          <History className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Lịch Sử Check In/Check Out</h2>
        </div>
        <p className="text-sm text-gray-600">Theo dõi giờ vào ra của nhân viên</p>

        <div className="flex items-center gap-2 flex-wrap mt-4">
          <input
            type="date"
            value={checkinStart}
            onChange={(e) => setCheckinStart(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold text-sm"
          />
          <span className="text-gray-400 text-sm">đến</span>
          <input
            type="date"
            value={checkinEnd}
            onChange={(e) => setCheckinEnd(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold text-sm"
          />
          <select
            value={checkinBranchFilter}
            onChange={(e) => setCheckinBranchFilter(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold text-sm"
          >
            <option value="ALL">Tất cả chi nhánh</option>
            {activeBranches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={checkinSort}
            onChange={(e) => setCheckinSort(e.target.value as typeof checkinSort)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none font-semibold text-sm"
          >
            <option value="newest">Ngày: Mới nhất trước</option>
            <option value="oldest">Ngày: Cũ nhất trước</option>
          </select>
          <input
            type="text"
            value={checkinEmployeeQuery}
            onChange={(e) => setCheckinEmployeeQuery(e.target.value)}
            placeholder="Tìm theo tên/mã NV..."
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none text-sm flex-1 min-w-[160px]"
          />
          {(checkinStart || checkinEnd || checkinBranchFilter !== 'ALL' || checkinEmployeeQuery) && (
            <button
              type="button"
              onClick={() => { setCheckinStart(''); setCheckinEnd(''); setCheckinBranchFilter('ALL'); setCheckinEmployeeQuery(''); }}
              className="text-sm text-gray-500 underline hover:text-gray-700"
            >
              Bỏ lọc
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ngày</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mã NV</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tên Nhân Viên</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check In</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Check Out</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Địa Điểm</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Ảnh</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">Đang tải...</td></tr>
            ) : sortedCheckinRecords.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">Chưa có bản ghi check-in/out nào.</td></tr>
            ) : sortedCheckinRecords.slice(0, 50).map((record) => (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-900">{new Date(record.date).toLocaleDateString('vi-VN')}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.employeeId}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{record.employeeName}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">{record.checkInTime}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-gray-900">{record.checkOutTime}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-semibold">
                    {branchLabel(record.location) || record.location || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {(record.checkInPhoto || record.checkOutPhoto) ? (
                    <button
                      onClick={() => setSelectedCheckInRecord(record)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200 transition-colors"
                    >
                      <Camera className="w-3 h-3" />
                      Xem
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Chưa có</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {record.status === 'on-time' && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Đúng Giờ</span>
                  )}
                  {record.status === 'late' && (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Đi Muộn</span>
                  )}
                  {record.status === 'early-leave' && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">Về Sớm</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-gray-600">
            Hiển thị {Math.min(50, filteredCheckinRecords.length)}/{filteredCheckinRecords.length} bản ghi
            {filteredCheckinRecords.length !== checkinRecords.length ? ` (đã lọc từ ${checkinRecords.length})` : ' gần nhất'}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Đúng Giờ: {filteredCheckinRecords.filter((r) => r.status === 'on-time').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Đi Muộn: {filteredCheckinRecords.filter((r) => r.status === 'late').length}</span>
            </div>
          </div>
        </div>
      </div>

      {selectedCheckInRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 border-b p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{selectedCheckInRecord.employeeName}</h3>
                <p className="text-sm text-gray-600">{new Date(selectedCheckInRecord.date).toLocaleDateString('vi-VN')}</p>
              </div>
              <button onClick={() => setSelectedCheckInRecord(null)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <Clock className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedCheckInRecord.checkInPhoto && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Check-in: {selectedCheckInRecord.checkInTime}
                  </div>
                  <img src={selectedCheckInRecord.checkInPhoto} alt="Check-in" className="w-full rounded-lg border border-gray-200" />
                </div>
              )}
              {selectedCheckInRecord.checkOutPhoto && (
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Check-out: {selectedCheckInRecord.checkOutTime}
                  </div>
                  <img src={selectedCheckInRecord.checkOutPhoto} alt="Check-out" className="w-full rounded-lg border border-gray-200" />
                </div>
              )}
              {!selectedCheckInRecord.checkInPhoto && !selectedCheckInRecord.checkOutPhoto && (
                <div className="text-center py-8 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Không có ảnh check-in/out</p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 border-t p-4">
              <button
                onClick={() => setSelectedCheckInRecord(null)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
