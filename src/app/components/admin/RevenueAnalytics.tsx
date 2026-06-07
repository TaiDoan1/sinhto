import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const channelData = [
  { month: 'T1', 'Tại Quầy': 15, 'Đặt Web': 8, 'Offline': 5 },
  { month: 'T2', 'Tại Quầy': 18, 'Đặt Web': 10, 'Offline': 7 },
  { month: 'T3', 'Tại Quầy': 22, 'Đặt Web': 14, 'Offline': 9 },
  { month: 'T4', 'Tại Quầy': 25, 'Đặt Web': 18, 'Offline': 11 },
  { month: 'T5', 'Tại Quầy': 28, 'Đặt Web': 22, 'Offline': 13 },
  { month: 'T6', 'Tại Quầy': 32, 'Đặt Web': 26, 'Offline': 15 },
];

const productData = [
  { month: 'T1', Smoothie: 20, Combo: 8 },
  { month: 'T2', Smoothie: 25, Combo: 10 },
  { month: 'T3', Smoothie: 30, Combo: 15 },
  { month: 'T4', Smoothie: 35, Combo: 19 },
  { month: 'T5', Smoothie: 40, Combo: 23 },
  { month: 'T6', Smoothie: 45, Combo: 28 },
];

const todayStats = [
  { channel: 'Tại Quầy', revenue: 8500000, orders: 42, percentage: 55 },
  { channel: 'Đặt Web', revenue: 5200000, orders: 28, percentage: 30 },
  { channel: 'Offline', revenue: 2300000, orders: 15, percentage: 15 },
];

export function RevenueAnalytics() {
  const totalRevenue = todayStats.reduce((sum, stat) => sum + stat.revenue, 0);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Phân Tích Doanh Thu</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {todayStats.map(stat => (
          <div key={stat.channel} className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex justify-between items-start mb-2 sm:mb-3">
              <div>
                <div className="text-xs sm:text-sm text-gray-600">Kênh {stat.channel}</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-800">
                  {(stat.revenue / 1000000).toFixed(1)}M đ
                </div>
              </div>
              <div className="bg-emerald-100 text-emerald-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold">
                {stat.percentage}%
              </div>
            </div>
            <div className="text-xs sm:text-sm text-gray-600">{stat.orders} đơn hàng</div>
            <div className="mt-2 sm:mt-3 bg-gray-200 rounded-full h-2">
              <div
                className="bg-emerald-600 h-2 rounded-full"
                style={{ width: `${stat.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Doanh Thu Theo Kênh (Triệu đồng)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={channelData}>
              <CartesianGrid key="grid" strokeDasharray="3 3" />
              <XAxis key="xaxis" dataKey="month" />
              <YAxis key="yaxis" />
              <Tooltip key="tooltip" />
              <Legend key="legend" />
              <Line
                key="line-tai-quay"
                type="monotone"
                dataKey="Tại Quầy"
                stroke="#10b981"
                strokeWidth={2}
                isAnimationActive={false}
                dot={false}
              />
              <Line
                key="line-dat-web"
                type="monotone"
                dataKey="Đặt Web"
                stroke="#3b82f6"
                strokeWidth={2}
                isAnimationActive={false}
                dot={false}
              />
              <Line
                key="line-offline"
                type="monotone"
                dataKey="Offline"
                stroke="#a855f7"
                strokeWidth={2}
                isAnimationActive={false}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Doanh Thu Theo Sản Phẩm (Triệu đồng)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productData}>
              <CartesianGrid key="grid" strokeDasharray="3 3" />
              <XAxis key="xaxis" dataKey="month" />
              <YAxis key="yaxis" />
              <Tooltip key="tooltip" />
              <Legend key="legend" />
              <Bar
                key="bar-smoothie"
                dataKey="Smoothie"
                fill="#8b5cf6"
                isAnimationActive={false}
              />
              <Bar
                key="bar-combo"
                dataKey="Combo"
                fill="#ec4899"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 sm:mt-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <div>
            <div className="text-xs sm:text-sm opacity-90">Tổng Doanh Thu Hôm Nay</div>
            <div className="text-2xl sm:text-4xl font-bold mt-1">
              {totalRevenue.toLocaleString('vi-VN')} đ
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xs sm:text-sm opacity-90">Tổng Đơn Hàng</div>
            <div className="text-2xl sm:text-4xl font-bold mt-1">
              {todayStats.reduce((sum, stat) => sum + stat.orders, 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
