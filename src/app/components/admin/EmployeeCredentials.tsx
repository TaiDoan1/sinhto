import { useState } from 'react';
import { Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';

interface EmployeeCredentialsProps {
  username: string;
  password: string;
}

export function EmployeeCredentials({ username, password }: EmployeeCredentialsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<'username' | 'password' | null>(null);

  const copyToClipboard = (text: string, type: 'username' | 'password') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="pt-3 border-t border-gray-200">
      <div className="text-xs text-gray-500 uppercase font-semibold mb-2">Tài khoản đăng nhập</div>
      <div className="bg-emerald-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Username:</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-emerald-700">{username}</span>
            <button
              onClick={() => copyToClipboard(username, 'username')}
              className="p-1 hover:bg-purple-200 rounded transition-colors"
              title="Copy username"
            >
              {copied === 'username' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Password:</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-emerald-700">
              {showPassword ? password : '••••••'}
            </span>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 hover:bg-purple-200 rounded transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-gray-500" />
              ) : (
                <Eye className="w-4 h-4 text-gray-500" />
              )}
            </button>
            <button
              onClick={() => copyToClipboard(password, 'password')}
              className="p-1 hover:bg-purple-200 rounded transition-colors"
              title="Copy password"
            >
              {copied === 'password' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
