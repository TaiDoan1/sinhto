import { useState, useEffect } from 'react';
import { Receipt, Save, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import * as api from '../../utils/api';
import {
  buildShiftClosingHtml,
  buildShiftClosingReceiptData,
  DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE,
  RECEIPT_STYLE,
  loadPosPrinterSettings,
  savePosPrinterSettings,
  DEFAULT_PRINTER_SETTINGS,
  type ShiftClosingBillTemplate,
  type PosPrinterSettings,
} from '../../utils/posPrint';

const SETTING_KEY = 'shiftClosingBillTemplate';

const PREVIEW_SHIFT = {
  employeeName: 'Nguyễn Văn A',
  startTime: '06:00',
  endTime: '12:00',
  checkIn: new Date().toISOString(),
  checkOut: new Date().toISOString(),
  startCash: 500000,
  endCashActual: 1250000,
};

const PREVIEW_ORDERS = [
  { total: 450000, paymentMethod: 'cash', items: [{ productName: 'Sinh tố Xoài', quantity: 5, price: 45000 }] },
  { total: 300000, paymentMethod: 'qr', items: [{ productName: 'Sinh tố Bơ', quantity: 4, price: 50000 }] },
  { total: 150000, paymentMethod: 'momo', items: [{ productName: 'Sinh tố Dâu', quantity: 3, price: 50000 }] },
  { total: 100000, paymentMethod: 'zalopay', items: [{ productName: 'Sinh tố Việt Quất', quantity: 2, price: 50000 }] },
];

const PREVIEW_CASH_MOVEMENTS: { type: 'in' | 'out'; amount: number }[] = [
  { type: 'in', amount: 100000 },
  { type: 'out', amount: 50000 },
];

export function ShiftClosingBillSettings() {
  const [template, setTemplate] = useState<ShiftClosingBillTemplate>(DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE);
  const [printerSettings, setPrinterSettings] = useState<PosPrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      api.fetchSetting(SETTING_KEY).catch(() => null),
      loadPosPrinterSettings().catch(() => DEFAULT_PRINTER_SETTINGS),
    ])
      .then(([v, printer]) => {
        if (v && typeof v === 'object') setTemplate({ ...DEFAULT_SHIFT_CLOSING_BILL_TEMPLATE, ...(v as object) });
        setPrinterSettings(printer);
      })
      .finally(() => setLoading(false));
  }, []);

  const update = (updates: Partial<ShiftClosingBillTemplate>) => {
    setTemplate((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.saveSetting(SETTING_KEY, template),
        savePosPrinterSettings(printerSettings),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const previewData = buildShiftClosingReceiptData(
    PREVIEW_SHIFT,
    PREVIEW_ORDERS,
    PREVIEW_CASH_MOVEMENTS,
    template
  );
  const previewHtml = buildShiftClosingHtml(previewData);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Mẫu Bill Kết Ca</h2>
            <p className="text-sm text-gray-500">Tùy chỉnh nội dung bill kết ca + khổ giấy/cỡ chữ máy in POS</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Đã lưu' : 'Lưu cấu hình'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-semibold">Tiêu đề bill</label>
            <input
              value={template.title}
              onChange={(e) => update({ title: e.target.value })}
              className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold">Tên cửa hàng</label>
            <input
              value={template.shopName}
              onChange={(e) => update({ shopName: e.target.value })}
              className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-semibold">Tên mục chuyển khoản / QR</label>
            <input
              value={template.transferLabel}
              onChange={(e) => update({ transferLabel: e.target.value })}
              placeholder="Chuyển khoản hoặc VNPAY..."
              className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Áp dụng cho doanh thu thanh toán qua mã QR tại quầy.</p>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 mb-1">Hiển thị các mục trên bill</p>
            {[
              { key: 'showTransfer' as const, label: template.transferLabel || 'Chuyển khoản' },
              { key: 'showZalopay' as const, label: 'Zalopay' },
              { key: 'showMomo' as const, label: 'MoMo' },
            ].map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => update({ [row.key]: !template[row.key] } as Partial<ShiftClosingBillTemplate>)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                  template[row.key]
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}
              >
                <span>{row.label}</span>
                {template[row.key] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-gray-500 font-semibold">Ghi chú cuối bill</label>
            <textarea
              value={template.footerNote}
              onChange={(e) => update({ footerNote: e.target.value })}
              rows={2}
              className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">Khổ giấy &amp; cỡ chữ máy in</p>
            <p className="text-xs text-gray-400 mb-3">
              Áp dụng cho tất cả bill in trên POS (bill khách + bill kết ca). Chỉnh đúng khổ giấy
              thật (mm) nếu chữ in ra bị nhỏ hoặc bị hụt lề — VD giấy 75mm thì nhập 75.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-semibold">Khổ giấy (mm)</label>
                <input
                  type="number"
                  min={30}
                  max={120}
                  value={printerSettings.paperWidthMm}
                  onChange={(e) =>
                    setPrinterSettings({ ...printerSettings, paperWidthMm: Number(e.target.value) || 58 })
                  }
                  className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Cỡ chữ</label>
                <select
                  value={printerSettings.fontScale}
                  onChange={(e) => setPrinterSettings({ ...printerSettings, fontScale: Number(e.target.value) })}
                  className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value={0.85}>Nhỏ</option>
                  <option value={1}>Vừa (mặc định)</option>
                  <option value={1.2}>Lớn</option>
                  <option value={1.4}>Rất lớn</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Sau khi lưu, vào POS → "Kết nối máy in USB" → bấm "In thử" để kiểm tra với máy in thật.
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1.5">Xem trước (dữ liệu mẫu)</p>
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 max-h-[600px] overflow-y-auto">
            <style>{RECEIPT_STYLE}</style>
            <div
              className="bg-white mx-auto p-4 font-mono text-xs"
              style={{ width: '280px' }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
