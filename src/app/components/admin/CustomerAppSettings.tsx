import { useState, useEffect } from 'react';
import { Bike, Save, Loader2, CheckCircle, Smartphone, UtensilsCrossed, DollarSign, Webhook } from 'lucide-react';
import * as api from '../../utils/api';
import { GrabMenuManager } from './GrabMenuManager';
import { GrabWebhookConfig } from './GrabWebhookConfig';

const FEE_KEY = 'customerDeliveryFee';
const DEFAULT_FEE = 15000;

// Cấu hình App Khách (web đặt món giống Grab). Hiện chỉ có phí giao hàng —
// khách "Tự lấy" luôn miễn phí, chỉ đơn "Giao hàng" mới tính phí này.
export function CustomerAppSettings() {
  const [tab, setTab] = useState<'menu' | 'fee' | 'webhook'>('menu');
  const [fee, setFee] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.fetchSetting(FEE_KEY)
      .then((v) => { const n = Number(v); setFee(String(Number.isNaN(n) ? DEFAULT_FEE : n)); })
      .catch(() => setFee(String(DEFAULT_FEE))) // chưa cấu hình (404) → gợi ý mặc định
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const n = Math.max(0, Math.round(Number(fee) || 0));
    setSaving(true);
    setSaved(false);
    try {
      await api.saveSetting(FEE_KEY, n);
      setFee(String(n));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert('Lưu phí giao hàng thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const feeNum = Math.max(0, Math.round(Number(fee) || 0));

  return (
    <div className={`${tab === 'menu' ? 'max-w-3xl' : 'max-w-xl'} mx-auto p-4 sm:p-6 space-y-5`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">App Khách — Web đặt món</h2>
          <p className="text-sm text-gray-500">Cấu hình cho trang khách hàng tự đặt món (giống Grab).</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('menu')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${tab === 'menu' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
          <UtensilsCrossed className="w-4 h-4" /> Menu món
        </button>
        <button onClick={() => setTab('fee')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${tab === 'fee' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
          <DollarSign className="w-4 h-4" /> Phí giao hàng
        </button>
        <button onClick={() => setTab('webhook')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${tab === 'webhook' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
          <Webhook className="w-4 h-4" /> Nhận đơn Grab
        </button>
      </div>

      {tab === 'menu' && <GrabMenuManager />}

      {tab === 'webhook' && <GrabWebhookConfig />}

      {tab === 'fee' && (loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2 text-gray-800 font-bold">
            <Bike className="w-4 h-4 text-emerald-600" /> Phí giao hàng
          </div>
          <p className="text-sm text-gray-500 -mt-1">
            Áp dụng cho đơn khách chọn <b>Giao hàng</b>. Khách chọn <b>Tự lấy</b> tại quán luôn <b>miễn phí</b>.
          </p>

          <label className="block">
            <span className="text-xs font-semibold text-gray-500">Phí giao mỗi đơn (VNĐ)</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1000}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:border-emerald-500 font-mono"
              />
              <span className="text-sm font-semibold text-gray-400 shrink-0">đ</span>
            </div>
          </label>

          <div className="flex flex-wrap gap-2">
            {[0, 10000, 15000, 20000, 25000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setFee(String(v))}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                  feeNum === v ? 'bg-emerald-600 text-white border-transparent' : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {v === 0 ? 'Miễn phí' : `${v.toLocaleString('vi-VN')}đ`}
              </button>
            ))}
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-sm text-emerald-800">
            Khách chọn Giao hàng sẽ trả thêm <b>{feeNum.toLocaleString('vi-VN')}đ</b> phí ship.
            {feeNum === 0 && ' (Đang để miễn phí — freeship.)'}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Đã lưu' : 'Lưu phí giao hàng'}
          </button>
        </div>
      ))}
    </div>
  );
}
