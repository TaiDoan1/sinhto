import { useState, useEffect, useRef, useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  X, Search, Phone, Copy, Check, QrCode, Ticket, Ban, Download,
  Users, FileSpreadsheet, Filter,
} from 'lucide-react';
import { useLoyalty } from '../../contexts/LoyaltyContext';
import {
  formatProgramValue,
  formatVoucherStatus,
  parsePhoneList,
  exportVouchersCsv,
  type LoyaltyRedeemProgram,
  type LoyaltyVoucher,
  type BulkIssueVoucherResult,
} from '../../types/loyalty';

function VoucherQRDisplay({ voucher }: { voucher: LoyaltyVoucher }) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(voucher.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const padding = 32;
    const qrSize = 200;
    const totalW = qrSize + padding * 2;
    const totalH = qrSize + padding * 2 + 90;

    const off = document.createElement('canvas');
    off.width = totalW;
    off.height = totalH;
    const ctx = off.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);
    ctx.drawImage(canvas, padding, padding, qrSize, qrSize);
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FitBlend Voucher', totalW / 2, qrSize + padding + 24);
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#111827';
    ctx.fillText(voucher.code, totalW / 2, qrSize + padding + 56);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(voucher.customerName, totalW / 2, qrSize + padding + 78);

    const link = document.createElement('a');
    link.download = `voucher-${voucher.code}.png`;
    link.href = off.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="text-center space-y-3">
      <div className="inline-block p-3 bg-white rounded-2xl border-2 border-emerald-200 shadow-lg">
        <QRCodeCanvas ref={qrRef} value={voucher.code} size={180} level="M" includeMargin />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Mã voucher (5 ký tự)</p>
        <p className="text-3xl font-black font-mono text-emerald-800 tracking-[0.2em]">{voucher.code}</p>
      </div>
      <div className="flex gap-2 justify-center">
        <button type="button" onClick={handleCopy} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Đã copy' : 'Copy'}
        </button>
        <button type="button" onClick={handleDownload} className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200">
          <Download className="w-4 h-4" /> QR
        </button>
      </div>
      <p className="text-xs text-gray-500">
        {voucher.customerName} · {voucher.customerPhone}
        {voucher.pointsDeducted > 0 && <> · −{voucher.pointsDeducted} điểm</>}
      </p>
    </div>
  );
}

type IssueMode = 'single' | 'bulk';

export function IssueVoucherModal({
  program,
  onClose,
}: {
  program: LoyaltyRedeemProgram;
  onClose: () => void;
}) {
  const { lookupByPhone, issueVoucher, issueVouchersBulk } = useLoyalty();
  const [mode, setMode] = useState<IssueMode>('single');
  const [phone, setPhone] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [customer, setCustomer] = useState<{ id: string; name: string; phone: string; points: number } | null>(null);
  const [deductPoints, setDeductPoints] = useState(program.pointsCost > 0);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState<LoyaltyVoucher | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkIssueVoucherResult | null>(null);

  const parsedPhones = useMemo(() => parsePhoneList(bulkInput), [bulkInput]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone.trim()) return;
    const found = await lookupByPhone(phone.trim());
    if (!found) {
      setError('Không tìm thấy khách hàng với SĐT này');
      setCustomer(null);
      return;
    }
    setCustomer(found);
  };

  const handleIssueSingle = async () => {
    if (!customer) return;
    setIssuing(true);
    setError('');
    try {
      const voucher = await issueVoucher(program.id, customer.phone, deductPoints);
      setIssued(voucher);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cấp mã thất bại');
    } finally {
      setIssuing(false);
    }
  };

  const handleIssueBulk = async () => {
    if (parsedPhones.length === 0) {
      setError('Nhập ít nhất một SĐT');
      return;
    }
    if (parsedPhones.length > 500) {
      setError('Tối đa 500 SĐT mỗi lần');
      return;
    }
    setIssuing(true);
    setError('');
    try {
      const result = await issueVouchersBulk(program.id, parsedPhones, deductPoints);
      setBulkResult(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cấp mã hàng loạt thất bại');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-emerald-600" />
              Cấp mã voucher
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{program.title} · {formatProgramValue(program)}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {issued ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center text-sm text-emerald-800 font-semibold">
              Đã cấp mã thành công!
            </div>
            <VoucherQRDisplay voucher={issued} />
            <button onClick={onClose} className="w-full py-2.5 bg-gray-100 rounded-xl font-semibold text-sm hover:bg-gray-200">Đóng</button>
          </div>
        ) : bulkResult ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-2xl font-black text-gray-800">{bulkResult.total}</p>
                <p className="text-xs text-gray-500">Tổng SĐT</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-2xl font-black text-emerald-700">{bulkResult.successCount}</p>
                <p className="text-xs text-emerald-600">Thành công</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-2xl font-black text-red-600">{bulkResult.failedCount}</p>
                <p className="text-xs text-red-500">Thất bại</p>
              </div>
            </div>

            {bulkResult.success.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-bold text-gray-700">Mã đã cấp ({bulkResult.success.length})</p>
                  <button
                    type="button"
                    onClick={() => exportVouchersCsv(bulkResult.success, `vouchers-${program.id}.csv`)}
                    className="text-xs font-semibold text-emerald-600 flex items-center gap-1 hover:underline"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Tải CSV
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-xl divide-y text-sm">
                  {bulkResult.success.map(v => (
                    <div key={v.id} className="flex justify-between items-center px-3 py-2 hover:bg-gray-50">
                      <span className="font-mono font-bold text-emerald-800">{v.code}</span>
                      <span className="text-gray-500 text-xs truncate ml-2">{v.customerName} · {v.customerPhone}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bulkResult.failed.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-bold text-red-600">Lỗi ({bulkResult.failed.length})</p>
                <div className="max-h-24 overflow-y-auto text-xs text-red-600 bg-red-50 rounded-xl p-2 space-y-0.5">
                  {bulkResult.failed.map((f, i) => (
                    <div key={i}>{f.phone}: {f.error}</div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={onClose} className="w-full py-2.5 bg-gray-100 rounded-xl font-semibold text-sm hover:bg-gray-200">Đóng</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'single' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'}`}
              >
                <Phone className="w-4 h-4" /> 1 khách
              </button>
              <button
                type="button"
                onClick={() => setMode('bulk')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'bulk' ? 'bg-white shadow text-violet-700' : 'text-gray-500'}`}
              >
                <Users className="w-4 h-4" /> Hàng loạt
              </button>
            </div>

            {program.pointsCost > 0 && (
              <label className="flex items-center gap-2 text-sm cursor-pointer bg-amber-50 border border-amber-100 rounded-xl p-3">
                <input type="checkbox" checked={deductPoints} onChange={e => setDeductPoints(e.target.checked)} className="w-4 h-4 accent-emerald-600 rounded" />
                <span>Trừ <strong>{program.pointsCost}</strong> điểm mỗi khách khi cấp mã</span>
              </label>
            )}

            {mode === 'single' ? (
              <>
                <form onSubmit={handleLookup} className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Số điện thoại</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setCustomer(null); }} placeholder="09xxxxxxxx" className="w-full pl-9 pr-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold" />
                    </div>
                    <button type="submit" className="px-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700">
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </form>
                {customer && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.phone}</p>
                      </div>
                      <span className="bg-white px-3 py-1 rounded-full text-sm font-bold text-emerald-700 border">{customer.points} điểm</span>
                    </div>
                    <button onClick={handleIssueSingle} disabled={issuing || (deductPoints && customer.points < program.pointsCost)} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                      <QrCode className="w-5 h-5" />
                      {issuing ? 'Đang tạo...' : 'Tạo mã 5 ký tự'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Danh sách SĐT</label>
                  <p className="text-[11px] text-gray-400 mb-1.5">Mỗi dòng một SĐT, hoặc cách nhau bằng dấu phẩy (tối đa 500)</p>
                  <textarea
                    value={bulkInput}
                    onChange={e => setBulkInput(e.target.value)}
                    rows={8}
                    placeholder={'0775164567\n0987654321\n0912345678'}
                    className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-400 font-mono text-sm resize-none"
                  />
                </div>
                {parsedPhones.length > 0 && (
                  <p className="text-sm font-semibold text-violet-700">
                    Đã nhận diện <strong>{parsedPhones.length}</strong> SĐT
                  </p>
                )}
                <button
                  onClick={handleIssueBulk}
                  disabled={issuing || parsedPhones.length === 0}
                  className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  {issuing ? `Đang cấp ${parsedPhones.length} mã...` : `Cấp mã cho ${parsedPhones.length || '...'} khách`}
                </button>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 text-center">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export function VoucherListModal({
  program,
  onClose,
}: {
  program: LoyaltyRedeemProgram;
  onClose: () => void;
}) {
  const { fetchVouchers, cancelVoucher } = useLoyalty();
  const [vouchers, setVouchers] = useState<LoyaltyVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LoyaltyVoucher | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'used' | 'cancelled'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchVouchers({ programId: program.id });
      setVouchers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [program.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vouchers.filter(v => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (!q) return true;
      return (
        v.code.toLowerCase().includes(q) ||
        v.customerName.toLowerCase().includes(q) ||
        v.customerPhone.includes(q)
      );
    });
  }, [vouchers, search, statusFilter]);

  const stats = useMemo(() => ({
    active: vouchers.filter(v => v.status === 'active').length,
    used: vouchers.filter(v => v.status === 'used').length,
    cancelled: vouchers.filter(v => v.status === 'cancelled').length,
  }), [vouchers]);

  const handleCancel = async (id: string) => {
    if (!confirm('Hủy mã này? Điểm sẽ được hoàn lại nếu đã trừ.')) return;
    try {
      await cancelVoucher(id, true);
      await load();
      if (selected?.id === id) setSelected(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Hủy thất bại');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Mã đã cấp — {program.title}</h3>
            <div className="flex gap-3 mt-1 text-xs">
              <span className="text-emerald-600 font-semibold">{stats.active} chưa dùng</span>
              <span className="text-gray-500">{stats.used} đã dùng</span>
              <span className="text-red-500">{stats.cancelled} đã hủy</span>
              <span className="text-gray-400">· Tổng {vouchers.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {vouchers.length > 0 && (
              <button
                type="button"
                onClick={() => exportVouchersCsv(filtered.length ? filtered : vouchers, `vouchers-${program.id}.csv`)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100"
              >
                <FileSpreadsheet className="w-4 h-4" /> Xuất CSV
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-b flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm mã, tên, SĐT..."
              className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-400" />
            {(['all', 'active', 'used', 'cancelled'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === s ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'Tất cả' : formatVoucherStatus(s)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
          <div className="flex-1 overflow-auto min-h-[200px]">
            {loading ? (
              <p className="text-center text-gray-400 py-12">Đang tải...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-gray-400 py-12">{vouchers.length === 0 ? 'Chưa cấp mã nào' : 'Không có kết quả'}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-4 py-3">Mã</th>
                    <th className="px-4 py-3">Khách hàng</th>
                    <th className="px-4 py-3">SĐT</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Ngày cấp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(v => (
                    <tr
                      key={v.id}
                      onClick={() => setSelected(v)}
                      className={`cursor-pointer hover:bg-emerald-50/50 ${selected?.id === v.id ? 'bg-emerald-50' : ''}`}
                    >
                      <td className="px-4 py-2.5 font-mono font-bold text-emerald-800 tracking-wider">{v.code}</td>
                      <td className="px-4 py-2.5 font-medium">{v.customerName}</td>
                      <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{v.customerPhone}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          v.status === 'active' ? 'bg-emerald-100 text-emerald-700'
                            : v.status === 'used' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {formatVoucherStatus(v.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{v.issuedAt.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l p-4 flex-shrink-0 overflow-y-auto bg-gray-50/50">
            {selected ? (
              <div className="space-y-3">
                <VoucherQRDisplay voucher={selected} />
                {selected.status === 'active' && (
                  <button onClick={() => handleCancel(selected.id)} className="w-full flex items-center justify-center gap-1.5 py-2 text-red-600 bg-red-50 rounded-xl text-sm font-semibold hover:bg-red-100">
                    <Ban className="w-4 h-4" /> Hủy mã
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center py-8">
                Chọn dòng trong bảng để xem QR
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
