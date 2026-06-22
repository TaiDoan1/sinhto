import { useState } from 'react';
import { LogIn, User, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useEmployee } from '../../contexts/EmployeeContext';

export function EmployeeLogin() {
  const { login } = useEmployee();
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
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 pb-[env(safe-area-inset-bottom)]">
        <div className="w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Cổng Nhân Viên</h1>
            <p className="text-emerald-100 mt-1.5 text-sm leading-relaxed">
              Đăng nhập chấm công &amp; đăng ký ca làm (nhân viên cửa hàng)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-5 space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
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
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="username"
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
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 active:bg-emerald-700 disabled:opacity-60 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg min-h-[52px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              Đăng Nhập
            </button>
          </form>

          <p className="text-center text-emerald-100/70 text-xs mt-6 px-4 leading-relaxed">
            Tài khoản do quản trị viên cấp trong mục Nhân Sự
          </p>
        </div>
      </div>
    </div>
  );
}
