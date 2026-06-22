import { useState, useEffect } from 'react';
import {
  X, Phone, Copy, Check, MessageCircle, Clock, ChevronRight, Loader2,
} from 'lucide-react';
import * as api from '../../utils/api';
import type { CustomerCareAssignment } from '../../types/customerCare';
import type { SalesActivity, PipelineStage } from '../../types/onlineSales';
import type { ComboSubscription } from '../../contexts/ComboContext';
import type { Employee } from '../../types/employee';
import { PIPELINE_STAGES, ZALO_TEMPLATES, buildWebLink, fillTemplate, comboDaysRemaining } from './constants';

const ACTIVITY_LABEL: Record<string, string> = {
  fb_reply: 'Rep Facebook',
  zalo: 'Nhắn Zalo',
  call: 'Gọi điện',
  web_link: 'Gửi link web',
  note: 'Ghi chú',
  claim: 'Chốt combo',
  upsell: 'Upsale',
  converted: 'Chuyển đổi',
  lead_created: 'Tạo lead',
  status_change: 'Đổi trạng thái',
};

interface Props {
  assignment: CustomerCareAssignment;
  combos: ComboSubscription[];
  employee: Employee;
  onClose: () => void;
  onUpdated: () => void;
}

export function CustomerDetailDrawer({ assignment, combos, employee, onClose, onUpdated }: Props) {
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const refCode = employee.username;
  const webLink = buildWebLink(refCode);
  const customerCombos = combos.filter((c) => c.customerPhone === assignment.customerPhone);
  const activeCombo = customerCombos.find((c) => c.status === 'active');

  useEffect(() => {
    setLoading(true);
    api.fetchSalesActivities({ customerPhone: assignment.customerPhone })
      .then(setActivities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assignment.customerPhone]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(webLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    await logActivity('web_link', `Đã copy link web: ${webLink}`);
  };

  const logActivity = async (activityType: string, content: string) => {
    await api.createSalesActivity({
      customerPhone: assignment.customerPhone,
      careStaffId: employee.id,
      careStaffName: employee.fullName,
      activityType,
      content,
    });
    const rows = await api.fetchSalesActivities({ customerPhone: assignment.customerPhone });
    setActivities(rows);
    onUpdated();
  };

  const updateStage = async (pipelineStage: PipelineStage) => {
    setSaving(true);
    try {
      await api.patchAssignmentProfile(assignment.customerPhone, {
        pipelineStage,
        careStaffId: employee.id,
        careStaffName: employee.fullName,
        activityType: 'status_change',
        activityContent: `Chuyển sang: ${PIPELINE_STAGES.find((s) => s.id === pipelineStage)?.label}`,
      });
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const sendTemplate = async (key: keyof typeof ZALO_TEMPLATES) => {
    const tpl = ZALO_TEMPLATES[key];
    const text = fillTemplate(tpl.text, {
      name: assignment.customerName || assignment.fbName || 'bạn',
      webLink,
      staffName: employee.fullName,
    });
    await navigator.clipboard.writeText(text);
    alert('Đã copy tin nhắn Zalo — dán vào Zalo để gửi khách');
    await logActivity('zalo', tpl.label);
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await logActivity('note', note.trim());
    setNote('');
  };

  const stageInfo = PIPELINE_STAGES.find((s) => s.id === assignment.pipelineStage);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Đóng" />
      <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Chi tiết khách</p>
            <h2 className="text-xl font-black text-gray-900 truncate">{assignment.customerName || 'Khách hàng'}</h2>
            <a href={`tel:${assignment.customerPhone}`} className="text-sm text-indigo-700 font-semibold flex items-center gap-1 mt-1">
              <Phone className="w-3.5 h-3.5" /> {assignment.customerPhone}
            </a>
            {assignment.fbName && <p className="text-xs text-gray-500 mt-0.5">FB: {assignment.fbName}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stageInfo?.color || 'bg-gray-100 text-gray-700'}`}>
              {stageInfo?.label || assignment.pipelineStage}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {assignment.customerType === 'retail' ? 'Khách lẻ' : assignment.customerType === 'lead' ? 'Lead' : 'Combo'}
            </span>
          </div>

          {activeCombo && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm">
              <p className="font-bold text-indigo-900">{activeCombo.planName}</p>
              <p className="text-indigo-700 mt-1">
                Còn {comboDaysRemaining(activeCombo.startDate, activeCombo.comboDuration)} ngày
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${assignment.customerPhone}`}
              onClick={() => logActivity('call', 'Gọi điện khách')}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-sm"
            >
              <Phone className="w-4 h-4" /> Gọi
            </a>
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-50 text-indigo-800 font-bold text-sm"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Link web
            </button>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Mẫu Zalo</p>
            <div className="space-y-1.5">
              {Object.entries(ZALO_TEMPLATES).map(([key, tpl]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => sendTemplate(key as keyof typeof ZALO_TEMPLATES)}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 text-sm flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <MessageCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate">{tpl.label}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Pipeline</p>
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE_STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={saving}
                  onClick={() => updateStage(s.id)}
                  className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-colors ${
                    assignment.pipelineStage === s.id
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Ghi chú nhanh</p>
            <div className="flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú..."
                className="flex-1 px-3 py-2 rounded-xl border text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
              />
              <button type="button" onClick={addNote} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold">
                Lưu
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Timeline
            </p>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Chưa có hoạt động</p>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800">{ACTIVITY_LABEL[a.activityType] || a.activityType}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{a.content}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN') : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
