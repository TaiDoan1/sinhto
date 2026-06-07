'use client';
import { useState } from 'react';
import { X, History, Package, Banknote, QrCode, Search, Crown, DropletIcon, CalendarDays, AlertTriangle } from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import { getWholesaleAccounts, type WholesaleAccount } from './CustomerApp';

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
    <div className={`rounded-2xl overflow-hidden border ${isExpired ? 'border-red-200 bg-red-50' : 'border-emerald-100 bg-white'} shadow-sm`}>
      {/* Header */}
      <div className={`px-5 py-4 flex items-center justify-between ${isExpired ? 'bg-red-500' : 'bg-emerald-600'}`}>
        <div>
          <p className="text-white/70 text-[10px] font-black uppercase tracking-widest">{account.packageName}</p>
          <p className="text-white font-black text-lg leading-tight">{account.customerName}</p>
          <p className="text-white/70 text-xs">{account.customerPhone}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase ${isExpired ? 'bg-red-700 text-white' : 'bg-white/15 text-white'}`}>
          {isExpired ? '⚠ Hết hạn' : `Còn ${daysLeft} ngày`}
        </div>
      </div>

      {/* Cup progress */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Số ly còn lại</p>
            <p className="text-4xl font-black text-emerald-600 leading-none">{account.remainingCups}</p>
            <p className="text-xs text-gray-400 mt-0.5">/ {account.totalCups} ly · đã dùng {usedCups} ly</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Hạn dùng</p>
            <p className="text-sm font-black text-gray-700">{new Date(account.expiresAt).toLocaleDateString('vi-VN')}</p>
            <p className="text-[10px] text-gray-400">Mua: {new Date(account.purchasedAt).toLocaleDateString('vi-VN')}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isExpired ? 'bg-red-400' : pct > 30 ? 'bg-emerald-500' : 'bg-orange-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400 text-center font-bold">
          {pct}% còn lại
          {!isExpired && daysLeft <= 7 && <span className="ml-2 text-orange-500">⚠ Sắp hết hạn!</span>}
        </p>

        {/* Preferred Product & Branch info */}
        {(account.preferredProduct || account.branchName) && (
          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-600">
            {account.preferredProduct && (
              <div>
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">Vị ưa thích</span>
                <span className="font-bold text-gray-700 flex items-center gap-1 mt-0.5">
                  <span>{account.preferredProduct.image}</span> {account.preferredProduct.name}
                </span>
                {(account.preferredProductSize || account.preferredProductProtein) && (
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {account.preferredProductSize || '360ml'} · {account.preferredProductProtein || 40}g Protein
                  </span>
                )}
              </div>
            )}
            {account.branchName && (
              <div>
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider block">Cửa hàng</span>
                <span className="font-bold text-gray-700 mt-0.5 block truncate" title={account.branchName}>
                  📍 {account.branchName}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Redemption history */}
      {account.redemptions.length > 0 && (
        <div className="px-5 pb-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 mt-3">Lịch sử rút ly</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {[...account.redemptions].reverse().map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <DropletIcon className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-gray-700 font-medium">{r.flavor}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400">{new Date(r.date).toLocaleDateString('vi-VN')}</span>
                  <span className="ml-2 text-gray-300">· {r.redeemedBy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomerOrderHistory({ isOpen, onClose }: Props) {
  const { orders, history } = useOrders();
  const [tab, setTab] = useState<'orders' | 'wholesale'>('orders');
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  // Wholesale lookup state
  const [wsPhone, setWsPhone] = useState('');
  const [wsResults, setWsResults] = useState<WholesaleAccount[]>([]);
  const [wsSearched, setWsSearched] = useState(false);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" /> Tra cứu đơn hàng
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-100 text-gray-400 rounded-xl hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b shrink-0">
          <button
            onClick={() => setTab('orders')}
            className={`flex-1 py-3 text-sm font-black uppercase tracking-wider transition-colors ${tab === 'orders' ? 'text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            📦 Đơn hàng thường
          </button>
          <button
            onClick={() => setTab('wholesale')}
            className={`flex-1 py-3 text-sm font-black uppercase tracking-wider transition-colors ${tab === 'wholesale' ? 'text-yellow-700 border-b-2 border-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            👑 Gói Mua Sỉ
          </button>
        </div>

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <>
            <div className="px-6 py-3 border-b bg-gray-50 shrink-0">
              <div className="flex gap-2">
                <input type="tel" placeholder="Nhập số điện thoại..." value={phone} onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
                <button onClick={handleSearch} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center gap-1">
                  <Search className="w-4 h-4" /> Tra cứu
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {!searched ? (
                <div className="py-16 flex flex-col items-center text-gray-400">
                  <Search className="w-16 h-16 opacity-20 mb-3" />
                  <p className="font-bold">Nhập số điện thoại để tra cứu</p>
                </div>
              ) : results.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-gray-400">
                  <Package className="w-16 h-16 opacity-20 mb-3" />
                  <p className="font-bold">Không tìm thấy đơn hàng</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map(order => (
                    <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-black text-gray-900">#{order.id}</p>
                          <p className="text-xs text-gray-400">{new Date(order.time).toLocaleString('vi-VN')}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.status === 'completed' ? 'bg-green-100 text-green-700' :
                          order.status === 'preparing' ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {order.status === 'completed' ? 'Hoàn thành' : order.status === 'preparing' ? 'Đang pha chế' : 'Đang xử lý'}
                        </span>
                      </div>
                      <div className="space-y-2 py-3 border-y border-gray-50">
                        {order.items.map((item: any, idx: number) => (
                          <div key={idx} className="py-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-bold text-gray-800">{item.quantity || 1}x {item.productName || item.name}</span>
                              <span className="font-bold text-emerald-700">{((item.price || 0) * (item.quantity || 1)).toLocaleString('vi-VN')}đ</span>
                            </div>
                            {!item.isCustomCombo && (
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {item.size} | {item.protein}g {item.toppings?.length > 0 && `| Toppings: ${item.toppings.join(', ')}`}
                              </div>
                            )}
                            {item.isCustomCombo && (
                              <div className="text-[10px] text-gray-400 mt-0.5 italic">
                                {item.toppings?.join(' • ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 flex justify-between items-center">
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          {order.paymentMethod === 'cash' ? <Banknote className="w-3.5 h-3.5" /> : <QrCode className="w-3.5 h-3.5" />}
                          {order.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                        </div>
                        <span className="font-black text-emerald-700">{order.total.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── WHOLESALE TAB ── */}
        {tab === 'wholesale' && (
          <>
            {/* Info banner */}
            <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-100 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-yellow-600" />
                <p className="text-xs font-black text-yellow-700 uppercase tracking-wider">Tra cứu gói mua sỉ</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Số điện thoại đã đăng ký sỉ..."
                  value={wsPhone}
                  onChange={e => setWsPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleWsSearch()}
                  className="flex-1 px-4 py-2.5 bg-white border border-yellow-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none font-medium text-sm"
                />
                <button
                  onClick={handleWsSearch}
                  className="px-5 py-2.5 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 transition-colors flex items-center gap-1"
                >
                  <Search className="w-4 h-4" /> Kiểm tra
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
              {!wsSearched ? (
                <div className="py-16 flex flex-col items-center text-gray-400">
                  <Crown className="w-16 h-16 opacity-20 mb-3 text-yellow-400" />
                  <p className="font-bold">Nhập SĐT để tra cứu gói sỉ</p>
                  <p className="text-sm text-center mt-1 max-w-xs">Xem số ly còn lại, ngày hết hạn và lịch sử rút ly của bạn</p>
                </div>
              ) : wsResults.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-gray-400">
                  <AlertTriangle className="w-16 h-16 opacity-30 mb-3 text-orange-400" />
                  <p className="font-bold">Không tìm thấy gói sỉ</p>
                  <p className="text-sm text-center mt-1 max-w-xs">SĐT này chưa đăng ký gói mua sỉ, hoặc đã hết hạn</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 font-bold">Tìm thấy {wsResults.length} gói sỉ</p>
                  {wsResults.map(acc => (
                    <WholesaleCard key={acc.id} account={acc} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
