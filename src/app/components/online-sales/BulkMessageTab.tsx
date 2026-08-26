import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Send, Loader2, Users, CheckSquare, Square, Image as ImageIcon, X, AlertTriangle,
  History, ChevronDown, ChevronRight, CheckCircle2, XCircle, RefreshCw, Sparkles, Clock,
} from 'lucide-react';
import * as api from '../../utils/api';
import type { BulkRecipient, BulkCampaign, BulkCampaignRecipient } from '../../utils/api';

const TAG_OPTIONS: { key: string; label: string; chip: string }[] = [
  { key: 'vip', label: 'VIP', chip: 'bg-purple-100 text-purple-700' },
  { key: 'contacted', label: 'Đã tư vấn', chip: 'bg-blue-100 text-blue-700' },
  { key: 'urgent', label: 'Cần gấp', chip: 'bg-red-100 text-red-700' },
  { key: 'ordered', label: 'Đã chốt đơn', chip: 'bg-emerald-100 text-emerald-700' },
  { key: 'not_interested', label: 'Không quan tâm', chip: 'bg-gray-100 text-gray-600' },
];
function tagLabel(key: string) {
  return TAG_OPTIONS.find((t) => t.key === key)?.label || key;
}
function tagChip(key: string) {
  return TAG_OPTIONS.find((t) => t.key === key)?.chip || 'bg-gray-100 text-gray-600';
}

function initialOf(name?: string) {
  const t = (name || '').trim();
  return t ? t[0].toUpperCase() : '?';
}

function withinRange(iso: string | null | undefined, from: string, to: string) {
  if (!iso) return !from; // không có mốc thời gian → chỉ lọt khi không đặt cận dưới
  const t = new Date(iso).getTime();
  if (from && t < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && t > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  staffId: string;
  staffName: string;
}

export function BulkMessageTab({ staffId, staffName }: Props) {
  const [recipients, setRecipients] = useState<BulkRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bộ lọc
  const [addedFrom, setAddedFrom] = useState('');
  const [addedTo, setAddedTo] = useState('');
  const [lastMsgFrom, setLastMsgFrom] = useState('');
  const [lastMsgTo, setLastMsgTo] = useState('');
  const [only24h, setOnly24h] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Nội dung
  const [messagesText, setMessagesText] = useState('');
  const [pendingImage, setPendingImage] = useState<{ url: string; previewUrl: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gửi + tiến trình
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; failed: number; total: number; done: boolean } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lịch sử
  const [campaigns, setCampaigns] = useState<BulkCampaign[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<BulkCampaignRecipient[] | null>(null);

  const loadRecipients = useCallback(() => {
    setLoading(true);
    api.fetchBulkRecipients().then(setRecipients).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const loadCampaigns = useCallback(() => {
    api.fetchBulkCampaigns().then(setCampaigns).catch(() => {});
  }, []);

  useEffect(() => {
    loadRecipients();
    loadCampaigns();
  }, [loadRecipients, loadCampaigns]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const messages = useMemo(
    () => messagesText.split('\n').map((m) => m.trim()).filter(Boolean),
    [messagesText]
  );

  const filtered = useMemo(() => {
    return recipients.filter((r) => {
      if (only24h && !r.within24h) return false;
      if (!withinRange(r.createdAt, addedFrom, addedTo)) return false;
      if (!withinRange(r.lastMessageAt, lastMsgFrom, lastMsgTo)) return false;
      if (selectedTags.length && !selectedTags.some((t) => r.tags.includes(t))) return false;
      return true;
    });
  }, [recipients, only24h, addedFrom, addedTo, lastMsgFrom, lastMsgTo, selectedTags]);

  const filteredIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  // Chỉ tính các khách ĐANG hiển thị (sau lọc) và được chọn
  const effectiveSelected = useMemo(
    () => filtered.filter((r) => selectedIds.has(r.id)),
    [filtered, selectedIds]
  );
  const selectedOutside24h = useMemo(
    () => effectiveSelected.filter((r) => !r.within24h).length,
    [effectiveSelected]
  );

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const toggleTag = (key: string) => {
    setSelectedTags((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));
  };

  const handlePickImage = async (file: File) => {
    setUploadingImage(true);
    try {
      const url = await api.uploadImage(file);
      setPendingImage({ url, previewUrl: URL.createObjectURL(file) });
    } catch {
      alert('Tải ảnh lên thất bại');
    } finally {
      setUploadingImage(false);
    }
  };

  const pollCampaign = (campaignId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const c = await api.fetchBulkCampaign(campaignId);
        setProgress({ sent: c.sentCount, failed: c.failedCount, total: c.totalRecipients, done: c.status !== 'sending' });
        if (c.status !== 'sending') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setSending(false);
          loadCampaigns();
        }
      } catch {
        /* thử lại ở nhịp sau */
      }
    }, 1500);
  };

  const handleSend = async () => {
    if (sending) return;
    if (messages.length === 0 && !pendingImage) {
      alert('Nhập ít nhất 1 câu chào (mỗi dòng 1 câu) hoặc đính kèm ảnh.');
      return;
    }
    if (effectiveSelected.length === 0) {
      alert('Chưa chọn khách hàng nào để gửi.');
      return;
    }
    if (selectedOutside24h > 0) {
      const ok = window.confirm(
        `⚠️ CẢNH BÁO: Có ${selectedOutside24h} khách đã quá 24h kể từ tin nhắn cuối của họ.\n\n` +
        `Facebook chỉ cho nhắn chủ động trong vòng 24h — những khách này khả năng cao sẽ GỬI THẤT BẠI, ` +
        `và gửi nhiều tin ngoài 24h có thể khiến Facebook hạn chế/khóa Page.\n\n` +
        `Bạn vẫn muốn tiếp tục gửi cho toàn bộ ${effectiveSelected.length} khách đã chọn?`
      );
      if (!ok) return;
    }
    setSending(true);
    setProgress({ sent: 0, failed: 0, total: effectiveSelected.length, done: false });
    try {
      const { campaignId } = await api.sendBulkMessages({
        messages,
        imageUrl: pendingImage?.url,
        conversationIds: effectiveSelected.map((r) => r.id),
        staffId,
        staffName,
      });
      pollCampaign(campaignId);
    } catch (e: any) {
      alert(e.message || 'Gửi thất bại');
      setSending(false);
      setProgress(null);
    }
  };

  const resetAfterDone = () => {
    setProgress(null);
    setSelectedIds(new Set());
    setMessagesText('');
    setPendingImage(null);
    loadRecipients();
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setExpandedId(id);
    setExpandedDetail(null);
    try {
      const detail = await api.fetchBulkCampaign(id);
      setExpandedDetail(detail.recipients);
    } catch {
      setExpandedDetail([]);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4">
      {/* CỘT TRÁI: chọn khách */}
      <div className="space-y-4">
        {/* Bộ lọc */}
        <div className="bg-white rounded-2xl border p-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-800 font-bold">
            <Users className="w-4 h-4 text-indigo-600" /> Chọn khách nhận
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Ngày thêm khách (từ → đến)</label>
              <div className="flex items-center gap-1.5">
                <input type="date" value={addedFrom} onChange={(e) => setAddedFrom(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
                <span className="text-gray-400 text-xs">→</span>
                <input type="date" value={addedTo} onChange={(e) => setAddedTo(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Ngày nhắn gần nhất (từ → đến)</label>
              <div className="flex items-center gap-1.5">
                <input type="date" value={lastMsgFrom} onChange={(e) => setLastMsgFrom(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
                <span className="text-gray-400 text-xs">→</span>
                <input type="date" value={lastMsgTo} onChange={(e) => setLastMsgTo(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 mr-1">Tag:</span>
            {TAG_OPTIONS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => toggleTag(t.key)}
                className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${
                  selectedTags.includes(t.key) ? `${t.chip} border-transparent ring-2 ring-indigo-300` : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <input type="checkbox" checked={only24h} onChange={(e) => setOnly24h(e.target.checked)} className="w-4 h-4 accent-amber-600" />
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Chỉ khách còn trong <b>24 giờ</b> (an toàn — Facebook cho nhắn chủ động)</span>
          </label>
        </div>

        {/* Danh sách khách */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50">
            <button type="button" onClick={toggleAll} className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-indigo-600" disabled={filtered.length === 0}>
              {allFilteredSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
              Chọn tất cả ({filtered.length})
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-indigo-700">Đã chọn: {effectiveSelected.length}</span>
              <button type="button" onClick={loadRecipients} className="text-gray-400 hover:text-indigo-600" title="Tải lại">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10 px-4">
                {recipients.length === 0 ? 'Chưa có khách nào có hội thoại Facebook.' : 'Không có khách phù hợp bộ lọc.'}
              </p>
            ) : (
              filtered.map((r) => {
                const checked = selectedIds.has(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleOne(r.id)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-indigo-50/40 ${checked ? 'bg-indigo-50/60' : ''}`}
                  >
                    {checked ? <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" /> : <Square className="w-4 h-4 text-gray-300 shrink-0" />}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${r.within24h ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                      {initialOf(r.customerName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{r.customerName}</p>
                      <p className="text-[11px] text-gray-400">Nhắn gần nhất: {fmtDateTime(r.lastMessageAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(r.tags || []).slice(0, 2).map((k) => (
                        <span key={k} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tagChip(k)}`}>{tagLabel(k)}</span>
                      ))}
                      {!r.within24h && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600" title="Đã quá 24h — gửi có thể thất bại">&gt;24h</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Lịch sử chiến dịch */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-gray-50 font-bold text-gray-700 text-sm">
            <History className="w-4 h-4 text-gray-500" /> Lịch sử gửi hàng loạt
          </div>
          {campaigns.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Chưa có chiến dịch nào.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {campaigns.map((c) => (
                <div key={c.id}>
                  <button type="button" onClick={() => toggleExpand(c.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                    {expandedId === c.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800">{fmtDateTime(c.createdAt)} · {c.createdByName || 'CSKH'}</p>
                      <p className="text-[11px] text-gray-400">{c.messages.length} câu chào · {c.totalRecipients} khách</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-3.5 h-3.5" />{c.sentCount}</span>
                      {c.failedCount > 0 && <span className="flex items-center gap-1 text-red-500 font-bold"><XCircle className="w-3.5 h-3.5" />{c.failedCount}</span>}
                      {c.status === 'sending' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
                    </div>
                  </button>
                  {expandedId === c.id && (
                    <div className="px-4 pb-3 bg-gray-50/50">
                      {expandedDetail === null ? (
                        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-indigo-500" /></div>
                      ) : (
                        <div className="space-y-1 max-h-52 overflow-y-auto">
                          {expandedDetail.map((r) => (
                            <div key={r.id} className="flex items-start gap-2 text-xs bg-white rounded-lg px-2.5 py-1.5 border border-gray-100">
                              {r.status === 'sent'
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />}
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-700 truncate">{r.customerName}</p>
                                <p className="text-gray-400 truncate">{r.status === 'failed' ? `Lỗi: ${r.error}` : r.messageUsed}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CỘT PHẢI: soạn nội dung + gửi */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border p-4 space-y-3 lg:sticky lg:top-16 h-fit">
          <div className="flex items-center gap-2 text-gray-800 font-bold">
            <Sparkles className="w-4 h-4 text-indigo-600" /> Câu chào (mỗi dòng 1 câu)
          </div>
          <p className="text-[11px] text-gray-500 -mt-1">
            Mỗi khách sẽ nhận <b>ngẫu nhiên 1 câu</b> trong danh sách (chia đều, không lặp liên tiếp).
            Soạn nhiều câu khác nhau giúp tin tự nhiên hơn và giảm rủi ro bị Facebook đánh spam.
          </p>
          <textarea
            value={messagesText}
            onChange={(e) => setMessagesText(e.target.value)}
            placeholder={'Ví dụ, mỗi dòng 1 câu:\nChào bạn, FitBlend có ưu đãi mới nè!\nHi bạn ơi, tuần này quán có combo ngon lắm!\nBạn ơi ghé FitBlend thử món mới nha!'}
            className="w-full px-3 py-2.5 rounded-xl border text-sm h-40 resize-none"
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{messages.length} câu chào</span>
            {messages.length === 1 && (
              <span className="text-amber-600 font-semibold">Nên có ≥ 2 câu để tránh trùng lặp</span>
            )}
          </div>

          {/* Ảnh đính kèm */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePickImage(file);
                e.target.value = '';
              }}
            />
            {pendingImage ? (
              <div className="relative inline-block">
                <img src={pendingImage.previewUrl} alt="Ảnh gửi kèm" className="h-24 rounded-lg border" />
                <button type="button" onClick={() => setPendingImage(null)} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 border border-dashed border-gray-300 rounded-lg px-3 py-2 w-full justify-center"
              >
                {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                Đính kèm ảnh (tùy chọn)
              </button>
            )}
          </div>

          {/* Cảnh báo ngoài 24h */}
          {selectedOutside24h > 0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Có <b>{selectedOutside24h}</b> khách đã quá 24h — khả năng cao gửi thất bại và có thể ảnh hưởng Page.
                Bỏ chọn hoặc bật lại lọc "trong 24h" để an toàn.
              </span>
            </div>
          )}

          {/* Tiến trình gửi */}
          {progress && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-indigo-800">
                  {progress.done ? 'Đã gửi xong' : 'Đang gửi...'}
                </span>
                <span className="text-indigo-700 font-semibold">{progress.sent + progress.failed}/{progress.total}</span>
              </div>
              <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all"
                  style={{ width: `${progress.total ? ((progress.sent + progress.failed) / progress.total) * 100 : 0}%` }}
                />
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-600 font-semibold">✓ {progress.sent} thành công</span>
                {progress.failed > 0 && <span className="text-red-500 font-semibold">✕ {progress.failed} thất bại</span>}
              </div>
              {progress.done && (
                <button type="button" onClick={resetAfterDone} className="w-full text-sm font-semibold text-indigo-700 hover:text-indigo-900 py-1">
                  Xong — soạn chiến dịch mới
                </button>
              )}
            </div>
          )}

          {(!progress || progress.done) && (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || effectiveSelected.length === 0 || (messages.length === 0 && !pendingImage)}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-sm"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Gửi cho {effectiveSelected.length} khách
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
