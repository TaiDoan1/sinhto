import { Camera, MapPin, Check } from 'lucide-react';
import { useState } from 'react';

export function AttendanceModule() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const handleCheckIn = () => {
    setShowCamera(true);
  };

  const handleCapture = () => {
    setIsCheckedIn(true);
    setShowCamera(false);
  };

  return (
    <div className="p-4 max-w-md mx-auto pb-20">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{new Date().toLocaleTimeString()}</div>
          <div className="text-gray-600">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>

        {!isCheckedIn && !showCamera && (
          <button
            onClick={handleCheckIn}
            className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg py-4 text-xl font-semibold transition-colors"
          >
            Điểm Danh
          </button>
        )}

        {showCamera && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg aspect-[3/4] flex items-center justify-center relative overflow-hidden">
              <Camera className="w-16 h-16 text-gray-400" />
              <div className="absolute inset-0 border-4 border-green-500 opacity-50"></div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-green-500" />
              <span>Vị trí đã xác nhận (trong bán kính 100m)</span>
            </div>

            <button
              onClick={handleCapture}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-3 font-semibold transition-colors"
            >
              Chụp Ảnh & Điểm Danh
            </button>
          </div>
        )}

        {isCheckedIn && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-white" />
            </div>
            <p className="text-xl font-semibold text-green-600">Điểm Danh Thành Công!</p>
            <p className="text-gray-600 mt-2">Chúc bạn có ca làm việc tốt!</p>
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Lịch Làm Việc Hôm Nay</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Bắt đầu ca:</span>
            <span className="font-semibold">8:00 Sáng</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Kết thúc ca:</span>
            <span className="font-semibold">5:00 Chiều</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Giờ nghỉ:</span>
            <span className="font-semibold">12:00 - 1:00 Trưa</span>
          </div>
        </div>
      </div>
    </div>
  );
}
