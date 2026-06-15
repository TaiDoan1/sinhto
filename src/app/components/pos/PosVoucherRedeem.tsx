import { useState, useEffect, useRef, useCallback } from 'react';
import { Ticket, ScanLine, QrCode, X, Check, Camera } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useLoyalty } from '../../contexts/LoyaltyContext';
import { getProgramEligibility } from '../../types/loyalty';

const SCANNER_ID = 'pos-voucher-qr-scanner';

function extractCode(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  // QR có thể chứa URL hoặc text — lấy chuỗi 5 ký tự hợp lệ cuối cùng
  const matches = trimmed.match(/[A-Z0-9]{5}/g);
  if (matches?.length) return matches[matches.length - 1];
  return trimmed.replace(/[^A-Z0-9]/g, '').slice(0, 5);
}

export function PosVoucherRedeem({
  orderSubtotal = 0,
  variant = 'full',
}: {
  orderSubtotal?: number;
  variant?: 'full' | 'compact';
}) {
  const {
    lookupByPhone,
    activeCustomer,
    setActiveCustomer,
    activeVoucher,
    applyVoucher,
    clearRedeemSelection,
    lookupVoucherByCode,
    calcProgramDiscount,
  } = useLoyalty();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyCode = useCallback(async (raw: string) => {
    const normalized = extractCode(raw);
    if (normalized.length < 5) {
      setError('Mã gồm 5 ký tự');
      return;
    }
    setApplying(true);
    setError('');
    try {
      const voucher = await lookupVoucherByCode(normalized);
      const prog = voucher.program;
      if (!prog) throw new Error('Chương trình không hợp lệ');

      let customerPoints = activeCustomer?.points ?? 0;
      let customerForVoucher = activeCustomer;
      if (!customerForVoucher) {
        const cust = await lookupByPhone(voucher.customerPhone);
        if (cust) {
          customerForVoucher = cust;
          customerPoints = cust.points;
        }
      }
      if (voucher.pointsDeducted > 0) {
        customerPoints = Math.max(customerPoints, prog.pointsCost);
      }

      const { eligible, reason } = getProgramEligibility(prog, {
        customerPoints,
        orderSubtotal,
      });
      if (!eligible) {
        setError(reason || 'Không đủ điều kiện áp dụng mã');
        return;
      }

      if (activeCustomer && voucher.customerId !== activeCustomer.id) {
        setError('Mã không thuộc khách hàng hiện tại');
        return;
      }
      if (customerForVoucher) setActiveCustomer(customerForVoucher);
      applyVoucher(voucher);
      setCode('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mã không hợp lệ');
    } finally {
      setApplying(false);
    }
  }, [activeCustomer, activeVoucher, orderSubtotal, lookupVoucherByCode, lookupByPhone, setActiveCustomer, applyVoucher]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setScanOpen(true);
    setError('');
    await new Promise(r => setTimeout(r, 300));
    try {
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decoded) => {
          await stopScanner();
          setScanOpen(false);
          await applyCode(decoded);
        },
        () => {},
      );
    } catch {
      setError('Không mở được camera. Hãy nhập mã thủ công.');
      setScanOpen(false);
      await stopScanner();
    }
  }, [applyCode, stopScanner]);

  useEffect(() => {
    if (!scanOpen) stopScanner();
    return () => { stopScanner(); };
  }, [scanOpen, stopScanner]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyCode(code);
  };

  const handleInputChange = (val: string) => {
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    setCode(cleaned);
    setError('');
    if (cleaned.length === 5) {
      applyCode(cleaned);
    }
  };

  if (activeVoucher) {
    const discount = calcProgramDiscount(orderSubtotal, activeVoucher.programId);
    return (
      <div className={`bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl shadow-lg ${variant === 'compact' ? 'p-3' : 'p-4'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/80 uppercase">Mã giảm giá đã áp dụng</p>
              <p className="font-mono font-black text-2xl tracking-[0.25em]">{activeVoucher.code}</p>
              <p className="text-sm text-white/90 truncate">{activeVoucher.program?.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearRedeemSelection}
            className="text-xs font-bold bg-white/20 hover:bg-white/30 px-2.5 py-1.5 rounded-lg flex-shrink-0"
          >
            Bỏ mã
          </button>
        </div>
        <p className="text-right text-lg font-black mt-2">−{discount.toLocaleString('vi-VN')}đ</p>
      </div>
    );
  }

  const isFull = variant === 'full';

  return (
    <>
      <div className={`bg-white border-2 border-violet-200 rounded-2xl shadow-sm ${isFull ? 'p-4 space-y-3' : 'p-3 space-y-2'}`}>
        <div className="flex items-center gap-2">
          <div className={`bg-violet-100 rounded-xl flex items-center justify-center ${isFull ? 'w-10 h-10' : 'w-8 h-8'}`}>
            <Ticket className={`text-violet-600 ${isFull ? 'w-5 h-5' : 'w-4 h-4'}`} />
          </div>
          <div>
            <h3 className={`font-bold text-gray-900 ${isFull ? 'text-base' : 'text-sm'}`}>Mã giảm giá</h3>
            <p className="text-xs text-gray-500">Nhập mã 5 ký tự hoặc quét QR</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400" />
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={5}
              value={code}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="AB12C"
              disabled={applying}
              className={`w-full pl-11 pr-3 border-2 border-violet-200 rounded-xl font-mono font-black text-violet-900 tracking-[0.3em] uppercase focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-60 ${
                isFull ? 'py-4 text-2xl text-center' : 'py-2.5 text-lg text-center'
              }`}
            />
          </div>
          <button
            type="button"
            onClick={startScanner}
            disabled={applying}
            className={`flex flex-col items-center justify-center bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-xl font-bold transition-colors ${
              isFull ? 'px-4 py-2 min-w-[72px]' : 'px-3 py-2 min-w-[60px]'
            }`}
          >
            <Camera className={isFull ? 'w-6 h-6' : 'w-5 h-5'} />
            <span className="text-[10px] mt-0.5">Quét QR</span>
          </button>
        </form>

        {applying && (
          <p className="text-center text-sm text-violet-600 font-semibold animate-pulse">Đang kiểm tra mã...</p>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-2.5 text-center font-medium">{error}</p>
        )}

        {isFull && (
          <p className="text-[10px] text-gray-400 text-center">
            Máy quét mã vạch: focus ô nhập và quét — mã tự áp dụng khi đủ 5 ký tự
          </p>
        )}
      </div>

      {scanOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-violet-600 text-white">
              <div className="flex items-center gap-2 font-bold">
                <QrCode className="w-5 h-5" />
                Quét mã QR giảm giá
              </div>
              <button
                type="button"
                onClick={() => { stopScanner(); setScanOpen(false); }}
                className="p-1 hover:bg-white/20 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div id={SCANNER_ID} className="w-full rounded-xl overflow-hidden bg-black min-h-[240px]" />
              <p className="text-center text-xs text-gray-500 mt-3">
                {scanning ? 'Đưa mã QR vào khung hình' : 'Đang khởi động camera...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
