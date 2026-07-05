import { useState, useEffect } from 'react';
import { Store, User, Lock, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { usePos } from '../../contexts/PosContext';
import { fetchBranches } from '../../utils/api';

interface BranchOption {
  id: string;
  name: string;
}

function DeviceBranchSetup() {
  const { setDeviceBranchId } = usePos();
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBranches(true)
      .then((data: BranchOption[]) => setBranches(data))
      .catch(() => setError('Không tải được danh sách chi nhánh'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-screen bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-emerald-700" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Thiết lập máy POS</h1>
          <p className="text-gray-500 text-sm mt-1">Chọn chi nhánh cho máy này (chỉ hỏi 1 lần)</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
          </div>
        ) : (
          <div className="space-y-3">
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 font-semibold transition ${
                  selected === b.id
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                {b.name}
              </button>
            ))}
            <button
              type="button"
              disabled={!selected}
              onClick={() => setDeviceBranchId(selected)}
              className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white py-3.5 rounded-xl font-bold mt-2"
            >
              Xác nhận chi nhánh cho máy này
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PosLogin() {
  const { login, deviceBranchId, clearDeviceBranch } = usePos();
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

  if (!deviceBranchId) {
    return <DeviceBranchSetup />;
  }

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
          <p className="font-bold">Máy này chỉ đăng nhập được tài khoản của chi nhánh đã gán</p>
          <p>Nhân viên chi nhánh khác sẽ không đăng nhập được.</p>
        </div>

        <button
          type="button"
          onClick={clearDeviceBranch}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-4 underline"
        >
          Đổi chi nhánh cho máy này
        </button>
      </div>
    </div>
  );
}
