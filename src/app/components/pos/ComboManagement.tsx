'use client';
import { Calendar, User, Phone, Package, Bell, Play, Pause, CheckCircle, ChevronDown, ChevronUp, Edit3, Trash2, X, Crown, Search, DropletIcon, MinusCircle, PlusCircle, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCombos } from '../../contexts/ComboContext';
import { CustomComboBuilder } from '../customer/CustomComboBuilder';
import { getWholesaleAccounts, saveWholesaleAccounts, type WholesaleAccount } from '../customer/CustomerApp';

const weekDayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// ─── Flavor options for redemption ───────────────────────────────────────────
const FLAVOR_OPTIONS = [
  'Việt Quất', 'Dâu Tây', 'Xoài', 'Chuối', 'Cam', 'Dừa', 'Matcha', 'Ca Cao', 'Dưa Hấu',
  'Chanh Leo', 'Táo Xanh', 'Nho', 'Bơ', 'Phúc Bồn Tử', 'Lạc Tiên',
];

// ─── Combo Card (existing subscription combos) ────────────────────────────────
function ComboCard({ combo, updateComboStatus, onEdit }: any) {
  const [showDetail, setShowDetail] = useState(false);

  const getDaysUntilDelivery = (nextDelivery: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delivery = new Date(nextDelivery);
    delivery.setHours(0, 0, 0, 0);
    const diff = delivery.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysUntil = getDaysUntilDelivery(combo.nextDelivery);
  const isToday = daysUntil === 0;

  return (
    <div className="rounded-xl bg-white shadow-md border-2 border-gray-200">
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="w-full p-4 text-left hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-gray-500">{combo.id}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                combo.comboType === 'weekly' ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {combo.comboType === 'weekly' ? 'Tuần' : 'Tháng'}
              </span>
              {isToday && <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-600 text-white">Hôm nay!</span>}
            </div>
            <div className="text-lg font-bold text-gray-800">{combo.customerName}</div>
            <div className="text-sm text-gray-600">{combo.customerPhone}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-gray-600">Giao sau</div>
              <div className={`text-sm font-bold ${isToday ? 'text-emerald-700' : 'text-gray-800'}`}>
                {isToday ? 'Hôm nay!' : `${daysUntil} ngày`}
              </div>
            </div>
            {showDetail ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        </div>
      </button>

      {showDetail && (
        <div className="px-4 pb-4 border-t pt-4">
          <div className="mb-3">
            <div className="text-xs font-bold text-gray-700 mb-2">Lịch giao:</div>
            <div className="flex gap-1">
              {weekDayLabels.map((day, idx) => (
                <div key={idx} className={`flex-1 text-center py-1 rounded text-xs font-bold ${
                  combo.deliveryDays.includes(idx) ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>{day}</div>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="text-xs font-bold text-gray-700 mb-2">Sản phẩm:</div>
            <div className="space-y-1">
              {combo.items.map((item: any, idx: number) => (
                <div key={idx} className="text-sm text-gray-700 flex justify-between">
                  <span>• {item.product.name}</span>
                  <span className="text-[10px] text-gray-400 font-bold">{item.size} • {item.protein}g</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs text-gray-600">Giá trị:</span>
              <span className="text-sm font-bold text-emerald-700">{combo.totalPrice.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
          <div className="bg-emerald-50 border border-blue-200 rounded-lg p-3 mb-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-gray-600 mb-1">Ngày đăng ký:</div>
                <div className="font-bold text-gray-800">{new Date(combo.startDate).toLocaleDateString('vi-VN')}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Phụ trách:</div>
                <div className="font-bold text-gray-800">{combo.staff}</div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); updateComboStatus(combo.id, 'paused'); }}
              className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Pause className="w-4 h-4" /> Tạm dừng
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); updateComboStatus(combo.id, 'completed'); }}
              className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Hoàn thành
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(combo); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" /> Sửa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Wholesale Redemption Panel ───────────────────────────────────────────────
function WholesalePanel() {
  const [searchPhone, setSearchPhone] = useState('');
  const [foundAccount, setFoundAccount] = useState<WholesaleAccount | null>(null);
  const [searchDone, setSearchDone] = useState(false);
  const [selectedFlavor, setSelectedFlavor] = useState(FLAVOR_OPTIONS[0]);
  const [redeemQty, setRedeemQty] = useState(1);
  const [staffName, setStaffName] = useState('');
  const [showRegForm, setShowRegForm] = useState(false);
  const [allAccounts, setAllAccounts] = useState<WholesaleAccount[]>([]);
  const [showAll, setShowAll] = useState(false);

  // Registration form state
  const [regForm, setRegForm] = useState({
    customerName: '', customerPhone: '', packageName: 'Combo Sỉ 10 Ly',
    totalCups: 10, durationMonths: 1,
  });

  const PACKAGES = [
    { name: 'Combo Sỉ 10 Ly', cups: 10, months: 1, price: 590000 },
    { name: 'Combo Sỉ 30 Ly', cups: 30, months: 2, price: 1590000 },
    { name: 'Combo Sỉ 50 Ly', cups: 50, months: 3, price: 2390000 },
  ];

  const refreshAll = () => setAllAccounts(getWholesaleAccounts());

  useEffect(() => { refreshAll(); }, []);

  const handleSearch = () => {
    const accounts = getWholesaleAccounts();
    const found = accounts.find(a => a.customerPhone === searchPhone && a.remainingCups > 0 && new Date(a.expiresAt) > new Date());
    setFoundAccount(found || null);
    setSearchDone(true);
    setRedeemQty(1);
    if (found) {
      if (found.preferredProduct?.name) {
        // If preferred flavor exists, check if it matches any of the FLAVOR_OPTIONS (case insensitive) or just set it
        const matchedFlavor = FLAVOR_OPTIONS.find(f => f.toLowerCase() === found.preferredProduct?.name.toLowerCase());
        setSelectedFlavor(matchedFlavor || found.preferredProduct.name);
      } else {
        setSelectedFlavor(FLAVOR_OPTIONS[0]);
      }
    }
  };

  const handleRedeem = () => {
    if (!foundAccount) return;
    if (!staffName.trim()) { alert('Vui lòng nhập tên nhân viên xử lý!'); return; }
    if (redeemQty > foundAccount.remainingCups) { alert('Số ly rút vượt quá số ly còn lại!'); return; }

    const accounts = getWholesaleAccounts();
    const updated = accounts.map(a => {
      if (a.id !== foundAccount.id) return a;
      const newRedemptions = [...a.redemptions];
      for (let i = 0; i < redeemQty; i++) {
        newRedemptions.push({
          date: new Date().toISOString(),
          flavor: selectedFlavor,
          redeemedBy: staffName.trim(),
        });
      }
      return {
        ...a,
        remainingCups: a.remainingCups - redeemQty,
        redemptions: newRedemptions,
      };
    });

    saveWholesaleAccounts(updated);
    const fresh = updated.find(a => a.id === foundAccount.id) || null;
    setFoundAccount(fresh);
    refreshAll();
    alert(`✅ Đã rút ${redeemQty} ly "${selectedFlavor}" cho ${foundAccount.customerName}!\nCòn lại: ${foundAccount.remainingCups - redeemQty} ly`);
  };

  const handleRegister = () => {
    if (!regForm.customerName || !regForm.customerPhone) {
      alert('Vui lòng nhập đủ tên và SĐT khách hàng!'); return;
    }
    const accounts = getWholesaleAccounts();
    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + regForm.durationMonths);
    const newAcc: WholesaleAccount = {
      id: `WS-${Date.now()}`,
      customerName: regForm.customerName,
      customerPhone: regForm.customerPhone,
      packageName: regForm.packageName,
      totalCups: regForm.totalCups,
      remainingCups: regForm.totalCups,
      durationMonths: regForm.durationMonths,
      purchasedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      redemptions: [],
    };
    saveWholesaleAccounts([...accounts, newAcc]);
    refreshAll();
    setShowRegForm(false);
    setRegForm({ customerName: '', customerPhone: '', packageName: 'Combo Sỉ 10 Ly', totalCups: 10, durationMonths: 1 });
    alert(`✅ Đã đăng ký gói sỉ cho ${newAcc.customerName}!\nMã gói: ${newAcc.id}`);
  };

  const now = new Date();
  const activeAccounts = allAccounts.filter(a => a.remainingCups > 0 && new Date(a.expiresAt) > now);
  const expiredAccounts = allAccounts.filter(a => a.remainingCups <= 0 || new Date(a.expiresAt) <= now);

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tổng gói sỉ', value: allAccounts.length, color: 'text-gray-700', bg: 'bg-gray-100' },
          { label: 'Đang hoạt động', value: activeAccounts.length, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Hết hạn/hết ly', value: expiredAccounts.length, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-500 font-bold leading-tight mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Register New Account Button */}
      <button
        onClick={() => setShowRegForm(v => !v)}
        className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
        style={{ background: showRegForm ? '#fef3c7' : '#fbbf24', color: '#78350f' }}
      >
        <Crown className="w-4 h-4" />
        {showRegForm ? 'Đóng form đăng ký' : '+ Đăng ký gói sỉ mới tại quầy'}
      </button>

      {/* Registration Form */}
      {showRegForm && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 space-y-3">
          <h4 className="text-sm font-black text-yellow-800 uppercase tracking-wider">📝 Đăng ký gói sỉ cho khách</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Tên khách</label>
              <input
                type="text" placeholder="Nguyễn Văn A"
                value={regForm.customerName}
                onChange={e => setRegForm(p => ({ ...p, customerName: e.target.value }))}
                className="w-full bg-white px-3 py-2 rounded-lg border border-yellow-200 text-sm font-medium focus:ring-2 focus:ring-yellow-400 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Số điện thoại</label>
              <input
                type="tel" placeholder="0987654321"
                value={regForm.customerPhone}
                onChange={e => setRegForm(p => ({ ...p, customerPhone: e.target.value }))}
                className="w-full bg-white px-3 py-2 rounded-lg border border-yellow-200 text-sm font-medium focus:ring-2 focus:ring-yellow-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Chọn gói</label>
            <div className="grid grid-cols-3 gap-2">
              {PACKAGES.map(pkg => (
                <button
                  key={pkg.name}
                  onClick={() => setRegForm(p => ({ ...p, packageName: pkg.name, totalCups: pkg.cups, durationMonths: pkg.months }))}
                  className={`p-2.5 rounded-xl border-2 text-center transition-all text-xs ${
                    regForm.packageName === pkg.name
                      ? 'border-yellow-500 bg-yellow-100 text-yellow-800'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-yellow-300'
                  }`}
                >
                  <p className="font-black">{pkg.cups} ly</p>
                  <p className="text-[10px] opacity-70">{(pkg.price / 1000).toFixed(0)}k</p>
                  <p className="text-[10px] opacity-60">{pkg.months} tháng</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRegister}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
          >
            <ShieldCheck className="w-4 h-4" /> Xác nhận đăng ký & lưu
          </button>
        </div>
      )}

      {/* Cup Redemption - Search */}
      <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 space-y-3">
        <h4 className="text-sm font-black text-emerald-800 uppercase tracking-wider flex items-center gap-2">
          <DropletIcon className="w-4 h-4" /> Rút ly cho khách sỉ
        </h4>
        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="SĐT khách mua sỉ..."
            value={searchPhone}
            onChange={e => setSearchPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2.5 bg-gray-50 border border-emerald-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-400 outline-none"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-1.5 transition-colors"
          >
            <Search className="w-4 h-4" /> Tìm
          </button>
        </div>

        {searchDone && !foundAccount && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-red-600 font-bold text-sm">❌ Không tìm thấy gói sỉ hợp lệ</p>
            <p className="text-red-400 text-xs mt-0.5">Gói đã hết hạn, hết ly, hoặc SĐT chưa đăng ký</p>
          </div>
        )}

        {foundAccount && (
          <div className="space-y-3">
            {/* Account info */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-black text-emerald-800">{foundAccount.customerName}</p>
                  <p className="text-xs text-gray-500">{foundAccount.customerPhone} · {foundAccount.packageName}</p>
                  {foundAccount.preferredProduct && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                      Mặc định: {foundAccount.preferredProduct.image} {foundAccount.preferredProduct.name} 
                      {foundAccount.preferredProductSize && ` (${foundAccount.preferredProductSize} · ${foundAccount.preferredProductProtein}g Protein)`}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-700">{foundAccount.remainingCups}</p>
                  <p className="text-[10px] text-gray-400">ly còn lại</p>
                </div>
              </div>
              {/* mini progress */}
              <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(foundAccount.remainingCups / foundAccount.totalCups) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Hết hạn: {new Date(foundAccount.expiresAt).toLocaleDateString('vi-VN')}</p>
            </div>

            {/* Select flavor */}
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Chọn vị</label>
              <select
                value={selectedFlavor}
                onChange={e => setSelectedFlavor(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-400 outline-none"
              >
                {FLAVOR_OPTIONS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Qty */}
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Số ly rút</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRedeemQty(q => Math.max(1, q - 1))}
                  className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  <MinusCircle className="w-6 h-6" />
                </button>
                <span className="text-2xl font-black text-gray-800 w-8 text-center">{redeemQty}</span>
                <button
                  onClick={() => setRedeemQty(q => Math.min(foundAccount.remainingCups, q + 1))}
                  className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  <PlusCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Staff name */}
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Nhân viên xử lý</label>
              <input
                type="text" placeholder="Tên nhân viên..."
                value={staffName}
                onChange={e => setStaffName(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-400 outline-none"
              />
            </div>

            <button
              onClick={handleRedeem}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <DropletIcon className="w-4 h-4" /> Rút {redeemQty} ly · {selectedFlavor}
            </button>
          </div>
        )}
      </div>

      {/* All accounts list */}
      <div>
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full py-2.5 text-sm font-black text-gray-500 uppercase tracking-wider flex items-center justify-center gap-2 hover:text-gray-700 transition-colors"
        >
          {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAll ? 'Ẩn danh sách' : `Xem tất cả gói sỉ (${allAccounts.length})`}
        </button>

        {showAll && (
          <div className="space-y-2 mt-2">
            {allAccounts.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">Chưa có gói sỉ nào</p>
            ) : (
              allAccounts.map(acc => {
                const expired = acc.remainingCups <= 0 || new Date(acc.expiresAt) <= new Date();
                const daysLeft = Math.max(0, Math.ceil((new Date(acc.expiresAt).getTime() - Date.now()) / 86400000));
                return (
                  <div key={acc.id} className={`rounded-xl p-3 border ${expired ? 'bg-gray-50 border-gray-200' : 'bg-white border-emerald-100'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-gray-800 text-sm">{acc.customerName}</p>
                        <p className="text-xs text-gray-500">{acc.customerPhone} · {acc.packageName}</p>
                        {(acc.preferredProduct || acc.branchName) && (
                          <div className="flex flex-col gap-0.5 text-[10px] text-gray-400 mt-1">
                            {acc.preferredProduct && (
                              <div className="flex gap-2 items-center">
                                <span>Vị: {acc.preferredProduct.image} {acc.preferredProduct.name}</span>
                                {(acc.preferredProductSize || acc.preferredProductProtein) && (
                                  <span className="text-[9px] px-1 bg-gray-100 rounded text-gray-500 font-semibold">
                                    {acc.preferredProductSize || '360ml'} · {acc.preferredProductProtein || 40}g Protein
                                  </span>
                                )}
                              </div>
                            )}
                            {acc.branchName && (
                              <span className="mt-0.5">Cửa hàng: {acc.branchName}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-black ${expired ? 'text-gray-400' : 'text-emerald-600'}`}>
                          {acc.remainingCups}<span className="text-xs">/{acc.totalCups}</span>
                        </p>
                        <p className={`text-[10px] font-bold ${expired ? 'text-red-400' : daysLeft <= 7 ? 'text-orange-400' : 'text-gray-400'}`}>
                          {expired ? 'Hết hạn/ly' : `còn ${daysLeft} ngày`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ComboManagement ─────────────────────────────────────────────────────
export function ComboManagement() {
  const { combos, updateComboStatus, getTodayDeliveries, notifications, markNotificationAsRead, updateCombo } = useCombos();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingCombo, setEditingCombo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'wholesale'>('subscriptions');

  useEffect(() => {
    const timer = setInterval(() => { setCurrentTime(new Date()); }, 60000);
    return () => clearInterval(timer);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const handleEditSubmit = (updatedData: any) => {
    updateCombo(updatedData.id, updatedData);
    setEditingCombo(null);
  };

  const todayDeliveries = getTodayDeliveries();
  const activeCombos = combos.filter(c => c.status === 'active');
  const pausedCombos = combos.filter(c => c.status === 'paused');

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg overflow-hidden relative">

      {/* Tab selector */}
      <div className="flex border-b border-gray-200 bg-white shrink-0">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-colors ${
            activeTab === 'subscriptions'
              ? 'text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          📦 Gói Đặt Hàng ({activeCombos.length})
        </button>
        <button
          onClick={() => setActiveTab('wholesale')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-colors ${
            activeTab === 'wholesale'
              ? 'text-yellow-700 border-b-2 border-yellow-500 bg-yellow-50'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          👑 Quản Lý Mua Sỉ
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ── SUBSCRIPTIONS TAB ── */}
        {activeTab === 'subscriptions' && (
          <>
            {/* Notifications */}
            {unreadNotifications.length > 0 && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 shadow-lg animate-in slide-in-from-top-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                      <Bell className="w-6 h-6 text-white animate-bounce" />
                    </div>
                    <h4 className="font-black text-orange-900">Thông báo thay đổi</h4>
                  </div>
                  <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded-full text-xs font-black">
                    {unreadNotifications.length} mới
                  </span>
                </div>
                <div className="space-y-2">
                  {unreadNotifications.map(notif => (
                    <div key={notif.id} className="bg-white p-3 rounded-lg border border-orange-100 flex justify-between items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-400 mb-1">{new Date(notif.timestamp).toLocaleTimeString('vi-VN')}</p>
                        <p className="text-sm font-bold text-gray-800">
                          <span className="text-orange-600">[{notif.customerName}]</span> {notif.message}
                        </p>
                      </div>
                      <button onClick={() => markNotificationAsRead(notif.id)} className="text-gray-400 hover:text-emerald-600 p-2">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today deliveries */}
            {todayDeliveries.length > 0 && (
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                    <Bell className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-900">Giao Hàng Hôm Nay!</div>
                    <div className="text-sm text-emerald-700">{todayDeliveries.length} combo cần giao</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {todayDeliveries.map(combo => (
                    <div key={combo.id} className="bg-white rounded-lg p-3 border border-orange-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-800">{combo.customerName}</div>
                          <div className="text-sm text-gray-600">{combo.customerPhone}</div>
                          <div className="text-xs text-emerald-700 font-semibold mt-1">
                            {combo.comboType === 'weekly' ? 'Combo Tuần' : 'Combo Tháng'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingCombo(combo)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                            Giao Ngay
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active combos */}
            {activeCombos.length === 0 && todayDeliveries.length === 0 ? (
              <div className="text-center text-gray-400 py-20">
                <Package className="w-20 h-20 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Chưa có combo nào</p>
                <p className="text-sm mt-2">Bán combo cho khách hàng để bắt đầu</p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" /> Đang Hoạt Động ({activeCombos.length})
                </h3>
                <div className="space-y-3">
                  {activeCombos.map(combo => (
                    <ComboCard key={combo.id} combo={combo} updateComboStatus={updateComboStatus} onEdit={setEditingCombo} />
                  ))}
                </div>
              </div>
            )}

            {/* Paused combos */}
            {pausedCombos.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Pause className="w-5 h-5 text-yellow-600" /> Tạm Dừng ({pausedCombos.length})
                </h3>
                <div className="space-y-3">
                  {pausedCombos.map(combo => (
                    <div key={combo.id} className="rounded-xl p-4 bg-gray-100 shadow-md border-2 border-gray-300">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-bold text-gray-500 mb-1">{combo.id}</div>
                          <div className="text-lg font-bold text-gray-700">{combo.customerName}</div>
                          <div className="text-sm text-gray-600">{combo.customerPhone}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingCombo(combo)} className="bg-white hover:bg-gray-50 text-gray-600 p-2 rounded-lg border border-gray-300">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateComboStatus(combo.id, 'active')} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2">
                            <Play className="w-4 h-4" /> Kích hoạt
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── WHOLESALE TAB ── */}
        {activeTab === 'wholesale' && <WholesalePanel />}
      </div>

      {/* MODAL EDIT COMBO */}
      {editingCombo && (
        <div className="absolute inset-0 z-[100] bg-white flex flex-col">
          <div className="bg-emerald-600 p-4 flex items-center justify-between text-white shadow-lg">
            <div className="flex items-center gap-3">
              <Edit3 className="w-6 h-6" />
              <div>
                <h3 className="font-black">CHỈNH SỬA COMBO</h3>
                <p className="text-xs font-bold opacity-80">{editingCombo.id} - {editingCombo.customerName}</p>
              </div>
            </div>
            <button onClick={() => setEditingCombo(null)} className="p-2 hover:bg-emerald-700 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <CustomComboBuilder
              isPOS={true}
              initialData={{
                id: editingCombo.id,
                name: editingCombo.name || `Combo ${editingCombo.comboType}`,
                items: editingCombo.items,
                comboType: editingCombo.comboType,
                deliveryDays: editingCombo.deliveryDays,
                totalPrice: editingCombo.totalPrice,
                discount: 0,
                finalPrice: editingCombo.totalPrice,
                customerName: editingCombo.customerName,
                customerPhone: editingCombo.customerPhone
              }}
              onClose={() => setEditingCombo(null)}
              onAddToCart={handleEditSubmit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
