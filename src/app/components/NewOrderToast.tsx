import { Bell, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function NewOrderToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 max-w-md mx-auto z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-emerald-600 to-red-500 text-white rounded-lg shadow-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Bell className="w-6 h-6 animate-bounce" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Đơn Hàng Mới!</div>
          <div className="text-sm opacity-90">ORD-005 từ Grab</div>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
