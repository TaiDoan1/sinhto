'use client';
import { useState } from 'react';
import { X, History, Package, Banknote, QrCode, Search, Crown, DropletIcon, AlertTriangle, ChevronRight, Pause, Play, Calendar } from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import { getWholesaleAccounts, type WholesaleAccount } from './CustomerApp';
import { useCombos } from '../../contexts/ComboContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function WholesaleCard({ account }: { account: WholesaleAccount }) {
  const now = new Date();
  const expires = new Date(account.expiresAt);
  const isExpired = expires < now;
  const daysLeft = Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const usedCups = account.totalCups - account.remainingCups;
  const pct = Math.round((account.remainingCups / account.totalCups) * 100);

  return (
    <div
      className="rounded-[20px] overflow-hidden"
      style={{ background: '#f9f9fb', border: `1px solid ${isExpired ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.3)'}` }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ background: isExpired ? 'rgba(239,68,68,0.08)' : 'rgba(251,191,36,0.06)' }}
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: isExpired ? '#ef4444' : '#b45309' }}>
            {account.packageName}
          </p>
          <p className="font-black text-[16px] text-zinc-900 leading-tight">{account.customerName}</p>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(0,0,0,0.5)' }}>{account.customerPhone}</p>
        </div>
        <div
          className="px-3 py-1.5 rounded-xl text-[11px] font-black"
          style={{
            background: isExpired ? 'rgba(239,68,68,0.1)' : 'rgba(251,191,36,0.12)',
            color: isExpired ? '#ef4444' : '#b45309',
            border: `1px solid ${isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)'}`,
          }}
        >
          {isExpired ? '⚠ Hết hạn' : `Còn ${daysLeft} ngày`}
        </div>
      </div>

      {/* Cup progress */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.45)' }}>Số ly còn lại</p>
            <p className="text-[40px] font-black leading-none" style={{ color: isExpired ? '#ef4444' : '#b45309' }}>
              {account.remainingCups}
            </p>
            <p className="text-[11px]" style={{ color: 'rgba(0,0,0,0.45)' }}>/ {account.totalCups} ly · đã dùng {usedCups} ly</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.45)' }}>Hạn dùng</p>
            <p className="text-[13px] font-black text-zinc-900">{new Date(account.expiresAt).toLocaleDateString('vi-VN')}</p>
            <p className="text-[10px]" style={{ color: 'rgba(0,0,0,0.45)' }}>Mua: {new Date(account.purchasedAt).toLocaleDateString('vi-VN')}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: isExpired ? '#ef4444' : pct > 30 ? '#fbbf24' : '#f97316',
              boxShadow: isExpired ? 'none' : '0 0 8px rgba(251,191,36,0.2)',
            }}
          />
        </div>
        <p className="text-[11px] text-center font-bold" style={{ color: 'rgba(0,0,0,0.45)' }}>
          {pct}% còn lại
          {!isExpired && daysLeft <= 7 && <span className="ml-2" style={{ color: '#f97316' }}>⚠ Sắp hết hạn!</span>}
        </p>

        {/* Preferred Product & Branch */}
        {(account.preferredProduct || account.branchName) && (
          <div className="pt-2 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            {account.preferredProduct && (
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider block mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>Vị ưa thích</span>
                <span className="font-bold text-[12px] text-zinc-900 flex items-center gap-1">
                  <span>{account.preferredProduct.image}</span>
                  <span className="truncate">{account.preferredProduct.name}</span>
                </span>
                {(account.preferredProductSize || account.preferredProductProtein) && (
                  <span className="text-[10px] block mt-0.5" style={{ color: 'rgba(0,0,0,0.45)' }}>
                    {account.preferredProductSize || '360ml'} · {account.preferredProductProtein || 40}g Protein
                  </span>
                )}
              </div>
            )}
            {account.branchName && (
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider block mb-1" style={{ color: 'rgba(0,0,0,0.4)' }}>Chi nhánh</span>
                <span className="font-bold text-[12px] text-zinc-900 block truncate" title={account.branchName}>
                  📍 {account.branchName}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Redemptions */}
        {account.redemptions.length > 0 && (
          <div className="pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(0,0,0,0.45)' }}>Lịch sử rút ly</p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {[...account.redemptions].reverse().map((r, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <DropletIcon className="w-3 h-3 shrink-0" style={{ color: '#fbbf24' }} />
                    <span className="font-medium text-zinc-800">{r.flavor}</span>
                  </div>
                  <span style={{ color: 'rgba(0,0,0,0.45)' }}>
                    {new Date(r.date).toLocaleDateString('vi-VN')} · {r.redeemedBy}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerComboCard({ combo, updateCombo }: { combo: any; updateCombo: any }) {
  const [pauseStart, setPauseStart] = useState(combo.pauseStartDate || '');
  const [pauseEnd, setPauseEnd] = useState(combo.pauseEndDate || '');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isCurrentlyPausedByDate = combo.pauseStartDate && combo.pauseEndDate && (
    today >= new Date(combo.pauseStartDate) && today <= new Date(combo.pauseEndDate)
  );

  return (
    <div className="rounded-[20px] overflow-hidden bg-[#f9f9fb] border border-zinc-200">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'rgba(79, 70, 229, 0.05)' }}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-0.5 text-indigo-750">
            {combo.comboType === 'weekly' ? 'Combo Tuần' : 'Combo Tháng'}
          </p>
          <p className="font-black text-[16px] text-zinc-900 leading-tight">{combo.customerName}</p>
          <p className="text-[12px] mt-0.5 text-zinc-500">{combo.customerPhone}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-black ${
              combo.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
              combo.status === 'paused' ? 'bg-amber-100 text-amber-800' :
              'bg-gray-150 text-gray-700'
            }`}
          >
            {combo.status === 'active' ? '✓ Đang chạy' : combo.status === 'paused' ? '⏳ Tạm dừng' : 'Đã hoàn thành'}
          </span>
          {isCurrentlyPausedByDate && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white animate-pulse">
              Đang hoãn giao
            </span>
          )}
        </div>
      </div>

      {/* Info & pause settings */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex justify-between items-start text-xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Ngày bắt đầu</span>
            <span className="font-bold text-zinc-800">{new Date(combo.startDate).toLocaleDateString('vi-VN')}</span>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Thứ giao hàng</span>
            <span className="font-bold text-zinc-800">
              {combo.deliveryDays.map((d: number) => d === 0 ? 'CN' : `T${d + 1}`).join(', ')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Tổng giá trị</span>
            <span className="font-extrabold text-emerald-700">{combo.totalPrice.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>

        {/* Thực đơn */}
        <div className="bg-white p-3 rounded-xl border border-zinc-100 text-[11px] text-zinc-650 space-y-1">
          <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Thực đơn combo:</span>
          {combo.items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between">
              <span>• {item.product.name} ({item.size})</span>
              <span>{item.quantity} ly</span>
            </div>
          ))}
        </div>

        {/* Pause settings */}
        <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-3 text-xs space-y-2">
          <div className="font-bold text-amber-800 uppercase tracking-wider text-[10px]">Tạm ngừng giao vài ngày:</div>
          {combo.pauseStartDate && combo.pauseEndDate ? (
            <div className="flex justify-between items-center bg-white p-2 rounded border border-amber-100">
              <div>
                <span className="font-semibold text-gray-700 text-[11px]">Ngừng từ: </span>
                <span className="font-black text-red-650">
                  {new Date(combo.pauseStartDate).toLocaleDateString('vi-VN')} - {new Date(combo.pauseEndDate).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <button
                onClick={() => {
                  updateCombo(combo.id, { pauseStartDate: undefined, pauseEndDate: undefined });
                  setPauseStart('');
                  setPauseEnd('');
                }}
                className="bg-red-500 hover:bg-red-650 text-white px-2 py-1 rounded font-bold text-[10px] transition-colors"
              >
                Hủy ngừng
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[9px] font-bold text-gray-500 block mb-0.5">Từ ngày</label>
                  <input
                    type="date"
                    value={pauseStart}
                    onChange={e => setPauseStart(e.target.value)}
                    className="w-full bg-white border border-gray-250 rounded px-2 py-1 text-xs outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] font-bold text-gray-500 block mb-0.5">Đến ngày</label>
                  <input
                    type="date"
                    value={pauseEnd}
                    onChange={e => setPauseEnd(e.target.value)}
                    className="w-full bg-white border border-gray-250 rounded px-2 py-1 text-xs outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!pauseStart || !pauseEnd) {
                    alert('Vui lòng chọn đầy đủ khoảng ngày!');
                    return;
                  }
                  if (new Date(pauseStart) > new Date(pauseEnd)) {
                    alert('Ngày bắt đầu không thể lớn hơn ngày kết thúc!');
                    return;
                  }
                  updateCombo(combo.id, { pauseStartDate: pauseStart, pauseEndDate: pauseEnd });
                }}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded font-black uppercase text-[10px] transition-colors"
              >
                Thiết lập tạm ngừng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CustomerOrderHistory({ isOpen, onClose }: Props) {
  const { orders, history } = useOrders();
  const { combos, updateCombo } = useCombos();
  const [tab, setTab] = useState<'orders' | 'wholesale' | 'combos'>('orders');
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const [wsPhone, setWsPhone] = useState('');
  const [wsResults, setWsResults] = useState<WholesaleAccount[]>([]);
  const [wsSearched, setWsSearched] = useState(false);

  const [comboPhone, setComboPhone] = useState('');
  const [comboResults, setComboResults] = useState<any[]>([]);
  const [comboSearched, setComboSearched] = useState(false);

  const handleSearch = () => {
    if (!phone) return;
    const all = [...orders, ...history];
    setResults(all.filter(o => o.customerPhone === phone));
    setSearched(true);
  };

  const handleWsSearch = () => {
    if (!wsPhone) return;
    const accounts = getWholesaleAccounts();
    setWsResults(accounts.filter(a => a.customerPhone === wsPhone));
    setWsSearched(true);
  };

  const handleComboSearch = () => {
    if (!comboPhone) return;
    setComboResults(combos.filter(c => c.customerPhone === comboPhone));
    setComboSearched(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
      <div
        className="w-full max-w-2xl sm:rounded-[2.5rem] rounded-t-[2.5rem] overflow-hidden flex flex-col animate-slide-up"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.08)',
          maxHeight: '90vh',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-1 shrink-0 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(0,0,0,0.1)' }} />
        </div>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h2 className="font-black text-[18px] text-zinc-900 flex items-center gap-2">
            <History className="w-5 h-5" style={{ color: '#00b14f' }} /> Tra cứu đơn hàng
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-all"
            style={{ background: 'rgba(0,0,0,0.05)' }}
          >
            <X className="w-5 h-5" style={{ color: 'rgba(0,0,0,0.4)' }} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex shrink-0 px-4 pt-3 gap-2">
          {[
            { key: 'orders',    label: '📦 Đơn thường',  accent: '#00b14f' },
            { key: 'wholesale', label: '👑 Gói Mua Sỉ',  accent: '#b45309' },
            { key: 'combos',    label: '🔄 Gói Đăng Ký',  accent: '#4f46e5' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className="flex-1 py-3 rounded-[14px] text-[12px] font-black uppercase tracking-wider transition-all"
              style={tab === t.key
                ? {
                    background: t.key === 'orders' ? 'rgba(0,177,79,0.1)' : t.key === 'wholesale' ? 'rgba(251,191,36,0.12)' : 'rgba(79,70,229,0.1)',
                    color: t.accent,
                    border: `1.5px solid ${t.key === 'orders' ? 'rgba(0,177,79,0.25)' : t.key === 'wholesale' ? 'rgba(251,191,36,0.25)' : 'rgba(79,70,229,0.25)'}`
                  }
                : { background: '#f5f5f5', color: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(0,0,0,0.04)' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <>
            <div className="px-4 py-3 shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(0,0,0,0.4)' }} />
                  <input
                    type="tel"
                    placeholder="Nhập số điện thoại..."
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-4 py-3 text-sm font-medium rounded-[14px] outline-none transition-all"
                    style={{ background: '#f5f5f5', border: '1.5px solid rgba(0,0,0,0.06)', color: '#0f172a' }}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-5 py-3 rounded-[14px] font-black text-[12px] uppercase tracking-wider transition-all active:scale-95 text-white"
                  style={{ background: '#00b14f' }}
                >
                  Tra
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
              {!searched ? (
                <div className="py-16 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(0,177,79,0.06)' }}>
                    <Search className="w-8 h-8" style={{ color: 'rgba(0,177,79,0.4)' }} />
                  </div>
                  <p className="font-bold text-[14px]" style={{ color: 'rgba(0,0,0,0.4)' }}>Nhập số điện thoại để tra cứu</p>
                </div>
              ) : results.length === 0 ? (
                <div className="py-16 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(0,0,0,0.04)' }}>
                    <Package className="w-8 h-8" style={{ color: 'rgba(0,0,0,0.3)' }} />
                  </div>
                  <p className="font-bold text-[14px]" style={{ color: 'rgba(0,0,0,0.4)' }}>Không tìm thấy đơn hàng</p>
                </div>
              ) : (
                results.map(order => (
                  <div
                    key={order.id}
                    className="rounded-[18px] overflow-hidden"
                    style={{ background: '#f9f9fb', border: '1px solid rgba(0,0,0,0.05)' }}
                  >
                    <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <div>
                        <p className="font-black text-zinc-900 text-[14px]">#{order.id}</p>
                        <p className="text-[11px]" style={{ color: 'rgba(0,0,0,0.45)' }}>
                          {new Date(order.time).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      <span
                        className="px-3 py-1 rounded-full text-[11px] font-black"
                        style={{
                          background: order.status === 'completed' ? 'rgba(0,177,79,0.08)' : order.status === 'preparing' ? 'rgba(251,191,36,0.12)' : 'rgba(249,115,22,0.12)',
                          color: order.status === 'completed' ? '#00b14f' : order.status === 'preparing' ? '#b45309' : '#ea580c',
                        }}
                      >
                        {order.status === 'completed' ? '✓ Hoàn thành' : order.status === 'preparing' ? '⏳ Đang pha' : '🔄 Đang xử lý'}
                      </span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {order.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-[13px]">
                          <span className="font-bold text-zinc-800">{item.quantity || 1}× {item.productName || item.name}</span>
                          <span className="font-bold text-zinc-900">{((item.price || 0) * (item.quantity || 1)).toLocaleString('vi-VN')}đ</span>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 flex justify-between items-center" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.02)' }}>
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgba(0,0,0,0.5)' }}>
                        {order.paymentMethod === 'cash' ? <Banknote className="w-3.5 h-3.5" /> : <QrCode className="w-3.5 h-3.5" />}
                        {order.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                      </div>
                      <span className="font-black text-zinc-900">{order.total.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* WHOLESALE TAB */}
        {tab === 'wholesale' && (
          <>
            <div className="px-4 py-3 shrink-0">
              <div
                className="p-3 rounded-[14px] mb-3"
                style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)' }}
              >
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4" style={{ color: '#b45309' }} />
                  <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: '#b45309' }}>Tra cứu gói mua sỉ</p>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'rgba(0,0,0,0.5)' }}>
                  Xem số ly còn lại, ngày hết hạn và lịch sử rút ly
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(0,0,0,0.4)' }} />
                  <input
                    type="tel"
                    placeholder="SĐT đã đăng ký gói sỉ..."
                    value={wsPhone}
                    onChange={e => setWsPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleWsSearch()}
                    className="w-full pl-10 pr-4 py-3 text-sm font-medium rounded-[14px] outline-none"
                    style={{ background: '#f5f5f5', border: '1.5px solid rgba(0,0,0,0.06)', color: '#0f172a' }}
                  />
                </div>
                <button
                  onClick={handleWsSearch}
                  className="px-5 py-3 rounded-[14px] font-black text-[12px] uppercase tracking-wider text-white"
                  style={{ background: '#fbbf24' }}
                >
                  Kiểm tra
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4" style={{ scrollbarWidth: 'none' }}>
              {!wsSearched ? (
                <div className="py-16 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(251,191,36,0.06)' }}>
                    <Crown className="w-8 h-8" style={{ color: 'rgba(251,191,36,0.4)' }} />
                  </div>
                  <p className="font-bold text-[14px]" style={{ color: 'rgba(0,0,0,0.4)' }}>Nhập SĐT để tra cứu gói sỉ</p>
                </div>
              ) : wsResults.length === 0 ? (
                <div className="py-16 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(0,0,0,0.04)' }}>
                    <AlertTriangle className="w-8 h-8" style={{ color: 'rgba(249,115,22,0.5)' }} />
                  </div>
                  <p className="font-bold text-[14px]" style={{ color: 'rgba(0,0,0,0.4)' }}>Không tìm thấy gói sỉ</p>
                  <p className="text-[12px] text-center mt-1 max-w-xs" style={{ color: 'rgba(0,0,0,0.3)' }}>
                    SĐT này chưa đăng ký gói mua sỉ, hoặc đã hết hạn
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[11px] font-bold" style={{ color: 'rgba(0,0,0,0.4)' }}>
                    Tìm thấy {wsResults.length} gói sỉ
                  </p>
                  {wsResults.map(acc => (
                    <WholesaleCard key={acc.id} account={acc} />
                  ))}
                </>
              )}
            </div>
          </>
        )}

        {/* COMBOS TAB */}
        {tab === 'combos' && (
          <>
            <div className="px-4 py-3 shrink-0">
              <div
                className="p-3 rounded-[14px] mb-3"
                style={{ background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.12)' }}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: '#4f46e5' }} />
                  <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: '#4f46e5' }}>Quản lý gói Combo đã mua</p>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'rgba(0,0,0,0.5)' }}>
                  Thay đổi ngày bắt đầu ngừng giao hoặc hủy ngừng giao
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(0,0,0,0.4)' }} />
                  <input
                    type="tel"
                    placeholder="SĐT đã đăng ký gói Combo..."
                    value={comboPhone}
                    onChange={e => setComboPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleComboSearch()}
                    className="w-full pl-10 pr-4 py-3 text-sm font-medium rounded-[14px] outline-none"
                    style={{ background: '#f5f5f5', border: '1.5px solid rgba(0,0,0,0.06)', color: '#0f172a' }}
                  />
                </div>
                <button
                  onClick={handleComboSearch}
                  className="px-5 py-3 rounded-[14px] font-black text-[12px] uppercase tracking-wider text-white"
                  style={{ background: '#4f46e5' }}
                >
                  Kiểm tra
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4" style={{ scrollbarWidth: 'none' }}>
              {!comboSearched ? (
                <div className="py-16 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(79,70,229,0.06)' }}>
                    <Calendar className="w-8 h-8" style={{ color: 'rgba(79,70,229,0.4)' }} />
                  </div>
                  <p className="font-bold text-[14px]" style={{ color: 'rgba(0,0,0,0.4)' }}>Nhập SĐT để tra cứu gói Combo</p>
                </div>
              ) : comboResults.length === 0 ? (
                <div className="py-16 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(0,0,0,0.04)' }}>
                    <AlertTriangle className="w-8 h-8" style={{ color: 'rgba(249,115,22,0.5)' }} />
                  </div>
                  <p className="font-bold text-[14px]" style={{ color: 'rgba(0,0,0,0.4)' }}>Không tìm thấy gói Combo nào</p>
                  <p className="text-[12px] text-center mt-1 max-w-xs" style={{ color: 'rgba(0,0,0,0.3)' }}>
                    SĐT này chưa đăng ký gói Combo tuần/tháng nào, hoặc gói đã kết thúc.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[11px] font-bold" style={{ color: 'rgba(0,0,0,0.4)' }}>
                    Tìm thấy {comboResults.length} gói Combo đăng ký
                  </p>
                  {comboResults.map(combo => (
                    <CustomerComboCard key={combo.id} combo={combo} updateCombo={updateCombo} />
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-up {
          from { transform: translateY(60px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards; }
        input::placeholder { color: rgba(0,0,0,0.35); }
        ::-webkit-scrollbar { display: none; }
      ` }} />
    </div>
  );
}
