import { UserPlus, Search, Phone, Star, Gift } from 'lucide-react';
import { useState } from 'react';
import { useLoyalty } from '../../contexts/LoyaltyContext';
import { PosVoucherRedeem } from './PosVoucherRedeem';
import {
  getProgramTypeLabel,
  getProgramEligibility,
  isProgramInPeriod,
} from '../../types/loyalty';

export function LoyaltyCustomerSection({
  allowLookup = true,
  orderSubtotal = 0,
}: {
  allowLookup?: boolean;
  orderSubtotal?: number;
}) {
  const {
    lookupByPhone,
    registerCustomer,
    activeCustomer,
    setActiveCustomer,
    redeemPointsAmount,
    setRedeemPointsAmount,
    selectedRedeemProgramId,
    setSelectedRedeemProgramId,
    activeVoucher,
    clearRedeemSelection,
    calcDiscount,
    calcProgramDiscount,
    getCustomerTier,
    config,
  } = useLoyalty();

  const [phoneSearch, setPhoneSearch] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [lookupError, setLookupError] = useState('');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    if (!phoneSearch.trim()) return;
    try {
      const cust = await lookupByPhone(phoneSearch.trim());
      if (cust) {
        setActiveCustomer(cust);
        setPhoneSearch('');
      } else {
        setLookupError('Không tìm thấy khách hàng. Bấm "Đăng ký mới" bên dưới.');
      }
    } catch {
      setLookupError('Lỗi tìm kiếm khách hàng.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    if (!newName.trim() || !newPhone.trim()) return;
    try {
      const cust = await registerCustomer(newName.trim(), newPhone.trim());
      setActiveCustomer(cust);
      setIsRegistering(false);
      setNewName('');
      setNewPhone('');
    } catch {
      setLookupError('Lỗi đăng ký khách hàng mới.');
    }
  };

  if (!allowLookup && !activeVoucher) return null;

  return (
    <div className="p-4 bg-gradient-to-b from-emerald-50 to-white border-b border-emerald-100 space-y-4">
      <PosVoucherRedeem orderSubtotal={orderSubtotal} variant="full" />

      {!activeCustomer ? (
        allowLookup ? (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-emerald-200">
              <Star className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-800">Tích Điểm Thành Viên</h3>
            <p className="text-sm text-gray-500 mt-1">Nhập SĐT để tìm hoặc đăng ký khách mới</p>
          </div>

          {isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-3 bg-white p-4 rounded-2xl border-2 border-emerald-100 shadow-sm">
              <div className="text-sm font-bold text-emerald-800">Đăng ký khách hàng mới</div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Họ và tên</label>
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full text-base p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="09xxxxxxxx"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  className="w-full text-base p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 tracking-widest font-semibold text-center"
                  required
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setIsRegistering(false)} className="flex-1 bg-gray-100 text-gray-700 text-sm py-3 rounded-xl font-semibold active:bg-gray-200">Hủy</button>
                <button type="submit" className="flex-1 bg-emerald-600 text-white text-sm py-3 rounded-xl font-bold active:bg-emerald-700 shadow-md">Đăng Ký</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLookup} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Số điện thoại khách</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                  <input
                    type="tel"
                    placeholder="Nhập số điện thoại..."
                    value={phoneSearch}
                    onChange={e => setPhoneSearch(e.target.value)}
                    className="w-full text-lg pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 tracking-widest font-bold text-center text-emerald-900 bg-white shadow-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-emerald-600 text-white text-base py-3.5 rounded-2xl font-bold active:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                  <Search className="w-5 h-5" />
                  Tìm Khách
                </button>
                <button type="button" onClick={() => setIsRegistering(true)} className="px-4 border-2 border-emerald-600 text-emerald-700 rounded-2xl font-bold active:bg-emerald-50 flex items-center justify-center gap-1.5" title="Đăng ký mới">
                  <UserPlus className="w-5 h-5" />
                  <span className="text-sm hidden sm:inline">Mới</span>
                </button>
              </div>
            </form>
          )}

          {lookupError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 text-center font-medium">{lookupError}</div>
          )}
        </div>
        ) : null
      ) : (
        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-200 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                {activeCustomer.name.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-gray-900 text-base">{activeCustomer.name}</div>
                <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5" />
                  {activeCustomer.phone}
                </div>
              </div>
            </div>
            <button onClick={() => { setActiveCustomer(null); clearRedeemSelection(); }} className="text-xs text-red-500 font-semibold px-2 py-1 rounded-lg hover:bg-red-50">
              Đổi KH
            </button>
          </div>

          <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-100">
            <span className="text-sm text-gray-600 font-medium">Điểm hiện tại</span>
            <span className="text-xl font-black text-emerald-700">{activeCustomer.points} điểm</span>
          </div>

          {(() => {
            const tier = getCustomerTier(activeCustomer.points);
            return (
              <div className={`rounded-xl px-4 py-2.5 bg-gradient-to-r ${tier.gradient} text-white text-sm font-bold flex items-center gap-2 shadow-sm`}>
                <span className="text-lg">{tier.emoji}</span>
                <span>{tier.name}</span>
                <span className="text-white/70 font-normal text-xs ml-auto">{tier.subtitle}</span>
              </div>
            );
          })()}

          {!activeVoucher && config.redeemPrograms.filter(p => p.enabled).length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-pink-500" />
                Chương trình đổi điểm
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {config.redeemPrograms.filter(p => p.enabled && isProgramInPeriod(p)).map(prog => {
                  const { eligible, reason } = getProgramEligibility(prog, {
                    customerPoints: activeCustomer.points,
                    orderSubtotal,
                  });
                  const isSelected = selectedRedeemProgramId === prog.id;
                  const discount = calcProgramDiscount(orderSubtotal, prog.id);
                  return (
                    <button
                      key={prog.id}
                      type="button"
                      disabled={!eligible}
                      onClick={() => {
                        if (!eligible) return;
                        if (isSelected) clearRedeemSelection();
                        else {
                          clearRedeemSelection();
                          setSelectedRedeemProgramId(prog.id);
                          setRedeemPointsAmount(prog.pointsCost);
                        }
                      }}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        isSelected ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                          : eligible ? 'border-gray-200 bg-white hover:border-emerald-300'
                            : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prog.type === 'shipping' ? 'bg-sky-100 text-sky-700' : 'bg-orange-100 text-orange-700'}`}>
                          {getProgramTypeLabel(prog.type)}
                        </span>
                        <span className="text-xs font-bold text-amber-600 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {prog.pointsCost} điểm
                        </span>
                      </div>
                      <div className="font-semibold text-sm text-gray-800">{prog.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{prog.description}</div>
                      {!eligible && reason && (
                        <div className="text-[10px] font-semibold text-amber-700 mt-1.5 bg-amber-50 px-2 py-1 rounded-lg inline-block">{reason}</div>
                      )}
                      {isSelected && eligible && (
                        <div className="text-xs font-bold text-pink-600 mt-1.5">Giảm: -{discount.toLocaleString('vi-VN')}đ</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!activeVoucher && !selectedRedeemProgramId && activeCustomer.points > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-gray-700">Đổi điểm giảm giá</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={activeCustomer.points}
                    value={redeemPointsAmount}
                    onChange={e => {
                      const val = Math.min(activeCustomer.points, Math.max(0, parseInt(e.target.value) || 0));
                      setRedeemPointsAmount(val);
                    }}
                    className="w-16 text-center text-base font-bold border-2 border-emerald-200 rounded-xl py-2 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-sm font-bold text-pink-600 whitespace-nowrap">-{calcDiscount(redeemPointsAmount).toLocaleString()}đ</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
