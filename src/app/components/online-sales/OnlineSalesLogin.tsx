import { useState } from 'react';
import { LogIn, ShoppingBag, Lock, Loader2, AlertCircle, Globe, CheckCircle2 } from 'lucide-react';
import { useOnlineSales } from '../../contexts/OnlineSalesContext';

const FEATURES = [
  'Chốt đơn combo khách đặt online',
  'Theo dõi lộ trình & trạng thái giao hàng',
  'Quản lý danh sách khách được phân bổ',
];

export function OnlineSalesLogin() {
  const { login } = useOnlineSales();
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-indigo-900 via-violet-800 to-indigo-700">
      {/* Branding — desktop */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-center px-12 xl:px-20 py-12 text-white">
        <div className="max-w-lg">
          <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" /> FitBlend Online Sales
          </p>
          <h1 className="text-4xl xl:text-5xl font-black leading-tight mb-4">Bán Hàng Online</h1>
          <p className="text-indigo-100/90 text-lg leading-relaxed mb-8">
            Cổng làm việc dành cho nhân viên chăm sóc khách hàng online — chốt đơn, theo dõi combo và liên hệ khách trên web.
          </p>
          <ul className="space-y-3">
            {FEATURES.map((item) => (
              <li key={item} className="flex items-center gap-3 text-indigo-100">
                <CheckCircle2 className="w-5 h-5 text-indigo-300 shrink-0" />
                <span className="text-sm font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 lg:py-12 lg:px-10 lg:bg-slate-50 lg:max-w-xl xl:max-w-2xl">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:mb-10">
            <div className="lg:hidden w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-200">
              <ShoppingBag className="w-8 h-8 text-indigo-700" />
            </div>
            <p className="lg:hidden text-indigo-600 text-xs font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> FitBlend Online
            </p>
            <h2 className="text-2xl lg:text-3xl font-black text-gray-900 lg:text-left">Đăng nhập</h2>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed lg:text-left">
              Nhập tài khoản được Admin cấp trong mục Nhân Sự
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl lg:shadow-md border border-gray-100 p-5 lg:p-8 space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên đăng nhập</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="username"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              Đăng Nhập
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
