import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Link2, Loader2, Search, RefreshCw } from 'lucide-react';
import * as api from '../../utils/api';
import type { FbConversation, FbMessage } from '../../utils/api';
import { useSSE } from '../../contexts/SSEContext';

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
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const selected = conversations.find((c) => c.id === selectedId) || null;

  const handleSend = async () => {
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    try {
      await api.sendFbReply(selectedId, draft.trim(), staffId, staffName);
      setDraft('');
    } catch (e: any) {
      alert(e.message || 'Gửi tin nhắn thất bại');
    } finally {
      setSending(false);
    }
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
    <div className="bg-white rounded-2xl shadow overflow-hidden grid grid-cols-1 md:grid-cols-[300px_1fr] h-[calc(100vh-220px)] min-h-[420px]">
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
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedId === c.id ? 'bg-indigo-50' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-gray-800 truncate">{c.customerName}</p>
                  {c.unreadCount > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0">{c.unreadCount}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {c.lastDirection === 'out' ? 'Bạn: ' : ''}{c.lastMessageText}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(c.lastMessageAt)}</p>
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
            <div className="p-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-800 mr-auto">{selected.customerName}</p>
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

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
              {messagesLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        m.direction === 'out' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      {m.text}
                      <p className={`text-[10px] mt-1 ${m.direction === 'out' ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t border-gray-100 flex items-center gap-2">
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
                disabled={sending || !draft.trim()}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-semibold text-sm"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Gửi
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
