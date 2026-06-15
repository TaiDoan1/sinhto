// API Client utility for fetching and communicating with Express backend

const BASE_URL = '/api';

export async function fetchOrders() {
  const res = await fetch(`${BASE_URL}/orders`);
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

export async function fetchInventory() {
  const res = await fetch(`${BASE_URL}/inventory`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export async function fetchMovements() {
  const res = await fetch(`${BASE_URL}/inventory/movements`);
  if (!res.ok) throw new Error('Failed to fetch movements');
  return res.json();
}

export async function updateInventory(items: any[], movements: any[]) {
  const res = await fetch(`${BASE_URL}/inventory/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, movements })
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

export async function fetchWholesale() {
  const res = await fetch(`${BASE_URL}/wholesale`);
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
export async function fetchEmployees() {
  const res = await fetch(`${BASE_URL}/employees`);
  if (!res.ok) throw new Error('Failed to fetch employees');
  return res.json();
}

export async function saveEmployee(employee: any) {
  const isNew = !employee.id;
  const url = isNew ? `${BASE_URL}/employees` : `${BASE_URL}/employees/${employee.id}`;
  const res = await fetch(url, {
    method: isNew ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(employee)
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
export async function fetchShifts() {
  const res = await fetch(`${BASE_URL}/shifts`);
  if (!res.ok) throw new Error('Failed to fetch shifts');
  return res.json();
}

export async function saveShift(shift: any) {
  const isNew = !shift.id;
  const url = isNew ? `${BASE_URL}/shifts` : `${BASE_URL}/shifts/${shift.id}`;
  const res = await fetch(url, {
    method: isNew ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shift)
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
