import { useState, useEffect } from 'react';
import { Loader2, Save, CheckCircle2, Clock, Percent, Settings as SettingsIcon } from 'lucide-react';
import * as api from '../../utils/api';
import { LEAD_SETTING_KEY, DEFAULT_LEAD } from './DeliveryAlerts';

const COMBO_PCT_KEY = 'cskhComboDurationDiscountPct';
const DEFAULT_PCT = { weekly: 8, monthly: 15, quarterly: 22 };
const LEAD_QUICK = [10, 15, 30, 60, 90];

function SavedTag({ show }: { show: boolean }) {
  return show ? <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu</span> : null;
}

export function CskhSettings() {
  // ── Giờ thông báo giao hàng ──
  const [lead, setLead] = useState<number>(DEFAULT_LEAD);
  const [leadInput, setLeadInput] = useState<string>(String(DEFAULT_LEAD));
  const [savingLead, setSavingLead] = useState(false);
  const [savedLead, setSavedLead] = useState(false);

  // ── % giảm giá combo ──
  const [pct, setPct] = useState<Record<'weekly' | 'monthly' | 'quarterly', string>>({
    weekly: String(DEFAULT_PCT.weekly), monthly: String(DEFAULT_PCT.monthly), quarterly: String(DEFAULT_PCT.quarterly),
  });
  const [savingPct, setSavingPct] = useState(false);
  const [savedPct, setSavedPct] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.fetchSetting(LEAD_SETTING_KEY).then((v) => { const n = Number(v); if (!Number.isNaN(n) && n > 0) { setLead(n); setLeadInput(String(n)); } }).catch(() => {}),
      api.fetchSetting(COMBO_PCT_KEY).then((v: any) => { if (v && typeof v === 'object') setPct({ weekly: String(v.weekly ?? DEFAULT_PCT.weekly), monthly: String(v.monthly ?? DEFAULT_PCT.monthly), quarterly: String(v.quarterly ?? DEFAULT_PCT.quarterly) }); }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const applyLead = async (n: number) => {
    if (!n || n <= 0) return;
    setLead(n); setLeadInput(String(n)); setSavingLead(true); setSavedLead(false);
    try { await api.saveSetting(LEAD_SETTING_KEY, n); setSavedLead(true); setTimeout(() => setSavedLead(false), 2000); }
    catch { alert('Lưu thời gian báo trước thất bại'); } finally { setSavingLead(false); }
  };

  const savePct = async () => {
    const parsed = {
      weekly: Math.min(90, Math.max(0, Number(pct.weekly) || 0)),
      monthly: Math.min(90, Math.max(0, Number(pct.monthly) || 0)),
      quarterly: Math.min(90, Math.max(0, Number(pct.quarterly) || 0)),
    };
    setSavingPct(true); setSavedPct(false);
    try { await api.saveSetting(COMBO_PCT_KEY, parsed); setSavedPct(true); setTimeout(() => setSavedPct(false), 2000); }
    catch { alert('Lưu % giảm giá combo thất bại'); } finally { setSavingPct(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <SettingsIcon className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-gray-900">Cài đặt CSKH</h2>
      </div>

      {/* Giờ thông báo giao hàng */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-bold text-gray-800">Thời gian báo trước giờ giao</span>
          <SavedTag show={savedLead} />
        </div>
        <p className="text-xs text-gray-500 mb-3">Nhắc đơn (combo + đơn lẻ) khi <b>còn ≤ {lead} phút</b> là tới giờ giao. Dùng chung cả quán.</p>
        <div className="flex flex-wrap items-center gap-2">
          {LEAD_QUICK.map((m) => (
            <button key={m} type="button" onClick={() => applyLead(m)} disabled={savingLead}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${lead === m ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}>{m} phút</button>
          ))}
          <div className="flex items-center gap-1.5 ml-1">
            <input type="number" min={1} value={leadInput} onChange={(e) => setLeadInput(e.target.value)} className="w-20 px-2 py-1.5 border rounded-lg text-sm" placeholder="phút" />
            <button type="button" onClick={() => applyLead(Number(leadInput))} disabled={savingLead} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-bold disabled:opacity-60">
              {savingLead ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu
            </button>
          </div>
        </div>
      </div>

      {/* % giảm giá combo tuần/tháng/quý */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Percent className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-bold text-gray-800">% giảm giá combo (theo thời hạn)</span>
          <SavedTag show={savedPct} />
        </div>
        <p className="text-xs text-gray-500 mb-3">Mức giảm giá áp dụng khi CSKH tạo combo theo Tuần / Tháng / Quý. Không ảnh hưởng POS bán lẻ.</p>
        <div className="grid grid-cols-3 gap-3">
          {([['weekly', 'Tuần'], ['monthly', 'Tháng'], ['quarterly', 'Quý']] as const).map(([k, label]) => (
            <label key={k} className="block">
              <span className="text-xs font-semibold text-gray-500">{label}</span>
              <div className="mt-1 flex items-center gap-1">
                <input type="number" min={0} max={90} value={pct[k]} onChange={(e) => setPct((p) => ({ ...p, [k]: e.target.value }))} className="w-full px-2.5 py-2 border rounded-lg text-sm font-mono" />
                <span className="text-sm font-semibold text-gray-400">%</span>
              </div>
            </label>
          ))}
        </div>
        <button type="button" onClick={savePct} disabled={savingPct} className="mt-3 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold text-sm">
          {savingPct ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu % giảm giá combo
        </button>
      </div>
    </div>
  );
}
