/**
 * In trực tiếp qua USB (WebUSB) — bỏ qua window.print()/cửa sổ in hoàn toàn.
 * Trình duyệt phải là Chrome/Edge (WebUSB không có trên Safari/Firefox).
 * Cấp quyền 1 lần (connectPrinter), các lần sau tự kết nối lại (getRememberedPrinter).
 */

export type PrinterRole = 'receipt' | 'label';

const ROLE_LABELS: Record<PrinterRole, string> = {
  receipt: 'Máy in bill (iTP76)',
  label: 'Máy in tem (iTP3350)',
};

function storageKey(role: PrinterRole) {
  return `usbPrinterDevice:${role}`;
}

interface RememberedDevice {
  vendorId: number;
  productId: number;
  serialNumber?: string;
}

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

export function roleLabel(role: PrinterRole): string {
  return ROLE_LABELS[role];
}

function rememberDevice(role: PrinterRole, device: USBDevice) {
  const info: RememberedDevice = {
    vendorId: device.vendorId,
    productId: device.productId,
    serialNumber: device.serialNumber,
  };
  localStorage.setItem(storageKey(role), JSON.stringify(info));
}

function getRememberedInfo(role: PrinterRole): RememberedDevice | null {
  try {
    const raw = localStorage.getItem(storageKey(role));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Hiện hộp thoại chọn thiết bị USB — gọi khi người dùng bấm "Kết nối máy in" (cần 1 lần mỗi máy). */
export async function connectPrinter(role: PrinterRole): Promise<USBDevice> {
  if (!isWebUsbSupported()) {
    throw new Error('Trình duyệt này không hỗ trợ WebUSB. Dùng Chrome hoặc Edge.');
  }
  const device = await navigator.usb.requestDevice({ filters: [] });
  rememberDevice(role, device);
  return device;
}

/** Tự động lấy lại máy in đã cấp quyền trước đó, không hiện hộp thoại. Trả về null nếu chưa từng kết nối. */
export async function getRememberedPrinter(role: PrinterRole): Promise<USBDevice | null> {
  if (!isWebUsbSupported()) return null;
  const info = getRememberedInfo(role);
  if (!info) return null;
  const devices = await navigator.usb.getDevices();
  return (
    devices.find(
      (d) =>
        d.vendorId === info.vendorId &&
        d.productId === info.productId &&
        (!info.serialNumber || d.serialNumber === info.serialNumber)
    ) || null
  );
}

export function forgetPrinter(role: PrinterRole) {
  localStorage.removeItem(storageKey(role));
}

function findOutEndpoint(device: USBDevice): { interfaceNumber: number; endpointNumber: number } | null {
  const config = device.configuration;
  if (!config) return null;
  for (const iface of config.interfaces) {
    for (const alt of iface.alternates) {
      const ep = alt.endpoints.find((e) => e.direction === 'out' && e.type === 'bulk');
      if (ep) return { interfaceNumber: iface.interfaceNumber, endpointNumber: ep.endpointNumber };
    }
  }
  return null;
}

/** Gửi thẳng dữ liệu (lệnh ESC/POS) xuống máy in qua USB. */
export async function sendToPrinter(device: USBDevice, data: Uint8Array): Promise<void> {
  await device.open();
  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }
  const endpoint = findOutEndpoint(device);
  if (!endpoint) {
    await device.close();
    throw new Error('Không tìm thấy cổng ghi dữ liệu (OUT endpoint) trên máy in.');
  }
  await device.claimInterface(endpoint.interfaceNumber);
  try {
    await device.transferOut(endpoint.endpointNumber, data);
  } finally {
    await device.releaseInterface(endpoint.interfaceNumber).catch(() => {});
    await device.close().catch(() => {});
  }
}
