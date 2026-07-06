import { Clock, Calendar } from 'lucide-react';

interface CskhCheckinProps {
  session: {
    id: string;
    cskhId: string;
    cskhName: string;
    checkinTime: string;
    checkoutTime?: string;
    status: 'active' | 'completed';
    branchId?: string;
  };
}

export function CskhCheckin({ session }: CskhCheckinProps) {
  const checkinDate = new Date(session.checkinTime);
  const checkoutDate = session.checkoutTime ? new Date(session.checkoutTime) : null;

  const formatTime = (date: Date) => date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formatDate = (date: Date) => date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const calculateDuration = () => {
    if (!checkoutDate) return null;
    const ms = checkoutDate.getTime() - checkinDate.getTime();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
  };

  const duration = calculateDuration();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Thông Tin Check-in/out</h2>

        {/* Check-in Info */}
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">Check-in</h3>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Thời gian:</span> {formatTime(checkinDate)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Ngày:</span> {formatDate(checkinDate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Check-out Info */}
        {checkoutDate && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">Check-out</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Thời gian:</span> {formatTime(checkoutDate)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Ngày:</span> {formatDate(checkoutDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Duration */}
        {duration && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Thời Gian Làm Việc</h3>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{duration.hours}</div>
                <div className="text-xs text-gray-600">Giờ</div>
              </div>
              <div className="text-2xl text-gray-400">:</div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{duration.minutes}</div>
                <div className="text-xs text-gray-600">Phút</div>
              </div>
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${session.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-semibold text-gray-700">
              Trạng thái: <span className={session.status === 'active' ? 'text-emerald-600' : 'text-gray-600'}>
                {session.status === 'active' ? 'Đang hoạt động' : 'Đã kết thúc'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
