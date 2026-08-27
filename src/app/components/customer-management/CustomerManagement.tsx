import { useEffect, useMemo, useState } from 'react';
import { Users, Search, UserPlus, Pencil, X, Loader2, Phone, Package, Star, ChevronRight, UserCog, History, CalendarDays } from 'lucide-react';
import * as api from '../../utils/api';
import { isOnlineSalesPosition } from '../../types/employee';
import { usePagination, Pager } from '../common/Pagination';
import { CustomerComboHub } from '../combo/CustomerComboHub';

interface Customer { id: string; name: string; phone: string; points: number; address?: string; createdAt?: string }
interface Assignment { customerPhone: string; customerName?: string; careStaffId: string; careStaffName?: string; notes?: string }
interface Combo { id: string; customerPhone?: string; customerName?: string; careStaffId?: string; status: string; planName?: string; deliveredCups?: number; totalCups?: number }
interface StaffLite { id: string; fullName: string; position: string }

interface Props {
  /** 'admin' = xem/gán TẤT CẢ khách cho mọi CSKH; 'cskh' = chỉ nhóm khách của chính mình. */
  scope: 'admin' | 'cskh';
  staffId?: string;   // bắt buộc khi scope='cskh'
  staffName?: string;
}

function normPhone(p?: string) { return (p || '').replace(/\D/g, ''); }

export function CustomerManagement({ scope, staffId, staffName }: Props) {
  const actor = staffName || 'Admin';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [staff, setStaff] = useState<StaffLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('ALL'); // admin: lọc theo CSKH phụ trách
  const [comboFilter, setComboFilter] = useState<'all' | 'has' | 'none'>('all');

  const [editing, setEditing] = useState<Customer | null>(null);   // sửa/thêm
  const [isNew, setIsNew] = useState(false);
  const [assigning, setAssigning] = useState<{ phone: string; name: string } | null>(null);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.fetchCustomers().catch(() => []),
      api.fetchCareAssignments().catch(() => []),
      api.fetchComboSubscriptions().catch(() => []),
      scope === 'admin' ? api.fetchEmployees().catch(() => []) : Promise.resolve([]),
    ]).then(([c, a, cb, emp]) => {
      setCustomers(c || []);
      setAssignments(a || []);
      setCombos(cb || []);
      setStaff((emp || []).filter((e: any) => isOnlineSalesPosition(e.position)).map((e: any) => ({ id: e.id, fullName: e.fullName, position: e.position })));
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // phone -> owner assignment
  const ownerByPhone = useMemo(() => {
    const m = new Map<string, Assignment>();
    for (const a of assignments) m.set(normPhone(a.customerPhone), a);
    return m;
  }, [assignments]);

  // phone -> số combo active
  const activeCombosByPhone = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of combos) {
      if (c.status !== 'active') continue;
      const k = normPhone(c.customerPhone);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [combos]);

  // GỘP mọi nguồn khách: bảng khách (điểm) + khách có combo + khách được gán CSKH — theo SĐT.
  // Nhờ vậy khách combo (chưa có trong bảng điểm) vẫn hiện ở đây.
  const allCustomers = useMemo(() => {
    const byPhone = new Map<string, Customer>();
    for (const c of customers) { const k = normPhone(c.phone); if (k) byPhone.set(k, c); }
    for (const c of combos) {
      const k = normPhone(c.customerPhone); if (!k || byPhone.has(k)) continue;
      byPhone.set(k, { id: '', name: c.customerName || 'Khách', phone: c.customerPhone || '', points: 0 });
    }
    for (const a of assignments) {
      const k = normPhone(a.customerPhone); if (!k || byPhone.has(k)) continue;
      byPhone.set(k, { id: '', name: a.customerName || 'Khách', phone: a.customerPhone || '', points: 0 });
    }
    return [...byPhone.values()];
  }, [customers, combos, assignments]);

  // phone -> khách cũ (bảng điểm, có sẵn tên + địa chỉ) để auto-điền khi nhập lại SĐT cũ.
  const customersByPhone = useMemo(() => {
    const m = new Map<string, Customer>();
    for (const c of customers) { const k = normPhone(c.phone); if (k) m.set(k, c); }
    return m;
  }, [customers]);

  // CSKH scope: khách "của mình" = được gán CSKH cho mình HOẶC có bất kỳ combo nào mình phụ trách.
  const myComboPhones = useMemo(() => {
    const s = new Set<string>();
    if (scope === 'cskh' && staffId) for (const c of combos) if (c.careStaffId === staffId) s.add(normPhone(c.customerPhone));
    return s;
  }, [combos, scope, staffId]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allCustomers
      .map((c) => {
        const owner = ownerByPhone.get(normPhone(c.phone));
        return { c, owner, activeCombos: activeCombosByPhone.get(normPhone(c.phone)) || 0 };
      })
      // scope CSKH: chỉ khách mình phụ trách (theo assignment) hoặc có combo của mình
      .filter((r) => scope === 'admin' || r.owner?.careStaffId === staffId || myComboPhones.has(normPhone(r.c.phone)))
      // lọc theo CSKH phụ trách (admin)
      .filter((r) => ownerFilter === 'ALL' || (ownerFilter === 'NONE' ? !r.owner : r.owner?.careStaffId === ownerFilter))
      // lọc combo
      .filter((r) => comboFilter === 'all' || (comboFilter === 'has' ? r.activeCombos > 0 : r.activeCombos === 0))
      // tìm kiếm
      .filter((r) => !term || r.c.name.toLowerCase().includes(term) || normPhone(r.c.phone).includes(normPhone(term)))
      .sort((a, b) => (b.activeCombos - a.activeCombos) || a.c.name.localeCompare(b.c.name));
  }, [allCustomers, ownerByPhone, activeCombosByPhone, myComboPhones, scope, staffId, ownerFilter, comboFilter, search]);

  const { pageItems, ...pager } = usePagination(rows, 20, `${scope}|${ownerFilter}|${comboFilter}|${search}`);

  const totalActiveCombos = rows.reduce((s, r) => s + r.activeCombos, 0);

  // ---- Actions ----
  const openNew = () => { setEditing({ id: '', name: '', phone: '', points: 0, address: '' }); setIsNew(true); };
  const openEdit = (c: Customer) => { setEditing({ ...c }); setIsNew(false); };

  const saveCustomer = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    const phone = editing.phone.trim();
    const address = (editing.address || '').trim();
    if (!name || !phone) { alert('Nhập tên và số điện thoại'); return; }
    setSaving(true);
    try {
      if (isNew || !editing.id) {
        const created = await api.createCustomer({ name, phone, address });
        // CSKH tạo khách mới → tự gán cho chính mình
        if (scope === 'cskh' && staffId) {
          await api.assignCustomerCare({ customerPhone: phone, customerName: name, careStaffId: staffId, careStaffName: staffName || '', assignedBy: actor });
        }
        void created;
      } else {
        await api.updateCustomer(editing.id, { name, phone, address });
      }
      setEditing(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lưu khách thất bại');
    } finally {
      setSaving(false);
    }
  };

  const doAssign = async (careStaffId: string) => {
    if (!assigning) return;
    const st = staff.find((s) => s.id === careStaffId);
    setSaving(true);
    try {
      await api.assignCustomerCare({
        customerPhone: assigning.phone,
        customerName: assigning.name,
        careStaffId,
        careStaffName: st?.fullName || '',
        assignedBy: actor,
      });
      setAssigning(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gán CSKH thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Quản Lý Khách Hàng</h2>
        </div>
        <button onClick={openNew}
          className="ml-auto flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-3 py-2 rounded-lg">
          <UserPlus className="w-4 h-4" /> Thêm khách
        </button>
      </div>

      {/* Bộ lọc */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên / SĐT..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm" />
        </div>
        {scope === 'admin' && (
          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white">
            <option value="ALL">Mọi CSKH phụ trách</option>
            <option value="NONE">— Chưa gán CSKH —</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
        )}
        <select value={comboFilter} onChange={(e) => setComboFilter(e.target.value as any)}
          className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white">
          <option value="all">Tất cả khách</option>
          <option value="has">Có combo đang chạy</option>
          <option value="none">Không có combo</option>
        </select>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-sm font-semibold text-emerald-800">
        {rows.length} khách{scope === 'cskh' ? ' (của bạn)' : ''} · {totalActiveCombos} combo đang chạy
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : rows.length === 0 ? (
        <p className="text-center text-gray-400 py-10 text-sm">Không có khách phù hợp.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {pageItems.map(({ c, owner, activeCombos }) => (
              <div key={c.id || c.phone} className="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-gray-50">
                <button onClick={() => setDetail(c)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 font-bold text-emerald-700">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                      <span className="font-mono">{c.phone}</span>
                      {activeCombos > 0 && <span className="text-indigo-600 font-semibold inline-flex items-center gap-0.5"><Package className="w-3 h-3" />{activeCombos} combo</span>}
                      <span className="text-amber-600 font-semibold inline-flex items-center gap-0.5"><Star className="w-3 h-3" />{c.points}đ</span>
                    </p>
                    {c.address && <p className="text-xs text-gray-400 truncate mt-0.5">📍 {c.address}</p>}
                  </div>
                </button>
                <div className="hidden sm:block text-right shrink-0 min-w-[120px]">
                  <div className="text-[10px] uppercase font-bold text-gray-400">CSKH phụ trách</div>
                  <div className={`text-sm font-semibold ${owner ? 'text-gray-700' : 'text-amber-600'}`}>{owner?.careStaffName || 'Chưa gán'}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {scope === 'admin' && (
                    <button onClick={() => setAssigning({ phone: c.phone, name: c.name })}
                      className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg" title="Gán / đổi CSKH phụ trách">
                      <UserCog className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => openEdit(c)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Sửa">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDetail(c)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg" title="Chi tiết">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4"><Pager {...pager} onPage={pager.setPage} unit="khách" /></div>
        </div>
      )}

      {editing && <CustomerEditModal editing={editing} isNew={isNew} saving={saving} existingByPhone={customersByPhone} onChange={setEditing} onClose={() => setEditing(null)} onSave={saveCustomer} />}
      {assigning && <AssignModal assigning={assigning} staff={staff} saving={saving} onClose={() => setAssigning(null)} onAssign={doAssign} />}
      {detail && <CustomerDetailDrawer customer={detail} combos={combos.filter((c) => normPhone(c.customerPhone) === normPhone(detail.phone))} owner={ownerByPhone.get(normPhone(detail.phone))} scope={scope} staffId={staffId} staffName={staffName} onClose={() => setDetail(null)} />}
    </div>
  );
}

// ---------- Modals ----------
function CustomerEditModal({ editing, isNew, saving, existingByPhone, onChange, onClose, onSave }: any) {
  const [matched, setMatched] = useState<Customer | null>(null);

  // Khi THÊM khách: gõ SĐT của khách cũ (đã có trong hệ thống) → tự điền TÊN + ĐỊA CHỈ cũ.
  // Tra tại chỗ trong danh sách đã tải trước (tức thì); nếu không có thì hỏi server (khách
  // loyalty cũ chưa nằm trong danh sách). Chỉ điền vào ô đang trống, không ghi đè khi đang gõ.
  useEffect(() => {
    if (!isNew) { setMatched(null); return; }
    const key = normPhone(editing.phone);
    if (key.length < 8) { setMatched(null); return; }

    const applyFound = (c: Customer) => {
      setMatched(c);
      onChange((prev: Customer) => ({
        ...prev,
        name: (prev.name || '').trim() ? prev.name : (c.name || ''),
        address: (prev.address || '').trim() ? prev.address : (c.address || ''),
      }));
    };

    const local = existingByPhone?.get(key);
    if (local) { applyFound(local); return; }

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const c = await api.fetchCustomerByPhone(key);
        if (cancelled) return;
        if (c) applyFound(c); else setMatched(null);
      } catch { if (!cancelled) setMatched(null); }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [editing.phone, isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-gray-800">{isNew ? 'Thêm khách hàng' : 'Sửa khách hàng'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-gray-500">Họ tên</span>
            <input value={editing.name} onChange={(e) => onChange({ ...editing, name: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-500">Số điện thoại</span>
            <input value={editing.phone} onChange={(e) => onChange({ ...editing, phone: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500 font-mono" />
          </label>
          {isNew && matched && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
              <span className="font-bold">📇 Khách cũ</span> — đã tự điền thông tin:
              <div className="mt-0.5 font-semibold text-emerald-900">{matched.name}</div>
              <div className="text-emerald-700">📍 {(matched.address || '').trim() || 'Chưa có địa chỉ cũ'}</div>
            </div>
          )}
          <label className="block">
            <span className="text-xs font-semibold text-gray-500">Địa chỉ</span>
            <textarea value={editing.address || ''} onChange={(e) => onChange({ ...editing, address: e.target.value })}
              rows={2} placeholder="Số nhà, đường, phường/quận..."
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-emerald-500" />
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border font-semibold text-gray-600">Hủy</button>
          <button onClick={onSave} disabled={saving}
            className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignModal({ assigning, staff, saving, onClose, onAssign }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg text-gray-800">Gán CSKH phụ trách</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-3">{assigning.name} · {assigning.phone}</p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {staff.length === 0 && <p className="text-sm text-gray-400">Chưa có nhân viên CSKH nào.</p>}
          {staff.map((s: StaffLite) => (
            <button key={s.id} onClick={() => onAssign(s.id)} disabled={saving}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 text-left disabled:opacity-60">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700">{s.fullName.charAt(0)}</div>
              <span className="font-semibold text-gray-800">{s.fullName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function dayLabel(dateStr: string) {
  // '2026-08-11' -> Hôm nay / Mai / T-hai dd/mm ...
  const todayStr = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD local
  const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
  const tmrStr = tmr.toLocaleDateString('sv-SE');
  if (dateStr === todayStr) return 'Hôm nay';
  if (dateStr === tmrStr) return 'Ngày mai';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function CustomerDetailDrawer({ customer, combos, owner, scope, staffId, staffName, onClose }: { customer: Customer; combos: Combo[]; owner?: Assignment; scope: 'admin' | 'cskh'; staffId?: string; staffName?: string; onClose: () => void }) {
  const [orders, setOrders] = useState<any[] | null>(null);
  const [schedule, setSchedule] = useState<any[] | null>(null);
  useEffect(() => {
    api.fetchOrdersByPhone(customer.phone).then((d: any[]) => setOrders(d || [])).catch(() => setOrders([]));
    // Lịch giao: gộp delivery-logs của các combo của khách (combo còn chạy/chờ)
    const active = combos.filter((c) => c.status === 'active' || c.status === 'pending');
    if (active.length === 0) { setSchedule([]); return; }
    Promise.all(active.map((c) => api.fetchDeliveryLogs({ comboOrderId: c.id }).catch(() => [])))
      .then((lists) => {
        const all = lists.flat().filter((l: any) => l && l.status !== 'cancelled');
        all.sort((a: any, b: any) => (a.deliveryDate || '').localeCompare(b.deliveryDate || '') || (a.deliveryTime || '').localeCompare(b.deliveryTime || ''));
        setSchedule(all);
      })
      .catch(() => setSchedule([]));
  }, [customer.phone, combos]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-50 border-b p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{customer.name}</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{customer.phone}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg"><X className="w-5 h-5 text-gray-600" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-amber-50 px-3 py-2">
              <div className="text-[10px] uppercase font-bold text-amber-600/80">Điểm tích lũy</div>
              <div className="text-lg font-black text-amber-700">{customer.points}đ</div>
            </div>
            <div className="rounded-xl bg-sky-50 px-3 py-2">
              <div className="text-[10px] uppercase font-bold text-sky-600/80">CSKH phụ trách</div>
              <div className="text-sm font-bold text-sky-700 truncate">{owner?.careStaffName || 'Chưa gán'}</div>
            </div>
          </div>

          {owner?.notes && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-700">
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Ghi chú chăm sóc</div>
              {owner.notes}
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5 font-bold text-gray-700 mb-2"><Package className="w-4 h-4 text-indigo-600" /> Combo & Giao hàng</div>
            {combos.length === 0 ? <p className="text-sm text-gray-400">Khách chưa có combo.</p> : (
              // Tái dùng nguyên CustomerComboHub (lọc theo SĐT khách): có nút Giao, Chi tiết combo
              // (sửa lịch/hoãn/gia hạn/đổi chi nhánh) — gộp trọn quản lý combo vào đây.
              <CustomerComboHub
                variant={scope === 'admin' ? 'admin' : 'cskh'}
                staffId={staffId}
                staffName={staffName}
                claimAs={staffId ? { id: staffId, name: staffName || '' } : null}
                filterPhone={customer.phone}
                defaultStatusFilter="all"
                hideHeader
                className="!p-0"
              />
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-bold text-gray-700 mb-2"><CalendarDays className="w-4 h-4 text-indigo-600" /> Lịch giao sắp tới</div>
            {schedule === null ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : (() => {
              const upcoming = schedule.filter((l: any) => l.status !== 'delivered');
              const deliveredN = schedule.length - upcoming.length;
              if (upcoming.length === 0) return <p className="text-sm text-gray-400">Không có buổi giao sắp tới{deliveredN > 0 ? ` (đã giao ${deliveredN} buổi)` : ''}.</p>;
              return (
                <div className="space-y-1.5">
                  {upcoming.slice(0, 12).map((l: any, i: number) => {
                    const isToday = dayLabel(l.deliveryDate) === 'Hôm nay';
                    return (
                      <div key={l.id || i} className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 ${isToday ? 'bg-emerald-50 border border-emerald-100' : ''}`}>
                        <span className="min-w-0">
                          <span className={`font-semibold text-sm ${isToday ? 'text-emerald-700' : 'text-gray-800'}`}>{dayLabel(l.deliveryDate)}</span>
                          <span className="text-xs text-gray-400 ml-1.5">{l.deliveryTime || '08:00'}</span>
                          <span className="block text-xs text-gray-500 truncate">{l.productName || 'Sinh tố'}{l.size ? ` · ${l.size}` : ''}{l.deliveryType === 'pickup' ? ' · 🏪 Lấy tại quầy' : ''}</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${l.status === 'postponed' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{l.status === 'postponed' ? 'Đã hoãn' : 'Chờ giao'}</span>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-gray-400 pt-0.5">Đã giao {deliveredN} buổi{upcoming.length > 12 ? ` · còn ${upcoming.length - 12} buổi nữa` : ''}</p>
                </div>
              );
            })()}
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-bold text-gray-700 mb-2"><History className="w-4 h-4 text-gray-500" /> Lịch sử đơn lẻ {orders ? `(${orders.length})` : ''}</div>
            {orders === null ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : orders.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có đơn lẻ.</p>
            ) : (
              <div className="space-y-1.5">
                {orders.slice(0, 15).map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-1.5">
                    <span className="text-gray-600">{o.time ? new Date(o.time).toLocaleDateString('vi-VN') : ''} · #{o.orderNumber}</span>
                    <span className="font-semibold text-gray-800">{(o.total || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
                {orders.length > 15 && <p className="text-xs text-gray-400 text-center pt-1">…và {orders.length - 15} đơn cũ hơn</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
