import { useState, useEffect, useRef } from 'react';
import { useAffiliate } from '../../contexts/AffiliateContext';
import { Award, Copy, DollarSign, Users, TrendingUp, Calculator, LogOut, Check, Download, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

// ─── QR Card Component ───────────────────────────────────────────────────────
function QRCardSection({ code, name, tierStyle }: { code: string; name: string; tierStyle: any }) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const referralUrl = `${window.location.origin}${window.location.pathname}?ref=${code}`;

  const handleDownload = () => {
    const canvas = qrRef.current;
    if (!canvas) return;

    // Create a larger composite canvas with branding
    const padding = 40;
    const qrSize = 260;
    const totalW = qrSize + padding * 2;
    const totalH = qrSize + padding * 2 + 90;

    const offscreen = document.createElement('canvas');
    offscreen.width = totalW;
    offscreen.height = totalH;
    const ctx = offscreen.getContext('2d')!;

    // Background
    ctx.fillStyle = '#0a1a0f';
    ctx.fillRect(0, 0, totalW, totalH);

    // Rounded white QR background
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(padding - 12, padding - 12, qrSize + 24, qrSize + 24, 16);
    ctx.fill();

    // Draw QR
    ctx.drawImage(canvas, padding, padding, qrSize, qrSize);

    // PT name
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, totalW / 2, qrSize + padding * 2 + 10);

    // Code
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '13px monospace';
    ctx.fillText(`Mã giới thiệu: ${code}`, totalW / 2, qrSize + padding * 2 + 34);

    // FitBlend brand
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('fitblend.vn · Quét mã để đặt hàng', totalW / 2, qrSize + padding * 2 + 58);

    const link = document.createElement('a');
    link.download = `QR_FitBlend_${code}.png`;
    link.href = offscreen.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 self-start">
        <QrCode className="w-5 h-5 text-emerald-400" />
        <h3 className="text-lg font-black">Mã QR Giới Thiệu</h3>
      </div>

      <p className="text-xs text-white/40 text-center leading-relaxed self-stretch">
        Khách hàng quét mã QR này sẽ được tự động gắn mã giới thiệu <span className="text-emerald-400 font-bold">{code}</span> khi đặt combo — hoa hồng tính ngay cho bạn!
      </p>

      {/* QR Code with white bg */}
      <div className="relative">
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'white', padding: 14, boxShadow: '0 0 40px rgba(74,222,128,0.2)' }}
        >
          <QRCodeCanvas
            ref={qrRef}
            value={referralUrl}
            size={200}
            level="H"
            imageSettings={{
              src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%230a1a0f'/%3E%3Ctext x='16' y='21' text-anchor='middle' font-size='16' font-weight='900' fill='%234ade80' font-family='Arial'%3EF%3C/text%3E%3C/svg%3E",
              height: 36,
              width: 36,
              excavate: true,
            }}
          />
        </div>

        {/* Tier glow ring */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: `0 0 0 2px ${tierStyle.color}40, 0 0 30px ${tierStyle.color}20` }}
        />
      </div>

      {/* URL preview */}
      <div className="w-full bg-black/30 border border-white/5 rounded-xl px-3 py-2 flex items-center gap-2 overflow-hidden">
        <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest shrink-0">URL</span>
        <span className="text-[10px] text-white/50 font-mono truncate">{referralUrl}</span>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        style={{ background: `linear-gradient(135deg, ${tierStyle.color}, ${tierStyle.color}aa)`, color: '#0a1a0f' }}
      >
        <Download className="w-4 h-4" />
        Tải QR về (In & Dán phòng gym)
      </button>

      <p className="text-[10px] text-white/25 text-center">
        Định dạng PNG · Kích thước đủ để in A5/A4
      </p>
    </div>
  );
}

// ─── Main Partner Dashboard ───────────────────────────────────────────────────
export function PartnerDashboard() {
  const { resolveCode, getPTMonthlyStats, getPTOverallStats, transactions } = useAffiliate();
  const [ptCodeInput, setPtCodeInput] = useState('');
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Calculator inputs
  const [calcWeekly, setCalcWeekly] = useState(3);
  const [calcMonthly, setCalcMonthly] = useState(1);
  const [calcQuarterly, setCalcQuarterly] = useState(0);

  // Load active login session
  useEffect(() => {
    const savedSession = localStorage.getItem('ptActiveSession');
    if (savedSession) {
      setActiveCode(savedSession);
    }
  }, []);

  const handleLogin = (code: string) => {
    const partner = resolveCode(code);
    if (partner) {
      setActiveCode(partner.code);
      localStorage.setItem('ptActiveSession', partner.code);
    } else {
      alert('Mã đối tác không tồn tại. Thử ALEX99, ELENA88, hoặc KEVIN77');
    }
  };

  const handleLogout = () => {
    setActiveCode(null);
    localStorage.removeItem('ptActiveSession');
  };

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}${window.location.pathname}?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeCode) {
    // LOGIN SCREEN
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4" style={{ background: '#0a1a0f' }}>
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-[#0a1a0f] font-black text-2xl mx-auto shadow-lg shadow-emerald-500/20 mb-4">
              F
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Cổng Đối Tác FitBlend</h2>
            <p className="text-sm text-white/50 mt-1">Đăng nhập để xem thống kê và rút hoa hồng PT</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-2">Nhập mã giới thiệu của bạn</label>
              <input
                type="text"
                placeholder="Ví dụ: ALEX99"
                value={ptCodeInput}
                onChange={e => setPtCodeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin(ptCodeInput)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-white transition-all text-center font-bold text-lg uppercase"
              />
            </div>

            <button
              onClick={() => handleLogin(ptCodeInput)}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-[#0a1a0f] rounded-2xl font-black text-base transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              VÀO BẢNG ĐIỀU KHIỂN
            </button>

            <div className="pt-6 border-t border-white/10">
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider text-center mb-3">Tài khoản dùng thử nhanh</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'Alex (Starter)', code: 'ALEX99' },
                  { name: 'Elena (Pro)', code: 'ELENA88' },
                  { name: 'Kevin (Elite)', code: 'KEVIN77' }
                ].map(mock => (
                  <button
                    key={mock.code}
                    onClick={() => handleLogin(mock.code)}
                    className="py-2.5 px-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-[10px] font-bold text-emerald-400 transition-all text-center"
                  >
                    <div>{mock.name}</div>
                    <div className="text-[9px] text-white/50 mt-0.5 font-mono font-normal">{mock.code}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard content
  const partner = resolveCode(activeCode)!;
  const now = new Date();
  const currentMonthStats = getPTMonthlyStats(partner.id, now.getFullYear(), now.getMonth());
  const overallStats = getPTOverallStats(partner.id);

  // Calc values for tier metrics
  const combosCount = currentMonthStats.combosCount;
  const currentTier = currentMonthStats.tier;
  const currentRate = currentMonthStats.rate;

  let nextTierLabel = '';
  let combosNeeded = 0;
  let progressPct = 0;

  if (combosCount < 6) {
    nextTierLabel = 'PRO (Chiết khấu 15%)';
    combosNeeded = 6 - combosCount;
    progressPct = (combosCount / 6) * 100;
  } else if (combosCount < 16) {
    nextTierLabel = 'ELITE (Chiết khấu 20%)';
    combosNeeded = 16 - combosCount;
    progressPct = ((combosCount - 6) / 10) * 100;
  } else {
    nextTierLabel = 'Tối đa (ELITE)';
    progressPct = 100;
  }

  // Filter PT's personal referred orders
  const ptReferrals = transactions
    .filter(t => t.ptId === partner.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Format Helper
  const fmt = (n: number) => {
    return (n * 1000).toLocaleString('vi-VN');
  };

  // Calculator logic
  const calcTotalRevenue = (calcWeekly * 725) + (calcMonthly * 2933) + (calcQuarterly * 8330);
  const calcCommissions = calcTotalRevenue * currentRate;

  // Styling helper for tiers
  const getTierStyle = (tier: string) => {
    switch (tier) {
      case 'elite':
        return {
          bg: 'from-amber-500 to-amber-700',
          text: 'text-amber-300 border-amber-500/20 bg-amber-500/10',
          label: 'ELITE (20%)',
          color: '#f59e0b'
        };
      case 'pro':
        return {
          bg: 'from-blue-500 to-indigo-700',
          text: 'text-blue-300 border-blue-500/20 bg-blue-500/10',
          label: 'PRO (15%)',
          color: '#3b82f6'
        };
      default:
        return {
          bg: 'from-emerald-600 to-emerald-800',
          text: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10',
          label: 'STARTER (10%)',
          color: '#10b981'
        };
    }
  };

  const style = getTierStyle(currentTier);

  return (
    <div className="min-h-screen text-white font-sans pb-16" style={{ background: '#0a1a0f' }}>
      
      {/* Top Banner Header */}
      <div className={`bg-gradient-to-r ${style.bg} p-6 md:p-8 rounded-b-[2rem] shadow-xl relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-12 translate-x-12" />
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight">{partner.name}</h1>
              <span className={`text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full border ${style.text}`}>
                {style.label}
              </span>
            </div>
            <p className="text-white/70 text-sm mt-1">Đối tác Personal Trainer liên kết với FitBlend</p>
            
            {/* Referral Link & Code Box */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <div className="bg-black/20 hover:bg-black/30 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
                <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Mã giới thiệu:</span>
                <span className="font-extrabold text-sm text-emerald-400 tracking-wide">{partner.code}</span>
              </div>
              
              <button 
                onClick={() => handleCopyLink(partner.code)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl flex items-center gap-2 text-xs font-bold transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">ĐÃ SAO CHÉP LINK</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>SAO CHÉP LINK GIỚI THIỆU</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="self-end md:self-auto px-4 py-2 bg-black/20 hover:bg-red-500/20 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-xl flex items-center gap-2 text-xs font-bold transition-all text-white/80"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Progress & stats */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tier Tracker card */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" /> Cấp bậc hoa hồng tháng {now.getMonth() + 1}
                </h3>
                <p className="text-xs text-white/40 font-medium mt-0.5">Tự động nâng hạng vào cuối tháng dựa trên số combo bán ra</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-emerald-400">{combosCount}</span>
                <span className="text-sm text-white/40 font-bold"> combos</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white/60">
                {combosCount < 6 ? 'Mốc khởi đầu (Starter)' : combosCount < 16 ? 'Đã đạt Pro' : 'Đã đạt tối đa (Elite)'}
              </span>
              {combosCount < 16 && (
                <span className="font-black text-emerald-400 flex items-center gap-1">
                  Cần thêm <span className="underline">{combosNeeded} combos</span> để lên {nextTierLabel}
                </span>
              )}
            </div>

            <div className="mt-5 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-white/50 leading-relaxed">
              💡 <span className="font-bold text-white">Chế độ hoa hồng đồng bộ:</span> Khi đạt mốc combo cao hơn, toàn bộ hoa hồng các đơn hàng trong tháng sẽ được tính theo tỷ lệ chiết khấu mới nhất (retroactive). Nhận 10% ở Starter, 15% ở Pro (từ combo thứ 6), và 20% ở Elite (từ combo thứ 16).
            </div>
          </div>

          {/* Core Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Doanh Số Tháng Này', val: fmt(currentMonthStats.revenue), sub: `${combosCount} Combos`, icon: <TrendingUp className="w-5 h-5 text-emerald-400" /> },
              { label: 'Hoa Hồng Đã Nhận', val: fmt(overallStats.paidCommission), sub: 'Chuyển khoản thành công', icon: <Check className="w-5 h-5 text-blue-400" /> },
              { label: 'Số Dư Khả Dụng', val: fmt(overallStats.pendingCommission), sub: 'Tạm tính chưa đối soát', icon: <DollarSign className="w-5 h-5 text-amber-400" />, highlight: true }
            ].map((stat, i) => (
              <div key={i} className={`rounded-2xl p-5 border ${stat.highlight ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-center justify-between mb-3 text-white/45">
                  <span className="text-xs font-bold uppercase tracking-wider">{stat.label}</span>
                  {stat.icon}
                </div>
                <p className={`text-2xl font-black tracking-tight ${stat.highlight ? 'text-amber-400' : 'text-white'}`}>{stat.val}</p>
                <p className="text-[10px] text-white/40 font-bold mt-1 uppercase tracking-wide">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Referred Customers/Orders History */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h3 className="text-lg font-black flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-emerald-400" /> Lịch sử đơn hàng giới thiệu ({ptReferrals.length})
            </h3>
            
            {ptReferrals.length === 0 ? (
              <div className="py-12 text-center text-white/20 border border-dashed border-white/10 rounded-2xl">
                Chưa có đơn hàng nào được mua qua link của bạn.
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {ptReferrals.map((ref, idx) => {
                  const txDate = new Date(ref.timestamp);
                  return (
                    <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.06] transition-all">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white">{ref.customerName}</span>
                          <span className="text-[10px] font-mono text-white/30">{ref.orderId}</span>
                        </div>
                        <p className="text-xs text-white/60 font-semibold mt-1">{ref.comboName}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {txDate.toLocaleDateString('vi-VN')} · {txDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-white">{fmt(ref.price)}</p>
                        {/* Commission earned based on monthly rate at dynamic render time */}
                        <p className="text-xs font-extrabold text-emerald-400 mt-0.5">
                          +{fmt(ref.price * currentRate)}
                          <span className="text-[9px] text-white/30 font-normal"> ({currentRate * 100}%)</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: QR + Calculator */}
        <div className="space-y-6">

          {/* QR Code Card */}
          <QRCardSection code={partner.code} name={partner.name} tierStyle={style} />

          {/* Commission Calculator */}
          <div className="bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-3xl p-6">
            <h3 className="text-lg font-black flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-emerald-400" /> Bảng tính hoa hồng động
            </h3>
            <p className="text-xs text-white/50 mb-6 leading-relaxed">
              Mô phỏng doanh thu và hoa hồng dựa trên mức chiết khấu hiện tại của bạn: <span className="font-extrabold text-emerald-400">{currentRate * 100}%</span>.
            </p>

            <div className="space-y-5">
              {[
                { label: 'Combo Tuần (725k)', val: calcWeekly, setVal: setCalcWeekly, color: 'accent-emerald-500' },
                { label: 'Combo Tháng (2.933k)', val: calcMonthly, setVal: setCalcMonthly, color: 'accent-blue-500' },
                { label: 'Combo Quý (8.330k)', val: calcQuarterly, setVal: setCalcQuarterly, color: 'accent-amber-500' }
              ].map((slider, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-white/70">{slider.label}</span>
                    <span className="text-emerald-400 text-sm">{slider.val} khách</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={slider.val}
                    onChange={e => slider.setVal(parseInt(e.target.value))}
                    className={`w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer ${slider.color}`}
                  />
                </div>
              ))}
            </div>

            {/* Result area */}
            <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
              <div className="flex justify-between items-center text-xs text-white/60 font-bold">
                <span>Tổng doanh số giả định:</span>
                <span className="font-black text-sm text-white">{fmt(calcTotalRevenue)}</span>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-center items-center text-center">
                <p className="text-[10px] text-emerald-300 font-black uppercase tracking-widest">Hoa hồng nhận được</p>
                <p className="text-3xl font-black text-emerald-400 tracking-tight mt-1">{fmt(calcCommissions)}</p>
                <p className="text-[10px] text-white/40 mt-1">Đã áp dụng mức chiết khấu {currentRate * 100}%</p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
