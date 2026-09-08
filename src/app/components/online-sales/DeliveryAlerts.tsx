import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, Clock, Phone, MapPin, Bell, CheckCircle2, Loader2, Save } from 'lucide-react';
import * as api from '../../utils/api';

export const LEAD_SETTING_KEY = 'deliveryAlertLeadMinutes';
export const DEFAULT_LEAD = 60;

interface Alert {
  id: string;
  type: 'combo' | 'retail';
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  planName?: string;
  itemsSummary?: string;
  deliveryDate: string;
  deliveryTime: string;
  scheduledAt: string;
  branchId: string;
}

// Chuẩn hoá cảnh báo combo (delivery_logs) về chung 1 dạng với đơn lẻ.
function normalizeCombo(a: any): Alert {
  return {
    id: a.id, type: 'combo',
    customerName: a.customerName || 'Khách hàng', customerPhone: a.customerPhone || '',
    deliveryAddress: a.deliveryAddress || '', planName: a.planName || a.productName || '',
    deliveryDate: a.deliveryDate || '', deliveryTime: a.deliveryTime || '',
    scheduledAt: a.scheduledAt, branchId: a.branchId || a.branch_id || '',
  };
}

function urgency(scheduledAt: string) {
  const minLeft = (new Date(scheduledAt).getTime() - Date.now()) / 60000;
  if (minLeft < 0) return { key: 'over', label: `🔴 Quá giờ ${Math.round(-minLeft)} phút`, cls: 'border-red-300 bg-red-50' };
  if (minLeft <= 10) return { key: 'critical', label: `🔴 Còn ${Math.round(minLeft)} phút`, cls: 'border-red-300 bg-red-50' };
  if (minLeft <= 30) return { key: 'warning', label: `🟡 Còn ${Math.round(minLeft)} phút`, cls: 'border-amber-300 bg-amber-50' };
  return { key: 'normal', label: `⚪ Còn ${Math.round(minLeft)} phút`, cls: 'border-gray-200 bg-white' };
}

const QUICK = [10, 15, 30, 60, 90];

export function DeliveryAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [lead, setLead] = useState<number>(DEFAULT_LEAD);
  const [leadInput, setLeadInput] = useState<string>(String(DEFAULT_LEAD));
  const [savingLead, setSavingLead] = useState(false);
  const [savedLead, setSavedLead] = useState(false);

  // Tải mốc "báo trước N phút" (chung cả quán).
  useEffect(() => {
    api.fetchSetting(LEAD_SETTING_KEY)
      .then((v) => { const n = Number(v); if (!Number.isNaN(n) && n > 0) { setLead(n); setLeadInput(String(n)); } })
      .catch(() => {});
  }, []);

  const refresh = useCallback(async (minutes: number) => {
    try {
      const [combo, retail] = await Promise.all([
        api.fetchUpcomingDeliveryAlerts({ minutes }).catch(() => []),
        api.fetchOrderDeliveryAlerts({ minutes }).catch(() => []),
      ]);
      const merged: Alert[] = [
        ...(combo as any[]).map(normalizeCombo),
        ...(retail as Alert[]),
      ].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      setAlerts(merged);
    } catch (err) {
      console.error('Không tải được cảnh báo giao hàng:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(lead);
    const interval = setInterval(() => refresh(lead), 60000);
    return () => clearInterval(interval);
  }, [refresh, lead]);

  const applyLead = async (n: number) => {
    if (!n || n <= 0) return;
    setLead(n);
    setLeadInput(String(n));
    setSavingLead(true);
    setSavedLead(false);
    try {
      await api.saveSetting(LEAD_SETTING_KEY, n);
      setSavedLead(true);
      setTimeout(() => setSavedLead(false), 2000);
    } catch {
      alert('Lưu thời gian báo trước thất bại');
    } finally {
      setSavingLead(false);
    }
  };

  const handleAck = async (a: Alert) => {
    setAckingId(a.id);
    try {
      if (a.type === 'combo') await api.markDeliveryLogAlerted(a.id);
      else await api.ackOrderDeliveryAlert(a.id);
      setAlerts((prev) => prev.filter((x) => !(x.id === a.id && x.type === a.type)));
    } catch {
      alert('Đánh dấu thất bại. Thử lại nhé.');
    } finally {
      setAckingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-gray-900">Cảnh báo sắp tới giờ giao</h2>
      </div>

      {/* Cấu hình báo trước N phút (chung cả quán) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-bold text-gray-800">Báo trước bao nhiêu phút?</span>
          {savedLead && <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu</span>}
        </div>
        <p className="text-xs text-gray-500 mb-3">Hệ thống sẽ nhắc đơn khi <b>còn ≤ {lead} phút</b> là tới giờ giao. Áp dụng chung cho cả quán.</p>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK.map((m) => (
            <button key={m} type="button" onClick={() => applyLead(m)} disabled={savingLead}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${lead === m ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}>
              {m} phút
            </button>
          ))}
          <div className="flex items-center gap-1.5 ml-1">
            <input type="number" min={1} value={leadInput} onChange={(e) => setLeadInput(e.target.value)}
              className="w-20 px-2 py-1.5 border rounded-lg text-sm" placeholder="phút" />
            <button type="button" onClick={() => applyLead(Number(leadInput))} disabled={savingLead}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-bold disabled:opacity-60">
              {savingLead ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-14 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-gray-500">Không có đơn nào sắp tới giờ giao</p>
          <p className="text-sm mt-1">Đơn sẽ hiện ở đây khi còn ≤ {lead} phút là tới giờ.</p>
        </div>
      ) : (
        alerts.map((a) => {
          const u = urgency(a.scheduledAt);
          return (
            <div key={`${a.type}-${a.id}`} className={`rounded-xl border p-4 ${u.cls}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold">{u.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${a.type === 'combo' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {a.type === 'combo' ? 'Combo' : 'Đơn lẻ'}
                    </span>
                  </div>
                  <p className="font-bold text-gray-900 mt-1">{a.customerName}</p>
                  {a.customerPhone && (
                    <p className="text-sm text-indigo-700 flex items-center gap-1 mt-0.5"><Phone className="w-3.5 h-3.5" /> {a.customerPhone}</p>
                  )}
                  {a.deliveryAddress && (
                    <p className="text-sm text-gray-600 flex items-start gap-1 mt-1"><MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {a.deliveryAddress}</p>
                  )}
                  <p className="text-sm text-gray-700 flex items-center gap-1 mt-1 font-semibold">
                    <Clock className="w-3.5 h-3.5" /> {a.deliveryDate} lúc {a.deliveryTime}{a.branchId ? ` · CN ${a.branchId}` : ''}
                  </p>
                  {(a.planName || a.itemsSummary) && <p className="text-xs text-gray-500 mt-1 truncate">{a.planName || a.itemsSummary}</p>}
                </div>
                <button type="button" onClick={() => handleAck(a)} disabled={ackingId === a.id}
                  className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-60">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {ackingId === a.id ? '...' : 'Đã nhắc'}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
