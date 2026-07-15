import { useEffect, useState } from 'react';
import { Printer, X, CheckCircle, Loader2 } from 'lucide-react';
import {
  connectPrinter,
  forgetPrinter,
  getRememberedPrinter,
  isWebUsbSupported,
  roleLabel,
  type PrinterRole,
} from '../../utils/webUsbPrinter';

interface PrinterSetupModalProps {
  onClose: () => void;
}

const ROLES: PrinterRole[] = ['receipt', 'label'];

export function PrinterSetupModal({ onClose }: PrinterSetupModalProps) {
  const [connected, setConnected] = useState<Record<PrinterRole, boolean>>({ receipt: false, label: false });
  const [connecting, setConnecting] = useState<PrinterRole | null>(null);
  const [error, setError] = useState('');
  const supported = isWebUsbSupported();

  const refreshStatus = async () => {
    const entries = await Promise.all(
      ROLES.map(async (role) => [role, !!(await getRememberedPrinter(role))] as const)
    );
    setConnected(Object.fromEntries(entries) as Record<PrinterRole, boolean>);
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleConnect = async (role: PrinterRole) => {
    setError('');
    setConnecting(role);
    try {
      await connectPrinter(role);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kết nối thất bại. Thử lại.');
    } finally {
      setConnecting(null);
    }
  };

  const handleForget = (role: PrinterRole) => {
    forgetPrinter(role);
    refreshStatus();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Kết nối máy in USB
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {!supported && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mt-3">
            Trình duyệt này không hỗ trợ in trực tiếp qua USB. Dùng Chrome hoặc Edge (không dùng Safari/Firefox).
          </div>
        )}

        {supported && (
          <>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Cấp quyền 1 lần cho mỗi máy in — sau đó bấm "In bill" sẽ in thẳng, không hiện cửa sổ in.
            </p>

            <div className="space-y-3">
              {ROLES.map((role) => (
                <div key={role} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">{roleLabel(role)}</div>
                      <div className="text-xs mt-0.5 flex items-center gap-1">
                        {connected[role] ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Đã kết nối
                          </span>
                        ) : (
                          <span className="text-gray-400">Chưa kết nối</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {connected[role] && (
                        <button
                          onClick={() => handleForget(role)}
                          className="text-xs text-gray-500 underline hover:text-gray-700"
                        >
                          Bỏ kết nối
                        </button>
                      )}
                      <button
                        onClick={() => handleConnect(role)}
                        disabled={connecting === role}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5"
                      >
                        {connecting === role ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Printer className="w-3.5 h-3.5" />
                        )}
                        {connected[role] ? 'Kết nối lại' : 'Kết nối'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 mt-4">
              Khi bấm "Kết nối", trình duyệt hiện danh sách thiết bị USB — chọn đúng tên máy in
              tương ứng rồi bấm "Kết nối" trên hộp thoại đó.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
