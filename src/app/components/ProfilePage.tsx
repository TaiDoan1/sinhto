import { User, Clock, Package, Award } from 'lucide-react';

export function ProfilePage() {
  return (
    <div className="p-4 max-w-md mx-auto pb-20">
      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            <div className="text-xl font-semibold">Nguyễn Văn An</div>
            <div className="text-gray-600">Nhân Viên</div>
            <div className="text-sm text-gray-500">ID: NV-12345</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h3 className="font-semibold mb-3">Hiệu Suất Hôm Nay</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <Package className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
            <div className="text-2xl font-bold text-emerald-700">24</div>
            <div className="text-sm text-gray-600">Đơn Hàng</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Clock className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold text-green-600">8.5h</div>
            <div className="text-sm text-gray-600">Giờ Làm</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h3 className="font-semibold mb-3">Thành Tích</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
            <Award className="w-8 h-8 text-yellow-500" />
            <div>
              <div className="font-semibold">Cao Thủ Tốc Độ</div>
              <div className="text-sm text-gray-600">Hoàn thành 100+ đơn trong tháng</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
            <Award className="w-8 h-8 text-emerald-500" />
            <div>
              <div className="font-semibold">Điểm Danh Hoàn Hảo</div>
              <div className="text-sm text-gray-600">Không nghỉ ca nào trong tuần</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="font-semibold mb-3">Thao Tác Nhanh</h3>
        <div className="space-y-2">
          <button className="w-full text-left py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors">
            Xem Thống Kê Đầy Đủ
          </button>
          <button className="w-full text-left py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors">
            Lịch Sử Ca Làm
          </button>
          <button className="w-full text-left py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors">
            Cài Đặt
          </button>
          <button className="w-full text-left py-3 px-4 hover:bg-gray-50 rounded-lg text-red-600 transition-colors">
            Đăng Xuất
          </button>
        </div>
      </div>
    </div>
  );
}
