import { useState, useEffect } from 'react';
import { Loader2, Copy, Check, RefreshCw, Webhook, Send, AlertTriangle } from 'lucide-react';
import * as api from '../../utils/api';
import type { GrabWebhookConfig as Cfg } from '../../utils/api';

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* ignore */ } }}
      className="shrink-0 p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-300"
      title="Copy"
    >
      {ok ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export function GrabWebhookConfig() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');

  const load = () => {
    setLoading(true);
    api.fetchGrabWebhookConfig().then(setCfg).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const fullUrl = cfg ? `${cfg.url}?secret=${cfg.secret}` : '';
  const sampleJson = cfg ? JSON.stringify(cfg.samplePayload, null, 2) : '';

  const regen = async () => {
    if (!confirm('Đổi secret mới? Link/secret cũ sẽ NGỪNG hoạt động — bạn phải cập nhật lại ở bên trung gian.')) return;
    setRegenerating(true);
    try { await api.regenGrabWebhookSecret(); load(); } catch { alert('Đổi secret thất bại'); } finally { setRegenerating(false); }
  };

  // Gửi 1 đơn Grab thử vào chính webhook để kiểm tra đơn có vào hàng đợi POS không.
  const sendTest = async () => {
    if (!cfg) return;
    setTesting(true);
    setTestMsg('');
    try {
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(cfg.samplePayload as object), orderCode: `TEST-${Date.now()}`, customerName: 'Đơn thử Grab' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setTestMsg(`✓ Đã tạo đơn thử ${data.orderId || ''} — mở màn POS xem hàng đợi (nhãn 🛵 Grab).`);
      else setTestMsg(`✕ Lỗi: ${data.error || res.status}`);
    } catch (e: any) {
      setTestMsg(`✕ Lỗi: ${e.message}`);
    } finally { setTesting(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;
  if (!cfg) return <p className="text-sm text-gray-400 py-8 text-center">Không tải được cấu hình webhook.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-800 font-bold">
        <Webhook className="w-4 h-4 text-emerald-600" /> Nhận đơn Grab qua Webhook
      </div>
      <p className="text-sm text-gray-500 -mt-2">
        Đưa <b>URL + Secret</b> dưới đây cho dịch vụ trung gian (Analy/Pancake/Nhanh…) đã kết nối Grab, ở mục
        "đẩy đơn ra webhook". Khi có đơn Grab, đơn sẽ tự vào <b>hàng đợi POS</b> (nhãn 🛵 Grab).
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Cần bên trung gian <b>hỗ trợ đẩy đơn ra webhook ngoài</b>. Nếu chỉ có app GrabMerchant (không có API/trung gian) thì webhook chưa có nguồn đơn — hãy bấm "Gửi đơn thử" để kiểm tra luồng trước.</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div>
          <span className="text-xs font-semibold text-gray-500">URL webhook (đã kèm secret — dán nguyên cái này là tiện nhất)</span>
          <div className="mt-1 flex items-center gap-2">
            <input readOnly value={fullUrl} className="flex-1 px-3 py-2 border rounded-lg text-xs font-mono bg-gray-50 truncate" onFocus={(e) => e.target.select()} />
            <CopyBtn text={fullUrl} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <span className="text-xs font-semibold text-gray-500">URL (không kèm secret)</span>
            <div className="mt-1 flex items-center gap-2">
              <input readOnly value={cfg.url} className="flex-1 px-3 py-2 border rounded-lg text-xs font-mono bg-gray-50 truncate" onFocus={(e) => e.target.select()} />
              <CopyBtn text={cfg.url} />
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500">Secret (hoặc gửi qua header {cfg.header})</span>
            <div className="mt-1 flex items-center gap-2">
              <input readOnly value={cfg.secret} className="flex-1 px-3 py-2 border rounded-lg text-xs font-mono bg-gray-50 truncate" onFocus={(e) => e.target.select()} />
              <CopyBtn text={cfg.secret} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={sendTest} disabled={testing} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold px-3 py-2 rounded-lg">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Gửi đơn thử
          </button>
          <button type="button" onClick={regen} disabled={regenerating} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-300 text-sm font-semibold px-3 py-2 rounded-lg">
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Đổi secret mới
          </button>
        </div>
        {testMsg && <p className={`text-sm font-semibold ${testMsg.startsWith('✓') ? 'text-emerald-700' : 'text-red-600'}`}>{testMsg}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500">Mẫu dữ liệu đơn (JSON) — đưa cho bên trung gian để họ map đúng field</span>
          <CopyBtn text={sampleJson} />
        </div>
        <pre className="text-[11px] bg-gray-900 text-emerald-200 rounded-xl p-3 overflow-x-auto leading-relaxed">{sampleJson}</pre>
      </div>
    </div>
  );
}
