import { useState, useEffect } from 'react';
import { Package, MapPin, Phone, Navigation, CheckCircle, Clock, LogOut, Loader2, Bike, User } from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import type { Order } from '../../contexts/OrderContext';
import { useBranches } from '../../contexts/BranchContext';
import * as api from '../../utils/api';

const SESSION_KEY = 'shipper_session';

type ShipperSession = { id: string; fullName: string; branch: string; employeeId?: string };

function fmtTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
}

function ShipperLogin({ onLoggedIn }: { onLoggedIn: (s: ShipperSession) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const emp = await api.employeeLogin(username.trim(), password);
      if (emp.position !== 'shipper') {
        setError('Tài khoản này không phải Shipper. Dùng đúng cổng của bạn.');
        setLoading(false);
        return;
      }
      onLoggedIn({ id: emp.id, fullName: emp.fullName, branch: emp.branch, employeeId: emp.employeeId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập thất bại');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
        <div className="flex flex-col items-center mb-5">
          <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mb-2">
            <Bike className="w-7 h-7 text-rose-600" />
          </div>
          <h1 className="text-xl font-black text-gray-900">FitBlend Shipper</h1>
          <p className="text-sm text-gray-500">Đăng nhập tài khoản shipper</p>
        </div>
        <div className="space-y-3">
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tên đăng nhập" className="w-full px-3 py-2.5 border rounded-xl text-sm" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Mật khẩu" className="w-full px-3 py-2.5 border rounded-xl text-sm" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={submit} disabled={loading} className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4 rotate-180" />} Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShipperApp() {
  const { orders, history, updateOrderStatus } = useOrders();
  const { branchLabel } = useBranches();
  const [shipper, setShipper] = useState<ShipperSession | null>(() => {
    if (!api.getAuthToken()) return null;
    try { const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [tab, setTab] = useState<'available' | 'mine' | 'done'>('available');
  const [busyId, setBusyId] = useState('');

  const handleLoggedIn = (s: ShipperSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    // Tải lại để OrderProvider (chỉ fetch khi đã đăng nhập) nạp đơn của chi nhánh
    window.location.reload();
  };
  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    api.clearAuthToken();
    setShipper(null);
    window.location.reload();
  };

  if (!shipper) return <ShipperLogin onLoggedIn={handleLoggedIn} />;

  const branch = shipper.branch;
  // Đơn giao thuộc chi nhánh shipper, giao bằng shipper của mình (không phải bookship ngoài)
  const isOwnDelivery = (o: Order) =>
    (o.deliveryType || 'delivery') === 'delivery' && o.branchId === branch && (o.shipMethod || 'own') !== 'external';

  const available = orders.filter((o) => isOwnDelivery(o) && !o.shipperId && o.status !== 'completed');
  const mine = orders.filter((o) => o.shipperId === shipper.id && o.status !== 'completed');
  const done = history.filter((o) => o.shipperId === shipper.id);
  const list = tab === 'available' ? available : tab === 'mine' ? mine : done;

  const claim = async (o: Order) => {
    setBusyId(o.id);
    try {
      await updateOrderStatus(o.id, 'delivering', { shipperId: shipper.id, shipperName: shipper.fullName });
      setTab('mine');
    } finally { setBusyId(''); }
  };
  const markDelivered = async (o: Order) => {
    setBusyId(o.id);
    try { await updateOrderStatus(o.id, 'completed'); } finally { setBusyId(''); }
  };

  const itemsText = (o: Order) =>
    (Array.isArray(o.items) ? o.items : [])
      .map((it: any) => (typeof it === 'string' ? it : `${it.quantity && it.quantity > 1 ? it.quantity + '× ' : ''}${it.productName || it.name}${it.size ? ` (${it.size})` : ''}`))
      .join(', ');

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <header className="bg-rose-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Bike className="w-5 h-5 shrink-0" />
          <div className="min-w-0">
            <div className="font-black leading-tight truncate">{shipper.fullName}</div>
            <div className="text-xs text-white/80 truncate">{branchLabel(branch) || branch || 'Chưa gán chi nhánh'}</div>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-1 text-sm font-semibold bg-white/15 px-3 py-1.5 rounded-lg shrink-0">
          <LogOut className="w-4 h-4" /> Thoát
        </button>
      </header>

      <div className="flex gap-1 p-2 bg-white border-b sticky top-[52px] z-10">
        {([['available', `Cần giao (${available.length})`], ['mine', `Đang giao (${mine.length})`], ['done', 'Đã giao']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex-1 py-2 rounded-lg text-sm font-bold ${tab === id ? 'bg-rose-600 text-white' : 'text-gray-600 bg-gray-100'}`}>{label}</button>
        ))}
      </div>

      <div className="p-3 space-y-3">
        {list.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="text-sm">{tab === 'available' ? 'Chưa có đơn cần giao' : tab === 'mine' ? 'Bạn chưa nhận đơn nào' : 'Chưa có đơn đã giao'}</p>
          </div>
        ) : (
          list.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-gray-900">{o.customerName || 'Khách'}</span>
                <span className="font-black text-rose-700">{((o.total || 0) + (o.shipFee || 0)).toLocaleString('vi-VN')}đ</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">{itemsText(o) || '—'}</p>
              {o.customerPhone && <p className="text-sm text-gray-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> <a href={`tel:${o.customerPhone}`} className="underline">{o.customerPhone}</a></p>}
              {o.deliveryAddress && <p className="text-sm text-gray-500 flex items-start gap-1.5 mt-0.5"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {o.deliveryAddress}</p>}
              {o.deliveryTime && <p className="text-sm text-amber-700 flex items-center gap-1.5 mt-0.5 font-semibold"><Clock className="w-3.5 h-3.5" /> Hẹn giao: {fmtTime(o.deliveryTime)}</p>}
              {o.note && <p className="text-xs text-gray-500 mt-1 italic">Ghi chú: {o.note}</p>}

              {tab === 'available' && (
                <button onClick={() => claim(o)} disabled={busyId === o.id} className="w-full mt-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  {busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />} Nhận giao đơn này
                </button>
              )}
              {tab === 'mine' && (
                <button onClick={() => markDelivered(o)} disabled={busyId === o.id} className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  {busyId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Đã giao xong
                </button>
              )}
              {tab === 'done' && (
                <p className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Đã giao {o.completedAt ? `· ${fmtTime(String(o.completedAt))}` : ''}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
