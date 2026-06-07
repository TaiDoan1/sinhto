import { useState } from 'react';
import { useAffiliate } from '../../contexts/AffiliateContext';
import { Plus, Search, DollarSign, Award, Users, CreditCard, ChevronRight, X, Phone } from 'lucide-react';

export function PTManagement() {
  const { partners, transactions, addPartner, getPTMonthlyStats, getPTOverallStats, payCommission } = useAffiliate();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Registration modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPtName, setNewPtName] = useState('');
  const [newPtPhone, setNewPtPhone] = useState('');
  const [newPtCode, setNewPtCode] = useState('');

  // Payment modal states
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPtForPay, setSelectedPtForPay] = useState<any>(null);
  const [payAmount, setPayAmount] = useState(0);

  // Detail modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPtForDetail, setSelectedPtForDetail] = useState<any>(null);

  const now = new Date();

  // Calculate top summaries
  const overallPartnerStats = partners.map(p => ({
    id: p.id,
    stats: getPTOverallStats(p.id)
  }));

  const totalPTs = partners.length;
  const totalReferredRevenue = overallPartnerStats.reduce((sum, item) => sum + item.stats.totalRevenue, 0);
  const totalPaidCommission = overallPartnerStats.reduce((sum, item) => sum + item.stats.paidCommission, 0);
  const totalPendingCommission = overallPartnerStats.reduce((sum, item) => sum + item.stats.pendingCommission, 0);

  const handleRegisterPt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPtName || !newPtPhone || !newPtCode) {
      alert('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    const success = addPartner(newPtName, newPtPhone, newPtCode);
    if (success) {
      alert(`Đăng ký PT ${newPtName} thành công!`);
      // Reset & close
      setNewPtName('');
      setNewPtPhone('');
      setNewPtCode('');
      setShowAddModal(false);
    } else {
      alert('Mã giới thiệu đã tồn tại! Vui lòng chọn mã khác.');
    }
  };

  const handleOpenPayModal = (pt: any, pendingAmount: number) => {
    setSelectedPtForPay(pt);
    setPayAmount(pendingAmount);
    setShowPayModal(true);
  };

  const handleConfirmPayment = () => {
    if (payAmount <= 0) {
      alert('Số tiền chi trả phải lớn hơn 0!');
      return;
    }
    payCommission(selectedPtForPay.id, payAmount);
    alert(`Đã ghi nhận thanh toán ${fmt(payAmount)} cho ${selectedPtForPay.name}`);
    setShowPayModal(false);
    setSelectedPtForPay(null);
  };

  const handleOpenDetailModal = (pt: any) => {
    setSelectedPtForDetail(pt);
    setShowDetailModal(true);
  };

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone.includes(searchTerm)
  );

  // Format Helper
  const fmt = (n: number) => {
    return (n * 1000).toLocaleString('vi-VN') + 'đ';
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'elite': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'pro': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản Lý PT & Affiliate</h1>
          <p className="text-gray-600 mt-1">Quản lý đối tác Huấn luyện viên cá nhân, hoa hồng giới thiệu</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          <span>Đăng ký PT mới</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tổng số PT đối tác', val: totalPTs, desc: 'Đang hoạt động', icon: <Users className="w-8 h-8 text-emerald-600 opacity-55" />, border: 'border-l-4 border-emerald-600' },
          { label: 'Doanh thu từ PT', val: fmt(totalReferredRevenue), desc: 'Từ combo subscriptions', icon: <DollarSign className="w-8 h-8 text-emerald-600 opacity-55" />, border: 'border-l-4 border-emerald-500' },
          { label: 'Hoa hồng đã trả', val: fmt(totalPaidCommission), desc: 'Đã đối soát & chuyển khoản', icon: <CreditCard className="w-8 h-8 text-blue-500 opacity-55" />, border: 'border-l-4 border-blue-500' },
          { label: 'Hoa hồng chưa thanh toán', val: fmt(totalPendingCommission), desc: 'Số dư tạm tính khả dụng', icon: <DollarSign className="w-8 h-8 text-amber-500 opacity-55" />, border: 'border-l-4 border-amber-500', isHighlight: true }
        ].map((card, i) => (
          <div key={i} className={`bg-white rounded-xl shadow-md p-5 flex items-center justify-between ${card.border}`}>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{card.label}</div>
              <div className={`text-2xl font-black mt-1 ${card.isHighlight ? 'text-amber-600' : 'text-gray-800'}`}>{card.val}</div>
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-1">{card.desc}</div>
            </div>
            {card.icon}
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-md p-4 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm PT theo tên, số điện thoại, mã giới thiệu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-emerald-700 focus:outline-none"
          />
        </div>
      </div>

      {/* Partners List Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider">Mã PT / Tên</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider">Số điện thoại</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider">Cấp bậc</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">Doanh số tháng</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider">Tổng doanh số</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider">Hoa hồng chưa trả</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider">Đã thanh toán</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-700 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    Chưa có đối tác PT nào được đăng ký.
                  </td>
                </tr>
              ) : (
                filteredPartners.map(pt => {
                  const monthlyStats = getPTMonthlyStats(pt.id, now.getFullYear(), now.getMonth());
                  const overall = getPTOverallStats(pt.id);

                  return (
                    <tr key={pt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span className="font-mono bg-emerald-50 text-emerald-800 font-extrabold px-2 py-0.5 rounded text-xs border border-emerald-100 mr-2">{pt.code}</span>
                          <span className="font-bold text-gray-800">{pt.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 block">ID: {pt.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {pt.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getTierBadgeColor(monthlyStats.tier)}`}>
                          {monthlyStats.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-emerald-700">
                        {monthlyStats.combosCount} combos
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                        {fmt(overall.totalRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-amber-600">
                        {fmt(overall.pendingCommission)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                        {fmt(overall.paidCommission)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenPayModal(pt, overall.pendingCommission)}
                            disabled={overall.pendingCommission <= 0}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              overall.pendingCommission > 0
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm active:scale-95'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Chi trả
                          </button>
                          <button
                            onClick={() => handleOpenDetailModal(pt)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                          >
                            Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD PARTNER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-200">
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold text-gray-800 mb-6">Đăng ký PT đối tác mới</h2>
            
            <form onSubmit={handleRegisterPt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  required
                  placeholder="Huấn luyện viên Nguyễn Văn A"
                  value={newPtName}
                  onChange={e => setNewPtName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Số điện thoại</label>
                <input
                  type="tel"
                  required
                  placeholder="09xxxxxxxx"
                  value={newPtPhone}
                  onChange={e => setNewPtPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Mã giới thiệu (Referral Code)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: ALEX99, PTKIM"
                  value={newPtCode}
                  onChange={e => setNewPtCode(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-emerald-700 focus:outline-none font-bold uppercase"
                />
                <p className="text-[10px] text-gray-400 mt-1">Mã duy nhất, khách hàng sẽ dùng mã này trong đường dẫn link giới thiệu.</p>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl font-bold mt-4 shadow-lg flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                Xác nhận đăng ký
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM PAYMENT */}
      {showPayModal && selectedPtForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
            <button onClick={() => setShowPayModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-200">
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold text-gray-800 mb-2">Thanh toán hoa hồng</h2>
            <p className="text-sm text-gray-500 mb-6">Xác nhận chuyển khoản hoa hồng tích lũy cho đối tác.</p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="text-xs text-amber-700 font-bold">PT THỤ HƯỞNG</div>
              <div className="font-bold text-gray-800 text-base mt-0.5">{selectedPtForPay.name} ({selectedPtForPay.code})</div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Phone className="w-3.5 h-3.5" />{selectedPtForPay.phone}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Số tiền thanh toán (k)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={payAmount}
                    onChange={e => setPayAmount(parseFloat(e.target.value))}
                    className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:border-emerald-700 focus:outline-none font-bold text-lg text-emerald-800"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">VND</span>
                </div>
                <span className="text-xs text-gray-400 mt-1 block">Tương đương: {fmt(payAmount)}</span>
              </div>

              <button
                onClick={handleConfirmPayment}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
              >
                Xác nhận đã thanh toán
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PT DETAILS */}
      {showDetailModal && selectedPtForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
            <button onClick={() => setShowDetailModal(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-200">
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold text-gray-800 mb-1">Chi tiết doanh số giới thiệu</h2>
            <p className="text-sm text-gray-500 mb-6">{selectedPtForDetail.name} ({selectedPtForDetail.code})</p>
            
            <div className="flex-1 overflow-y-auto space-y-4">
              {transactions.filter(t => t.ptId === selectedPtForDetail.id).length === 0 ? (
                <div className="py-12 text-center text-gray-400">Chưa ghi nhận đơn hàng giới thiệu nào.</div>
              ) : (
                <div className="space-y-3">
                  {transactions.filter(t => t.ptId === selectedPtForDetail.id).map(tx => {
                    const d = new Date(tx.timestamp);
                    // Dynamically resolve rate for this month's stats to render current estimated payout on item
                    const monthStats = getPTMonthlyStats(selectedPtForDetail.id, d.getFullYear(), d.getMonth());
                    
                    return (
                      <div key={tx.id} className="bg-gray-50 border rounded-xl p-4 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800 text-sm">{tx.customerName}</span>
                            <span className="text-[10px] text-gray-400 font-mono">#{tx.orderId}</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1 font-semibold">{tx.comboName}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {d.toLocaleDateString('vi-VN')} · {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-800 text-sm">{fmt(tx.price)}</div>
                          <div className="text-xs font-black text-emerald-700 mt-0.5">
                            +{fmt(tx.price * monthStats.rate)} 
                            <span className="text-[9px] text-gray-400 font-normal"> ({monthStats.rate * 100}%)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
