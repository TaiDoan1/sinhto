import { useOnlineSales } from '../../contexts/OnlineSalesContext';
import { OnlineSalesLogin } from './OnlineSalesLogin';
import { OnlineSalesPortal } from './OnlineSalesPortal';
import { Loader2 } from 'lucide-react';

export function OnlineSalesApp() {
  const { isLoggedIn, isLoading } = useOnlineSales();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {!isLoggedIn ? <OnlineSalesLogin /> : <OnlineSalesPortal />}
    </div>
  );
}
