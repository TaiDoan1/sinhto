import { useEmployee } from '../../contexts/EmployeeContext';
import { EmployeeLogin } from './EmployeeLogin';
import { EmployeePortal } from './EmployeePortal';
import { Loader2 } from 'lucide-react';

export function StaffApp() {
  const { isLoggedIn, isLoading } = useEmployee();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full mx-auto bg-gray-50 shadow-xl relative max-w-md">
      {!isLoggedIn ? <EmployeeLogin /> : <EmployeePortal />}
    </div>
  );
}
