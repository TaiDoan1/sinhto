import { useState, useEffect } from 'react';
import { Search, Plus, MessageSquare, Phone, Edit2 } from 'lucide-react';
import * as api from '../../utils/api';

interface Customer {
  id: string;
  customerPhone: string;
  customerName: string;
  platform: 'facebook' | 'zalo' | 'web' | 'other';
  fbName?: string;
  lastContactAt?: string;
  notes?: string;
  tags?: string;
}

interface CustomerManagementProps {
  cskhId: string;
}

export function CustomerManagement({ cskhId }: CustomerManagementProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPhone, setEditingPhone] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerPhone: '',
    customerName: '',
    platform: 'facebook' as const,
    fbName: '',
    notes: '',
  });

  useEffect(() => {
    loadCustomers();
  }, [cskhId]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.fetchCareAssignments();
      const filtered = response.filter((c: any) => c.careStaffId === cskhId);
      setCustomers(filtered);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!formData.customerPhone || !formData.customerName) {
      alert('Vui lòng nhập SĐT và tên khách');
      return;
    }

    try {
      if (editingPhone) {
        // Update customer
        await api.patch(`/api/customer-care/assignments/${editingPhone}/platform`, {
          platform: formData.platform,
        });
      } else {
        // Create customer
        await api.post('/api/customer-care/assignments', {
          customerPhone: formData.customerPhone,
          customerName: formData.customerName,
          careStaffId: cskhId,
          careStaffName: 'CSKH',
          platform: formData.platform,
          fbName: formData.fbName,
          notes: formData.notes,
        });
      }

      setFormData({
        customerPhone: '',
        customerName: '',
        platform: 'facebook',
        fbName: '',
        notes: '',
      });
      setEditingPhone(null);
      setShowAddForm(false);
      loadCustomers();
    } catch (error) {
      console.error('Failed to save customer:', error);
      alert('Lưu khách hàng thất bại');
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setFormData({
      customerPhone: customer.customerPhone,
      customerName: customer.customerName,
      platform: customer.platform,
      fbName: customer.fbName || '',
      notes: customer.notes || '',
    });
    setEditingPhone(customer.customerPhone);
    setShowAddForm(true);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.customerPhone.includes(search)
  );

  const platformIcons: Record<string, JSX.Element> = {
    facebook: <MessageSquare className="w-4 h-4 text-blue-600" />,
    zalo: <MessageSquare className="w-4 h-4 text-blue-500" />,
    web: <Phone className="w-4 h-4 text-gray-600" />,
    other: <Phone className="w-4 h-4 text-gray-400" />,
  };

  const platformLabels: Record<string, string> = {
    facebook: 'Facebook',
    zalo: 'Zalo',
    web: 'Website',
    other: 'Khác',
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Đang tải...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {editingPhone ? 'Cập nhật khách hàng' : 'Thêm khách hàng'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              placeholder="Số điện thoại"
              disabled={!!editingPhone}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="Tên khách"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="facebook">Facebook</option>
              <option value="zalo">Zalo</option>
              <option value="web">Website</option>
              <option value="other">Khác</option>
            </select>
            <input
              type="text"
              value={formData.fbName}
              onChange={(e) => setFormData({ ...formData, fbName: e.target.value })}
              placeholder="Tên Facebook/Zalo"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Ghi chú"
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddCustomer}
              className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              {editingPhone ? 'Cập nhật' : 'Thêm'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingPhone(null);
                setFormData({
                  customerPhone: '',
                  customerName: '',
                  platform: 'facebook',
                  fbName: '',
                  notes: '',
                });
              }}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Search & Add Button */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc SĐT..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm
          </button>
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Chưa có khách hàng</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Tên</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">SĐT</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Platform</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Liên hệ cuối</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.customerPhone} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{customer.customerName}</td>
                    <td className="px-4 py-3 text-gray-600">{customer.customerPhone}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {platformIcons[customer.platform]}
                        <span className="text-gray-600">{platformLabels[customer.platform]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {customer.lastContactAt
                        ? new Date(customer.lastContactAt).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleEditCustomer(customer)}
                        className="text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">Tổng khách</p>
          <p className="text-3xl font-bold text-blue-600">{customers.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">Facebook</p>
          <p className="text-3xl font-bold text-emerald-600">
            {customers.filter((c) => c.platform === 'facebook').length}
          </p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">Zalo</p>
          <p className="text-3xl font-bold text-purple-600">
            {customers.filter((c) => c.platform === 'zalo').length}
          </p>
        </div>
      </div>
    </div>
  );
}
