// API Client utility for fetching and communicating with Express backend

const BASE_URL = '/api';
const DEFAULT_TIMEOUT_MS = 15000;

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Máy chủ không phản hồi. Kiểm tra backend đang chạy (port 5005).');
    }
    throw new Error('Không kết nối được máy chủ. Hãy chạy npm run dev và thử lại.');
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchOrders(params?: { branchId?: string }) {
  const qs = params?.branchId ? `?branchId=${encodeURIComponent(params.branchId)}` : '';
  const res = await fetch(`${BASE_URL}/orders${qs}`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function createOrder(orderData: any) {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  if (!res.ok) throw new Error('Failed to create order');
  return res.json();
}

export async function updateOrderStatus(orderId: string, status: string, extra?: any) {
  const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...extra })
  });
  if (!res.ok) throw new Error('Failed to update order status');
  return res.json();
}

export async function fetchInventory(branchId?: string) {
  const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
  const res = await fetch(`${BASE_URL}/inventory${qs}`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export async function fetchMovements(branchId?: string) {
  const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
  const res = await fetch(`${BASE_URL}/inventory/movements${qs}`);
  if (!res.ok) throw new Error('Failed to fetch movements');
  return res.json();
}

export async function updateInventory(items: any[], movements: any[], branchId: string) {
  const res = await fetch(`${BASE_URL}/inventory/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, movements, branchId })
  });
  if (!res.ok) throw new Error('Failed to update inventory');
  return res.json();
}

export async function createInventoryItem(itemData: any) {
  const res = await fetch(`${BASE_URL}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData)
  });
  if (!res.ok) throw new Error('Failed to create inventory item');
  return res.json();
}

export async function fetchWholesale(branchId?: string) {
  const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
  const res = await fetch(`${BASE_URL}/wholesale${qs}`);
  if (!res.ok) throw new Error('Failed to fetch wholesale accounts');
  return res.json();
}

export async function createWholesale(account: any) {
  const res = await fetch(`${BASE_URL}/wholesale`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account)
  });
  if (!res.ok) throw new Error('Failed to create wholesale account');
  return res.json();
}

export async function updateWholesale(id: string, remainingCups: number, redemptions: any[]) {
  const res = await fetch(`${BASE_URL}/wholesale/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remainingCups, redemptions })
  });
  if (!res.ok) throw new Error('Failed to update wholesale account');
  return res.json();
}

export async function fetchPartners() {
  const res = await fetch(`${BASE_URL}/affiliates/partners`);
  if (!res.ok) throw new Error('Failed to fetch partners');
  return res.json();
}

export async function createPartner(partner: any) {
  const res = await fetch(`${BASE_URL}/affiliates/partners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partner)
  });
  if (!res.ok) throw new Error('Failed to create partner');
  return res.json();
}

export async function payPartnerCommission(id: string, amount: number) {
  const res = await fetch(`${BASE_URL}/affiliates/partners/${id}/pay`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });
  if (!res.ok) throw new Error('Failed to record payment');
  return res.json();
}

export async function fetchReferrals() {
  const res = await fetch(`${BASE_URL}/affiliates/referrals`);
  if (!res.ok) throw new Error('Failed to fetch referrals');
  return res.json();
}

export async function createReferral(referral: any) {
  const res = await fetch(`${BASE_URL}/affiliates/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(referral)
  });
  if (!res.ok) throw new Error('Failed to create referral');
  return res.json();
}

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload image');
  const data = await res.json();
  return data.imageUrl; // returns `/uploads/filename`
}

// --- PRODUCTS ---
export async function fetchProducts() {
  const res = await fetch(`${BASE_URL}/products`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function saveProduct(product: any) {
  const isNew = !product.id || product.id.startsWith('NEW-');
  const url = isNew ? `${BASE_URL}/products` : `${BASE_URL}/products/${product.id}`;
  const res = await fetch(url, {
    method: isNew ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!res.ok) throw new Error('Failed to save product');
  return res.json();
}

export async function deleteProduct(id: string) {
  const res = await fetch(`${BASE_URL}/products/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete product');
  return res.json();
}

// --- EMPLOYEES ---
export async function employeeLogin(username: string, password: string) {
  const res = await fetchWithTimeout(`${BASE_URL}/auth/employee-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Đăng nhập thất bại');
  }
  return res.json();
}

export async function fetchEmployees() {
  const res = await fetch(`${BASE_URL}/employees`);
  if (!res.ok) throw new Error('Failed to fetch employees');
  return res.json();
}

export async function saveEmployee(employee: any) {
  if (employee.id) {
    const putRes = await fetch(`${BASE_URL}/employees/${employee.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee),
    });
    if (putRes.ok) return putRes.json();
    if (putRes.status !== 404) throw new Error('Failed to save employee');
  }
  const { id: _id, ...payload } = employee;
  const res = await fetch(`${BASE_URL}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save employee');
  return res.json();
}

export async function deleteEmployee(id: string) {
  const res = await fetch(`${BASE_URL}/employees/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete employee');
  return res.json();
}

// --- SHIFTS ---
export async function fetchShifts(params?: { employeeId?: string; status?: string; branch?: string; date?: string }) {
  const qs = new URLSearchParams();
  if (params?.employeeId) qs.set('employeeId', params.employeeId);
  if (params?.status) qs.set('status', params.status);
  if (params?.branch) qs.set('branch', params.branch);
  if (params?.date) qs.set('date', params.date);
  const query = qs.toString();
  const res = await fetch(`${BASE_URL}/shifts${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch shifts');
  return res.json();
}

export async function shiftCheckIn(shiftId: string, action: 'in' | 'out', photo?: string) {
  const res = await fetch(`${BASE_URL}/shifts/${shiftId}/checkin`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, photo }),
  });
  if (!res.ok) throw new Error('Chấm công thất bại');
  return res.json();
}

export async function saveShift(shift: any) {
  if (shift.id) {
    const putRes = await fetch(`${BASE_URL}/shifts/${shift.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shift),
    });
    if (putRes.ok) return putRes.json();
    if (putRes.status !== 404) throw new Error('Failed to save shift');
  }
  const { id: _id, ...payload } = shift;
  const res = await fetch(`${BASE_URL}/shifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save shift');
  return res.json();
}

export async function deleteShift(id: string) {
  const res = await fetch(`${BASE_URL}/shifts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete shift');
  return res.json();
}

// --- SETTINGS ---
export async function fetchSetting(key: string) {
  const res = await fetch(`${BASE_URL}/settings/${key}`);
  if (!res.ok) throw new Error(`Failed to fetch setting ${key}`);
  return res.json();
}

export async function saveSetting(key: string, value: any) {
  const res = await fetch(`${BASE_URL}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value })
  });
  if (!res.ok) throw new Error(`Failed to save setting ${key}`);
  return res.json();
}

// --- CUSTOMER LOYALTY ---
export async function fetchCustomers() {
  const res = await fetch(`${BASE_URL}/customers`);
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
}

export async function fetchCustomerByPhone(phone: string) {
  const res = await fetch(`${BASE_URL}/customers/${phone}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch customer');
  return res.json();
}

export async function createCustomer(data: { name: string; phone: string }) {
  const res = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create customer');
  return res.json();
}

export async function updateCustomer(id: string, data: { name?: string; phone?: string; points?: number }) {
  const res = await fetch(`${BASE_URL}/customers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update customer');
  return res.json();
}

export async function earnPoints(id: string, points: number) {
  const res = await fetch(`${BASE_URL}/customers/${id}/earn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points })
  });
  if (!res.ok) throw new Error('Failed to earn points');
  return res.json();
}

export async function redeemPoints(id: string, points: number) {
  const res = await fetch(`${BASE_URL}/customers/${id}/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points })
  });
  if (!res.ok) throw new Error('Failed to redeem points');
  return res.json();
}

async function parseApiError(res: Response, fallback: string): Promise<never> {
  const text = await res.text();
  let message = fallback;
  try {
    const data = JSON.parse(text);
    if (data?.error) message = data.error;
  } catch {
    if (res.status === 404) {
      message = 'API chưa sẵn sàng — hãy restart backend (npm run dev)';
    }
  }
  throw new Error(message);
}

// --- LOYALTY VOUCHERS ---
export async function fetchLoyaltyVouchers(params?: {
  phone?: string;
  customerId?: string;
  programId?: string;
  status?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.phone) qs.set('phone', params.phone);
  if (params?.customerId) qs.set('customerId', params.customerId);
  if (params?.programId) qs.set('programId', params.programId);
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString();
  const res = await fetch(`${BASE_URL}/loyalty-vouchers${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch vouchers');
  return res.json();
}

export async function lookupLoyaltyVoucher(code: string) {
  const normalized = code.toUpperCase().trim();
  const res = await fetch(`${BASE_URL}/loyalty-vouchers/lookup/${encodeURIComponent(normalized)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Mã voucher không hợp lệ');
  }
  return res.json();
}

export async function issueLoyaltyVoucher(data: {
  programId: string;
  phone?: string;
  customerId?: string;
  deductPoints?: boolean;
}) {
  const res = await fetch(`${BASE_URL}/loyalty-vouchers/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await parseApiError(res, 'Cấp mã thất bại');
  return res.json();
}

export async function issueLoyaltyVouchersBulk(data: {
  programId: string;
  phones: string[];
  deductPoints?: boolean;
}) {
  const res = await fetch(`${BASE_URL}/loyalty-vouchers/issue-bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await parseApiError(res, 'Cấp mã hàng loạt thất bại');
  return res.json();
}

export async function useLoyaltyVoucher(code: string) {
  const res = await fetch(`${BASE_URL}/loyalty-vouchers/use`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) await parseApiError(res, 'Sử dụng mã thất bại');
  return res.json();
}

export async function cancelLoyaltyVoucher(id: string, refundPoints = true) {
  const res = await fetch(`${BASE_URL}/loyalty-vouchers/${id}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refundPoints }),
  });
  if (!res.ok) await parseApiError(res, 'Hủy mã thất bại');
  return res.json();
}

// --- Combo Subscriptions & Customer Care ---

export async function fetchComboSubscriptions(params?: {
  careStaffId?: string;
  status?: string;
  customerPhone?: string;
  branchId?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.careStaffId) qs.set('careStaffId', params.careStaffId);
  if (params?.status) qs.set('status', params.status);
  if (params?.customerPhone) qs.set('customerPhone', params.customerPhone);
  if (params?.branchId) qs.set('branchId', params.branchId);
  const query = qs.toString();
  const res = await fetch(`${BASE_URL}/combo-subscriptions${query ? `?${query}` : ''}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error('Failed to fetch combo subscriptions');
  return res.json();
}

export async function createComboSubscription(data: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/combo-subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create combo subscription');
  return res.json();
}

export async function updateComboSubscription(id: string, updates: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/combo-subscriptions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update combo subscription');
  return res.json();
}

export async function claimComboSubscription(id: string, employeeId: string, employeeName: string) {
  const res = await fetch(`${BASE_URL}/combo-subscriptions/${id}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, employeeName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to claim combo');
  }
  return res.json();
}

export async function fetchDeliveryLogs(params?: {
  branchId?: string;
  date?: string;
  comboOrderId?: string;
  status?: string;
  careStaffId?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.branchId) qs.set('branchId', params.branchId);
  if (params?.date) qs.set('date', params.date);
  if (params?.comboOrderId) qs.set('comboOrderId', params.comboOrderId);
  if (params?.status) qs.set('status', params.status);
  if (params?.careStaffId) qs.set('careStaffId', params.careStaffId);
  const query = qs.toString();
  const res = await fetch(`${BASE_URL}/delivery-logs${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch delivery logs');
  return res.json();
}

export async function deliverDeliveryLog(
  id: string,
  body: { performedBy: string; branchId?: string; flavorNote?: string; inventoryDeducted?: boolean }
) {
  const res = await fetch(`${BASE_URL}/delivery-logs/${id}/deliver`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to confirm delivery');
  }
  return res.json();
}

export async function postponeDeliveryLog(id: string, body?: { note?: string }) {
  const res = await fetch(`${BASE_URL}/delivery-logs/${id}/postpone`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to postpone delivery');
  }
  return res.json();
}

export async function changeDeliveryLogBranch(id: string, branchId: string) {
  const res = await fetch(`${BASE_URL}/delivery-logs/${id}/branch`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branchId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to change branch');
  }
  return res.json();
}

export async function transferComboSales(body: {
  comboIds: string[];
  toSalesId: string;
  toSalesName: string;
  transferredBy?: string;
  note?: string;
}) {
  const res = await fetch(`${BASE_URL}/combo-subscriptions/transfer-sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to transfer combos');
  }
  return res.json();
}

export async function updateComboCommission(
  id: string,
  body: { commissionStatus: string; commissionAmount?: number }
) {
  const res = await fetch(`${BASE_URL}/combo-subscriptions/${id}/commission`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update commission');
  return res.json();
}

export async function fetchCareAssignments(careStaffId?: string) {
  const qs = careStaffId ? `?careStaffId=${encodeURIComponent(careStaffId)}` : '';
  const res = await fetch(`${BASE_URL}/customer-care/assignments${qs}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error('Failed to fetch care assignments');
  return res.json();
}

export async function assignCustomerCare(data: {
  customerPhone: string;
  customerName: string;
  careStaffId: string;
  careStaffName: string;
  assignedBy?: string;
  notes?: string;
}) {
  const res = await fetch(`${BASE_URL}/customer-care/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to assign customer');
  return res.json();
}

export async function transferCustomerCare(
  phone: string,
  data: { careStaffId: string; careStaffName: string; assignedBy?: string; notes?: string; customerName?: string }
) {
  const res = await fetch(`${BASE_URL}/customer-care/assignments/${encodeURIComponent(phone)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to transfer customer');
  return res.json();
}

// --- Online Sales / CSKH ---

export async function fetchOnlineSalesDashboard(careStaffId: string) {
  const res = await fetchWithTimeout(`${BASE_URL}/online-sales/dashboard?careStaffId=${encodeURIComponent(careStaffId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

export async function fetchSalesTasks(careStaffId: string) {
  const res = await fetchWithTimeout(`${BASE_URL}/online-sales/tasks?careStaffId=${encodeURIComponent(careStaffId)}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function fetchSalesLeads(careStaffId?: string) {
  const qs = careStaffId ? `?careStaffId=${encodeURIComponent(careStaffId)}` : '';
  const res = await fetch(`${BASE_URL}/online-sales/leads${qs}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error('Failed to fetch leads');
  return res.json();
}

export async function createSalesLead(data: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/online-sales/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create lead');
  }
  return res.json();
}

export async function updateSalesLead(id: string, data: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/online-sales/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update lead');
  return res.json();
}

export async function fetchSalesActivities(params?: { careStaffId?: string; customerPhone?: string; leadId?: string }) {
  const qs = new URLSearchParams();
  if (params?.careStaffId) qs.set('careStaffId', params.careStaffId);
  if (params?.customerPhone) qs.set('customerPhone', params.customerPhone);
  if (params?.leadId) qs.set('leadId', params.leadId);
  const query = qs.toString();
  const res = await fetch(`${BASE_URL}/online-sales/activities${query ? `?${query}` : ''}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error('Failed to fetch activities');
  return res.json();
}

export async function createSalesActivity(data: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/online-sales/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create activity');
  return res.json();
}

export async function patchAssignmentProfile(phone: string, data: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/customer-care/assignments/${encodeURIComponent(phone)}/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update customer profile');
  return res.json();
}

export async function fetchOnlineSalesTeamStats() {
  const res = await fetch(`${BASE_URL}/online-sales/team-stats`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error('Failed to fetch team stats');
  return res.json();
}
