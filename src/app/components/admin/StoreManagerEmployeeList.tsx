import { useState, useEffect } from 'react';
import { Search, User, LogIn, LogOut as LogOutIcon } from 'lucide-react';
import { Employee } from './EmployeeRegistration';
import { WorkShift } from '../../types/employee';
import * as api from '../../utils/api';
import { usePagination, Pager } from '../common/Pagination';
import { useSSE } from '../../contexts/SSEContext';
import { useBranches } from '../../contexts/BranchContext';

const positions = [
  { id: 'manager', name: 'Quản Lý Chi Nhánh' },
  { id: 'store_manager', name: 'Quản Lý Cửa Hàng' },
  { id: 'cskh', name: 'Chăm Sóc Khách Hàng' },
  { id: 'cashier', name: 'Thu Ngân' },
  { id: 'bartender', name: 'Pha Chế' },
  { id: 'server', name: 'Phục Vụ' },
  { id: 'cleaner', name: 'Vệ Sinh' },
  { id: 'shipper', name: 'Shipper' },
];

const todayStr = () => new Date().toISOString().split('T')[0];

function formatTime(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/** Danh sách nhân viên cho Cửa Hàng Trưởng: chỉ xem (nhân viên nào ở chi nhánh nào),
 * KHÔNG hiển thị lương/tiền, KHÔNG sửa/xóa, và xem được giờ check in / check out theo ngày. */
export function StoreManagerEmployeeList() {
  const { activeBranches, branchLabel } = useBranches();
  const { subscribe } = useSSE();

  const branchOptions = [
    { id: 'ALL', name: 'Tất cả chi nhánh' },
    { id: 'UNASSIGNED', name: '🕐 Chờ phân bổ' },
    ...activeBranches.map((b) => ({ id: b.id, name: b.name })),
  ];

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [date, setDate] = useState(todayStr());

  useEffect(() => {
    api.fetchEmployees()
      .then((data) => setEmployees(data))
      .catch((err) => console.error('Failed to load employees:', err));

    const unsubCreate = subscribe('EMPLOYEE_CREATED', (data) => {
      setEmployees((prev) => (prev.some((e) => e.id === data.id) ? prev : [...prev, data]));
    });
    const unsubUpdate = subscribe('EMPLOYEE_UPDATED', (data) => {
      setEmployees((prev) => prev.map((e) => (e.id === data.id ? data : e)));
    });
    const unsubDelete = subscribe('EMPLOYEE_DELETED', (data) => {
      setEmployees((prev) => prev.filter((e) => e.id !== data.id));
    });
    return () => { unsubCreate(); unsubUpdate(); unsubDelete(); };
  }, [subscribe]);

  useEffect(() => {
    api.fetchShifts({ date })
      .then((data: WorkShift[]) => setShifts(data))
      .catch((err) => console.error('Failed to load shifts:', err));
  }, [date]);

  const normalizeText = (value?: string | null) => (value ?? '').toString().trim();

  // Gộp check-in/out theo nhân viên cho ngày đã chọn: lấy check-in sớm nhất & check-out muộn nhất
  const attendanceByEmp = new Map<string, { checkIn?: string; checkOut?: string; count: number }>();
  shifts.forEach((s) => {
    if (!s.employeeId) return;
    const cur = attendanceByEmp.get(s.employeeId) || { count: 0 };
    cur.count += 1;
    if (s.checkIn && (!cur.checkIn || s.checkIn < cur.checkIn)) cur.checkIn = s.checkIn;
    if (s.checkOut && (!cur.checkOut || s.checkOut > cur.checkOut)) cur.checkOut = s.checkOut;
    attendanceByEmp.set(s.employeeId, cur);
  });

  const filteredEmployees = employees
    .filter((emp) => {
      const branchValue = normalizeText(emp.branch);
      if (branchFilter === 'ALL') return true;
      if (branchFilter === 'UNASSIGNED') return !branchValue;
      return branchValue === branchFilter;
    })
    .filter((emp) => {
      const term = normalizeText(searchTerm).toLowerCase();
      if (!term) return true;
      return (
        normalizeText(emp.fullName).toLowerCase().includes(term) ||
        normalizeText(emp.employeeId).toLowerCase().includes(term) ||
        normalizeText(emp.phone).includes(searchTerm)
      );
    })
    .sort((a, b) =>
      normalizeText(a.branch).localeCompare(normalizeText(b.branch)) ||
      normalizeText(a.employeeId).localeCompare(normalizeText(b.employeeId)),
    );

  const getPositionName = (id: string) => positions.find((p) => p.id === id)?.name || id;
  const checkedInCount = filteredEmployees.filter((e) => attendanceByEmp.get(e.employeeId)?.checkIn).length;
  const { pageItems: pagedEmployees, ...empPager } = usePagination(filteredEmployees, 20, `${branchFilter}|${searchTerm}`);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Danh Sách Nhân Viên</h1>
        <p className="text-gray-500 text-sm mt-1">
          {filteredEmployees.length}/{employees.length} nhân viên · {checkedInCount} đã check-in ngày{' '}
          {new Date(date).toLocaleDateString('vi-VN')}
        </p>
      </div>

      <div className="mb-4 bg-white rounded-xl shadow-md p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm tên, mã NV, SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-sm"
          />
        </div>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium focus:border-emerald-500 outline-none"
        >
          {branchOptions.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value || todayStr())}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium focus:border-emerald-500 outline-none"
          title="Ngày xem check-in/out"
        />
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {searchTerm || branchFilter !== 'ALL' ? 'Không tìm thấy nhân viên' : 'Chưa có nhân viên'}
          </p>
        </div>
      ) : (
        <>
        {/* Mobile: danh sách thẻ, khỏi cuộn ngang */}
        <div className="sm:hidden space-y-2.5">
          {pagedEmployees.map((emp) => {
            const att = attendanceByEmp.get(emp.employeeId);
            const checkIn = formatTime(att?.checkIn);
            const checkOut = formatTime(att?.checkOut);
            return (
              <div key={emp.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {emp.photo ? (
                      <img src={emp.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-emerald-700">{emp.fullName.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-800 truncate">{emp.fullName}</div>
                    <div className="text-xs text-gray-500">
                      <span className="font-mono font-semibold text-emerald-700">{emp.employeeId}</span>
                      {' · '}{getPositionName(emp.position)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {emp.branch ? (
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-semibold text-gray-700">{branchLabel(emp.branch)}</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-100 rounded text-xs font-semibold text-amber-700">Chờ phân bổ</span>
                  )}
                  {(emp.secondaryBranches || []).map((b) => (
                    <span key={b} className="px-2 py-0.5 bg-sky-100 rounded text-xs font-semibold text-sky-700">+{branchLabel(b)}</span>
                  ))}
                  {emp.phone && (
                    <a href={`tel:${emp.phone}`} className="px-2 py-0.5 bg-gray-50 rounded text-xs font-medium text-gray-600 ml-auto">{emp.phone}</a>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <div className="rounded-lg bg-emerald-50 px-2.5 py-1.5">
                    <div className="text-[10px] font-bold uppercase text-emerald-600/80 flex items-center gap-1"><LogIn className="w-3 h-3" /> Check-in</div>
                    <div className={`text-sm font-bold ${checkIn ? 'text-emerald-700' : 'text-gray-300'}`}>{checkIn || '—'}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-2.5 py-1.5">
                    <div className="text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1"><LogOutIcon className="w-3 h-3" /> Check-out</div>
                    <div className={`text-sm font-bold ${checkOut ? 'text-gray-700' : 'text-gray-300'}`}>{checkOut || '—'}</div>
                  </div>
                </div>
              </div>
            );
          })}
          <Pager {...empPager} onPage={empPager.setPage} unit="nhân viên" />
        </div>

        {/* Desktop: bảng */}
        <div className="hidden sm:block bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">Mã NV</th>
                  <th className="px-4 py-3 min-w-[160px]">Họ và tên</th>
                  <th className="px-4 py-3">Chi nhánh</th>
                  <th className="px-4 py-3">Chức vụ</th>
                  <th className="px-4 py-3">SĐT</th>
                  <th className="px-4 py-3 text-center">Check-in</th>
                  <th className="px-4 py-3 text-center">Check-out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedEmployees.map((emp, idx) => {
                  const att = attendanceByEmp.get(emp.employeeId);
                  const checkIn = formatTime(att?.checkIn);
                  const checkOut = formatTime(att?.checkOut);
                  return (
                    <tr key={emp.id} className="hover:bg-emerald-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400">{empPager.from + idx}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-emerald-700">{emp.employeeId}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {emp.photo ? (
                              <img src={emp.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-emerald-700">{emp.fullName.charAt(0)}</span>
                            )}
                          </div>
                          <span className="font-medium text-gray-800">{emp.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {emp.branch ? (
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-semibold text-gray-700">{branchLabel(emp.branch)}</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 rounded text-xs font-semibold text-amber-700">Chờ phân bổ</span>
                          )}
                          {(emp.secondaryBranches || []).map((b) => (
                            <span key={b} className="px-2 py-0.5 bg-sky-100 rounded text-xs font-semibold text-sky-700" title="Chi nhánh hỗ trợ thêm">
                              +{branchLabel(b)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{getPositionName(emp.position)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{emp.phone}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {checkIn ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                            <LogIn className="w-3.5 h-3.5" />{checkIn}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {checkOut ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
                            <LogOutIcon className="w-3.5 h-3.5" />{checkOut}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pager {...empPager} onPage={empPager.setPage} unit="nhân viên" className="px-4" />
          </div>
        </div>
        </>
      )}
    </div>
  );
}
