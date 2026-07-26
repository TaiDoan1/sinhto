import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Link2, Loader2, Search, RefreshCw, Image as ImageIcon, X, Tag as TagIcon, ChevronDown, MessageSquareText } from 'lucide-react';
import * as api from '../../utils/api';
import type { FbConversation, FbMessage, SavedReply } from '../../utils/api';
import { useSSE } from '../../contexts/SSEContext';
import { SavedRepliesPanel } from './SavedRepliesPanel';

const TAG_OPTIONS: { key: string; label: string; dot: string; chip: string }[] = [
  { key: 'vip', label: 'VIP', dot: 'bg-purple-500', chip: 'bg-purple-100 text-purple-700' },
  { key: 'contacted', label: 'Đã tư vấn', dot: 'bg-blue-500', chip: 'bg-blue-100 text-blue-700' },
  { key: 'urgent', label: 'Cần gấp', dot: 'bg-red-500', chip: 'bg-red-100 text-red-700' },
  { key: 'ordered', label: 'Đã chốt đơn', dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700' },
  { key: 'not_interested', label: 'Không quan tâm', dot: 'bg-gray-400', chip: 'bg-gray-100 text-gray-600' },
];

function tagInfo(key: string) {
  return TAG_OPTIONS.find((t) => t.key === key) || { key, label: key, dot: 'bg-gray-400', chip: 'bg-gray-100 text-gray-600' };
}

function initialOf(name?: string) {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed[0].toUpperCase() : '?';
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
}

interface Props {
  staffId: string;
  staffName: string;
}

export function FbMessagesTab({ staffId, staffName }: Props) {
  const { subscribe } = useSSE();
  const [conversations, setConversations] = useState<FbConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<FbMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [linkPhone, setLinkPhone] = useState('');
  const [linking, setLinking] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ url: string; previewUrl: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [savedRepliesOpen, setSavedRepliesOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConversations = useCallback(() => {
    api.fetchFbConversations().then(setConversations).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const unsub1 = subscribe('FB_CONVERSATION_UPDATED', (conv: FbConversation) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conv.id);
        const next = idx >= 0 ? [...prev.slice(0, idx), conv, ...prev.slice(idx + 1)] : [conv, ...prev];
        return next.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      });
    });
    const unsub2 = subscribe('FB_MESSAGE_CREATED', (msg: FbMessage) => {
      setMessages((prev) => (prev.length && prev[0].conversationId === msg.conversationId ? [...prev, msg] : prev));
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [subscribe]);

  useEffect(() => {
    if (!selectedId) return;
    setPendingImage(null);
    setTagMenuOpen(false);
    setMessagesLoading(true);
    api
      .fetchFbMessages(selectedId)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false));
    api.updateFbConversation(selectedId, { markRead: true }).then((conv) => {
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? conv : c)));
    }).catch(() => {});
    const conv = conversations.find((c) => c.id === selectedId);
    setLinkPhone(conv?.linkedCustomerPhone || '');
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Tự làm mới định kỳ — không chỉ dựa vào SSE, vì backend cũng chỉ đồng bộ Facebook mỗi 45s
  // (chưa qua App Review nên không có webhook thật đẩy tức thì).
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
      if (selectedId) {
        api.fetchFbMessages(selectedId).then(setMessages).catch(() => {});
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [loadConversations, selectedId]);

  const selected = conversations.find((c) => c.id === selectedId) || null;

  const handleSend = async () => {
    if (!selectedId || (!draft.trim() && !pendingImage) || sending) return;
    setSending(true);
    try {
      await api.sendFbReply(selectedId, draft.trim(), staffId, staffName, pendingImage?.url);
      setDraft('');
      setPendingImage(null);
    } catch (e: any) {
      alert(e.message || 'Gửi tin nhắn thất bại');
    } finally {
      setSending(false);
    }
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

  const handlePickSavedReply = (reply: SavedReply) => {
    setDraft(reply.message);
    if (reply.imageUrl) {
      setPendingImage({ url: reply.imageUrl, previewUrl: reply.imageUrl });
    }
    setSavedRepliesOpen(false);
  };

  const handleLink = async () => {
    if (!selectedId) return;
    setLinking(true);
    try {
      const conv = await api.updateFbConversation(selectedId, { linkedCustomerPhone: linkPhone.trim() || null });
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? conv : c)));
    } catch {
      alert('Liên kết SĐT thất bại');
    } finally {
      setLinking(false);
    }
  };

  const handleToggleTag = async (key: string) => {
    if (!selected) return;
    const current = selected.tags || [];
    const next = current.includes(key) ? current.filter((t) => t !== key) : [...current, key];
    try {
      const conv = await api.updateFbConversation(selected.id, { tags: next });
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? conv : c)));
    } catch {
      alert('Cập nhật tag thất bại');
    }
  };

  const handleBackfill = async () => {
    if (backfilling) return;
    setBackfilling(true);
    try {
      const result = await api.backfillFbConversations();
      alert(`Đã đồng bộ ${result.conversations} hội thoại, ${result.messages} tin nhắn từ Facebook.`);
      loadConversations();
    } catch (e: any) {
      alert(e.message || 'Đồng bộ lịch sử thất bại');
    } finally {
      setBackfilling(false);
    }
  };

  const filtered = conversations.filter((c) =>
    !search.trim() || c.customerName?.toLowerCase().includes(search.toLowerCase()) || c.linkedCustomerPhone?.includes(search)
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden grid grid-cols-1 md:grid-cols-[340px_1fr] h-[calc(100vh-130px)] min-h-[640px]">
      <div className="border-r border-gray-200 flex flex-col min-h-0">
        <div className="p-3 border-b border-gray-100 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm khách..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
          <button
            type="button"
            onClick={handleBackfill}
            disabled={backfilling}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 py-1.5"
          >
            {backfilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Đồng bộ tin nhắn cũ từ Facebook
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10 px-4">
              {conversations.length === 0 ? 'Chưa có tin nhắn Facebook nào.' : 'Không tìm thấy khách phù hợp.'}
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-3 border-b border-gray-50 hover:bg-red-100/60 transition-colors flex items-start gap-2.5 ${
                  selectedId === c.id ? 'bg-indigo-50' : c.unreadCount > 0 ? 'bg-red-50' : ''
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5 ${c.unreadCount > 0 ? 'bg-red-600' : 'bg-slate-400'}`}>
                  {initialOf(c.customerName)}
                </div>
                <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${c.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>{c.customerName}</p>
                  {c.unreadCount > 0 && (
                    <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0">{c.unreadCount}</span>
                  )}
                </div>
                <p className={`text-xs truncate mt-0.5 ${c.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                  {c.lastDirection === 'out' ? 'Bạn: ' : ''}{c.lastMessageText}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[11px] text-gray-400">{timeAgo(c.lastMessageAt)}</p>
                  {(c.tags || []).map((key) => (
                    <span key={key} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tagInfo(key).chip}`}>
                      {tagInfo(key).label}
                    </span>
                  ))}
                </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col min-h-0">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
            <MessageCircle className="w-10 h-10" />
            <p className="text-sm">Chọn một hội thoại để xem tin nhắn</p>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-gray-100 flex items-center gap-3 flex-wrap bg-white">
              <div className="w-9 h-9 rounded-full bg-slate-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {initialOf(selected.customerName)}
              </div>
              <div className="mr-auto min-w-0">
                <p className="font-bold text-gray-800 truncate">{selected.customerName}</p>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <p className="text-[11px] text-gray-400">Khách Messenger</p>
                  {(selected.tags || []).map((key) => (
                    <span key={key} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tagInfo(key).chip}`}>
                      {tagInfo(key).label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTagMenuOpen((v) => !v)}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-indigo-600 border border-gray-200 rounded-lg px-2 py-1.5"
                >
                  <TagIcon className="w-3.5 h-3.5" /> Tag <ChevronDown className="w-3 h-3" />
                </button>
                {tagMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setTagMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-20 w-48">
                      {TAG_OPTIONS.map((t) => {
                        const active = (selected.tags || []).includes(t.key);
                        return (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => handleToggleTag(t.key)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left hover:bg-gray-50 ${active ? 'font-bold text-gray-900' : 'text-gray-600'}`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.dot}`} />
                            <span className="flex-1">{t.label}</span>
                            {active && <span className="text-indigo-600">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <Link2 className="w-3.5 h-3.5 text-gray-400" />
              <input
                value={linkPhone}
                onChange={(e) => setLinkPhone(e.target.value)}
                placeholder="Liên kết SĐT khách"
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-36"
              />
              <button
                type="button"
                onClick={handleLink}
                disabled={linking}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                Lưu
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">
              {messagesLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
              ) : (
                messages.map((m, i) => {
                  const isOut = m.direction === 'out';
                  const prev = messages[i - 1];
                  const isNewGroup = !prev || prev.direction !== m.direction;
                  return (
                    <div key={m.id} className={`flex items-end gap-2 ${isOut ? 'justify-end' : 'justify-start'} ${isNewGroup ? 'mt-3' : 'mt-0.5'}`}>
                      {!isOut && (
                        <div className={`w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 ${isNewGroup ? '' : 'invisible'}`}>
                          {initialOf(selected.customerName)}
                        </div>
                      )}
                      <div className="max-w-[72%]">
                        {isNewGroup && (
                          <p className={`text-[11px] font-semibold mb-0.5 px-1 ${isOut ? 'text-right text-indigo-500' : 'text-slate-500'}`}>
                            {isOut ? (m.staffName || 'CSKH FitBlend') : selected.customerName}
                          </p>
                        )}
                        <div
                          className={`px-3 py-2 rounded-2xl text-sm shadow-sm ${
                            isOut
                              ? 'bg-indigo-600 text-white rounded-br-sm'
                              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                          }`}
                        >
                          {(m.attachments || []).map((url, ai) => (
                            <img
                              key={ai}
                              src={url}
                              alt="Hình ảnh"
                              className="rounded-lg max-w-full max-h-64 mb-1 cursor-pointer"
                              onClick={() => window.open(url, '_blank')}
                            />
                          ))}
                          {m.text}
                          <p className={`text-[10px] mt-1 ${isOut ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-gray-100 p-3">
              {pendingImage && (
                <div className="mb-2 relative inline-block">
                  <img src={pendingImage.previewUrl} alt="Ảnh sắp gửi" className="h-20 rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
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
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="shrink-0 p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-50"
                  title="Gửi ảnh"
                >
                  {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setSavedRepliesOpen(true)}
                  className="shrink-0 p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300"
                  title="Tin trả lời lưu sẵn"
                >
                  <MessageSquareText className="w-4 h-4" />
                </button>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Nhập tin nhắn trả lời khách..."
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || (!draft.trim() && !pendingImage)}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-semibold text-sm"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Gửi
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {savedRepliesOpen && (
        <SavedRepliesPanel
          staffName={staffName}
          onClose={() => setSavedRepliesOpen(false)}
          onPick={handlePickSavedReply}
        />
      )}
    </div>
  );
}
