import { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, MoreHorizontal, Loader2, ImagePlus, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import * as api from '../../utils/api';
import type { SavedReply } from '../../utils/api';

type SortMode = 'usage' | 'recent';

interface Props {
  staffName: string;
  onClose: () => void;
  onPick: (reply: SavedReply) => void;
}

interface EditingReply {
  id: string;
  title: string;
  message: string;
  imageUrl: string;
}

function emptyEditing(): EditingReply {
  return { id: '', title: '', message: '', imageUrl: '' };
}

/** Thư viện tin nhắn mẫu dùng chung cho CSKH — mô phỏng "Tin trả lời lưu sẵn" của Facebook
 * Messenger: tìm kiếm, sắp xếp theo tần suất dùng, chèn nhanh vào ô soạn tin. */
export function SavedRepliesPanel({ staffName, onClose, onPick }: Props) {
  const [replies, setReplies] = useState<SavedReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('usage');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const [editing, setEditing] = useState<EditingReply>(emptyEditing());
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    api.fetchSavedReplies().then(setReplies).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = replies
    .filter(
      (r) =>
        !search.trim() ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.message.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sortMode === 'usage'
        ? b.usageCount - a.usageCount
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const startCreate = () => {
    setEditing(emptyEditing());
    setMode('edit');
  };

  const startEdit = (r: SavedReply) => {
    setEditing({ id: r.id, title: r.title, message: r.message, imageUrl: r.imageUrl });
    setMode('edit');
    setMenuOpenId(null);
  };

  const handleDelete = async (r: SavedReply) => {
    setMenuOpenId(null);
    if (!confirm(`Xóa tin mẫu "${r.title}"? Không thể hoàn tác.`)) return;
    await api.deleteSavedReply(r.id);
    setReplies((prev) => prev.filter((x) => x.id !== r.id));
  };

  const handlePickImage = async (file: File) => {
    setUploadingImage(true);
    try {
      const url = await api.uploadImage(file);
      setEditing((prev) => ({ ...prev, imageUrl: url }));
    } catch {
      alert('Tải ảnh lên thất bại');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!editing.title.trim() || !editing.message.trim()) {
      alert('Vui lòng nhập tiêu đề và nội dung tin nhắn.');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        const updated = await api.updateSavedReply(editing.id, {
          title: editing.title,
          message: editing.message,
          imageUrl: editing.imageUrl,
        });
        setReplies((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
      } else {
        const created = await api.createSavedReply({
          title: editing.title,
          message: editing.message,
          imageUrl: editing.imageUrl,
          createdBy: staffName,
        });
        setReplies((prev) => [created, ...prev]);
      }
      setMode('list');
    } finally {
      setSaving(false);
    }
  };

  const handlePick = (r: SavedReply) => {
    api.useSavedReply(r.id);
    setReplies((prev) => prev.map((x) => (x.id === r.id ? { ...x, usageCount: x.usageCount + 1 } : x)));
    onPick(r);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {mode === 'list' ? (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">Tin trả lời lưu sẵn</h3>
              <div className="flex items-center gap-3">
                <button type="button" onClick={startCreate} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
                  + Thêm mới
                </button>
                <button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
            </div>

            <div className="px-4 pt-3 pb-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg"
                />
              </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setSortMenuOpen((v) => !v)}
                  className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-2.5 py-2 hover:bg-gray-50"
                >
                  {sortMode === 'usage' ? 'Thường xuyên được sử dụng' : 'Mới nhất'}
                </button>
                {sortMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-48 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => { setSortMode('usage'); setSortMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${sortMode === 'usage' ? 'font-bold text-indigo-600' : 'text-gray-600'}`}
                      >
                        Thường xuyên được sử dụng
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSortMode('recent'); setSortMenuOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${sortMode === 'recent' ? 'font-bold text-indigo-600' : 'text-gray-600'}`}
                      >
                        Mới nhất
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10 px-4">
                  {replies.length === 0 ? 'Chưa có tin trả lời lưu sẵn nào — bấm "+ Thêm mới" để tạo.' : 'Không tìm thấy tin phù hợp.'}
                </p>
              ) : (
                filtered.map((r) => (
                  <div key={r.id} className="relative flex items-start gap-2.5 px-2 py-2.5 rounded-xl hover:bg-gray-50 group">
                    <button type="button" onClick={() => handlePick(r)} className="flex items-start gap-2.5 flex-1 min-w-0 text-left">
                      {r.imageUrl ? (
                        <img src={r.imageUrl} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0 border border-gray-200" />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-gray-800 truncate">{r.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{r.message}</p>
                      </div>
                    </button>
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setMenuOpenId(menuOpenId === r.id ? null : r.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuOpenId === r.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-32 overflow-hidden">
                            <button type="button" onClick={() => startEdit(r)} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                              Sửa
                            </button>
                            <button type="button" onClick={() => handleDelete(r)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                              Xóa
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-5 py-4 border-b">
              <button type="button" onClick={() => setMode('list')}><ArrowLeft className="w-5 h-5 text-gray-500" /></button>
              <h3 className="text-lg font-bold text-gray-800">{editing.id ? 'Sửa tin mẫu' : 'Tạo tin mẫu mới'}</h3>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs text-gray-500 font-semibold">Tiêu đề *</label>
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="VD: Menu, Khuyến mãi Võ Oanh..."
                  className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Nội dung tin nhắn *</label>
                <textarea
                  value={editing.message}
                  onChange={(e) => setEditing({ ...editing, message: e.target.value })}
                  placeholder="Nội dung sẽ chèn vào ô soạn tin khi chọn..."
                  rows={5}
                  className="w-full mt-0.5 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold">Hình ảnh (tùy chọn)</label>
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
                {editing.imageUrl ? (
                  <div className="mt-1 relative inline-block">
                    <img src={editing.imageUrl} alt="" className="h-20 rounded-lg border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, imageUrl: '' })}
                      className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-2 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50"
                  >
                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                    Thêm ảnh
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t">
              <button type="button" onClick={() => setMode('list')} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold">
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-semibold"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Lưu tin mẫu
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
