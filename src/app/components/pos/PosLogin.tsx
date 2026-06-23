import { useState } from 'react';
import { Store, User, Lock, Loader2, AlertCircle } from 'lucide-react';
import { usePos } from '../../contexts/PosContext';
import { BRANCH_LABELS } from '../../types/employee';

export function PosLogin() {
  const { login } = usePos();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-emerald-700" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">FitBlend POS</h1>
          <p className="text-gray-500 text-sm mt-1">Đăng nhập tài khoản chi nhánh của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên đăng nhập</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="vd: thibinh"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Store className="w-5 h-5" />}
            Vào máy POS
          </button>
        </form>

        <div className="mt-6 p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900 space-y-1">
          <p className="font-bold">Mỗi chi nhánh = tài khoản riêng</p>
          <p>CN1: <strong>thibinh</strong> · CN2: <strong>minhcuong</strong> · CN3: <strong>thimai</strong></p>
          <p>Chỉ thấy đơn hàng & combo của {Object.values(BRANCH_LABELS).join(' / ')} tương ứng.</p>
        </div>
      </div>
    </div>
  );
}
