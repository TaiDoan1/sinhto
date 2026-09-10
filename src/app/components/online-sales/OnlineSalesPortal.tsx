import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Phone, User, Package, LogOut, Clock, Pause, Play,
  MapPin, Loader2, Users, Search, ShoppingBag, Globe, LayoutDashboard,
  ListTodo, UserPlus, Store, TrendingUp, AlertCircle, Copy, Check, Bell, BellOff, MessageCircle, CalendarDays, Megaphone, Settings as SettingsIcon,
} from 'lucide-react';
import { useOnlineSales } from '../../contexts/OnlineSalesContext';
import { useCombos } from '../../contexts/ComboContext';
import { useInventory } from '../../contexts/InventoryContext';
import * as api from '../../utils/api';
import type { CustomerCareAssignment } from '../../types/customerCare';
import type { OnlineSalesDashboard, SalesTask, SalesLead, PipelineStage } from '../../types/onlineSales';
import type { Order } from '../../contexts/OrderContext';
import { useBranches } from '../../contexts/BranchContext';
import { PIPELINE_STAGES, buildWebLink } from './constants';
import { CustomerDetailDrawer } from './CustomerDetailDrawer';
import { RetailOrderDetailDrawer } from './RetailOrderDetailDrawer';
import { OnlineSalesOrderEntry } from './OnlineSalesOrderEntry';
import { CustomerComboHub } from '../combo/CustomerComboHub';
import { WeeklyComboSchedule } from '../combo/WeeklyComboSchedule';
import { CustomerManagement } from '../customer-management/CustomerManagement';
import { DeliveryAlerts, LEAD_SETTING_KEY, DEFAULT_LEAD } from './DeliveryAlerts';
import { CskhSettings } from './CskhSettings';
import { CskhOrderTracker } from './CskhOrderTracker';
import { SalesAnalyticsDashboard } from './SalesAnalyticsDashboard';
import { FbMessagesTab } from './FbMessagesTab';
import { BulkMessageTab } from './BulkMessageTab';
import { useSSE } from '../../contexts/SSEContext';
import { useToast } from '../../contexts/ToastContext';
import { playNotificationBeep, unlockAudio, isAudioRunning } from '../../utils/notificationSound';
import type { FbConversation, FbMessage } from '../../utils/api';

type View = 'dashboard' | 'leads' | 'sales' | 'pending' | 'orders' | 'retail' | 'combo' | 'customers' | 'schedule' | 'alerts' | 'fbMessages' | 'bulkSend' | 'settings';

const PRIORITY_COLOR = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-gray-300',
};

function CustomerRow({
  assignment,
  onClick,
}: {
  assignment: CustomerCareAssignment;
  onClick: () => void;
}) {
  const stage = PIPELINE_STAGES.find((s) => s.id === assignment.pipelineStage);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">{assignment.customerName || 'Khách hàng'}</p>
          <p className="text-sm text-indigo-700 flex items-center gap-1 mt-0.5">
            <Phone className="w-3.5 h-3.5" /> {assignment.customerPhone}
          </p>
        </div>
        {stage && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${stage.color}`}>{stage.label}</span>
        )}
      </div>
    </button>
  );
}

const EMPTY_DASHBOARD: OnlineSalesDashboard = {
  revenueMonth: 0,
  revenueWeek: 0,
  comboRevenueMonth: 0,
  retailRevenueMonth: 0,
  pendingClaims: 0,
  activeCombos: 0,
  expiringCombos: 0,
  leadCount: 0,
  retailCustomerCount: 0,
  comboCustomerCount: 0,
  conversionRate: 0,
  upsellOpportunities: 0,
};

export function OnlineSalesPortal() {
  const { activeEmployee, logout } = useOnlineSales();
  const { branchLabel } = useBranches();
  const { combos } = useCombos();
  const { loadForBranch } = useInventory();
  const { subscribe } = useSSE();
  const { showNotify } = useToast();
  const [view, setView] = useState<View>('dashboard');
  const [fbConversations, setFbConversations] = useState<FbConversation[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const [assignments, setAssignments] = useState<CustomerCareAssignment[]>([]);
  const [retailOrders, setRetailOrders] = useState<Order[]>([]);
  const [dashboard, setDashboard] = useState<OnlineSalesDashboard>(EMPTY_DASHBOARD);
  const [tasks, setTasks] = useState<SalesTask[]>([]);
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<CustomerCareAssignment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [leadForm, setLeadForm] = useState({ fbName: '', customerName: '', customerPhone: '', notes: '' });
  const [creatingLead, setCreatingLead] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [orderPrefill, setOrderPrefill] = useState<{ name?: string; phone?: string; address?: string } | undefined>();

  const employeeId = activeEmployee?.id || '';

  useEffect(() => {
    if (activeEmployee?.branch) loadForBranch(activeEmployee.branch);
  }, [activeEmployee?.branch, loadForBranch]);

  const refreshData = useCallback(async () => {
    if (!employeeId) return;
    setDataLoading(true);
    try {
      const [dash, taskList, leadList, assigns, orders] = await Promise.allSettled([
        api.fetchOnlineSalesDashboard(employeeId),
        api.fetchSalesTasks(employeeId),
        api.fetchSalesLeads(employeeId),
        api.fetchCareAssignments(employeeId),
        api.fetchOrders({ salesStaffId: employeeId }),
      ]);
      if (dash.status === 'fulfilled' && dash.value) setDashboard(dash.value);
      else if (dash.status === 'rejected') setDashboard(EMPTY_DASHBOARD);
      if (taskList.status === 'fulfilled') setTasks(taskList.value);
      if (leadList.status === 'fulfilled') setLeads(leadList.value);
      if (assigns.status === 'fulfilled') setAssignments(assigns.value);
      if (orders.status === 'fulfilled') setRetailOrders(orders.value);
    } finally {
      setDataLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Theo dõi tin nhắn Facebook toàn cục (kể cả khi không ở tab "Tin nhắn FB") — báo âm thanh,
  // toast, và đổi tiêu đề tab trình duyệt để CSKH không bỏ sót khách nhắn tới.
  useEffect(() => {
    api.fetchFbConversations().then(setFbConversations).catch(() => {});
  }, []);

  useEffect(() => {
    const unsubConv = subscribe('FB_CONVERSATION_UPDATED', (conv: FbConversation) => {
      setFbConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conv.id);
        return idx >= 0 ? [...prev.slice(0, idx), conv, ...prev.slice(idx + 1)] : [conv, ...prev];
      });
    });
    const unsubMsg = subscribe('FB_MESSAGE_CREATED', (msg: FbMessage) => {
      if (msg.direction !== 'in') return;
      playNotificationBeep();
      const conv = fbConversations.find((c) => c.id === msg.conversationId);
      showNotify(`Tin nhắn Facebook mới${conv ? ` từ ${conv.customerName}` : ''}: ${msg.text.slice(0, 60)}`);
    });
    return () => {
      unsubConv();
      unsubMsg();
    };
  }, [subscribe, fbConversations, showNotify]);

  const fbUnreadTotal = useMemo(() => fbConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0), [fbConversations]);

  // Theo dõi trạng thái đơn CSKH đã chốt theo thời gian thực: khi máy POS đổi trạng thái (nhận đơn,
  // làm xong, ship lấy) → cập nhật ngay trên tab "Theo dõi đơn". Riêng lúc POS bấm "Nhận đơn"
  // (pending → preparing) thì kêu tiếng + toast để CSKH biết cửa hàng đã tiếp nhận đơn của mình.
  useEffect(() => {
    const isMine = (o: any) => o && o.salesStaffId === employeeId;
    const unsubUpd = subscribe('ORDER_UPDATED', (data: any) => {
      if (!isMine(data)) return;
      setRetailOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === data.id);
        if (idx < 0) return prev;
        const before = prev[idx];
        if (before.status === 'pending' && data.status === 'preparing') {
          playNotificationBeep();
          showNotify(`🏪 Cửa hàng đã nhận đơn của ${data.customerName || 'khách'}`);
        }
        const next = [...prev];
        next[idx] = { ...before, ...data, time: before.time };
        return next;
      });
    });
    const unsubNew = subscribe('ORDER_CREATED', (data: any) => {
      if (!isMine(data)) return;
      setRetailOrders((prev) => (prev.some((o) => o.id === data.id) ? prev : [{ ...data, time: new Date(data.time) }, ...prev]));
    });
    return () => { unsubUpd(); unsubNew(); };
  }, [subscribe, employeeId, showNotify]);

  // Số đơn đang xử lý (chưa tới bước ship lấy / hoàn tất) — hiện chấm đỏ trên tab "Theo dõi đơn".
  const activeOrderCount = useMemo(
    () => retailOrders.filter((o) => o.status !== 'completed' && o.status !== 'delivering').length,
    [retailOrders]
  );

  // Cảnh báo giao hàng chủ động: poll đơn combo + đơn lẻ sắp tới giờ giao theo mốc "báo trước N
  // phút" (setting chung). Có đơn MỚI vào khoảng cảnh báo → kêu âm thanh + toast, và luôn hiện số
  // đơn đang cần nhắc lên tab "Cảnh báo" (chấm đỏ) dù CSKH đang ở tab khác.
  const [deliveryAlertCount, setDeliveryAlertCount] = useState(0);
  const seenAlertIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      try {
        let lead = DEFAULT_LEAD;
        try { const v = await api.fetchSetting(LEAD_SETTING_KEY); const n = Number(v); if (!Number.isNaN(n) && n > 0) lead = n; } catch { /* mặc định */ }
        const [combo, retail] = await Promise.all([
          api.fetchUpcomingDeliveryAlerts({ minutes: lead }).catch(() => []),
          api.fetchOrderDeliveryAlerts({ minutes: lead }).catch(() => []),
        ]);
        if (stopped) return;
        const ids: { key: string; name: string }[] = [
          ...(combo as any[]).map((a) => ({ key: `combo-${a.id}`, name: a.customerName || 'khách' })),
          ...(retail as any[]).map((a) => ({ key: `retail-${a.id}`, name: a.customerName || 'khách' })),
        ];
        setDeliveryAlertCount(ids.length);
        const fresh = ids.filter((x) => !seenAlertIdsRef.current.has(x.key));
        if (fresh.length > 0 && seenAlertIdsRef.current.size > 0) {
          // chỉ báo khi có đơn MỚI vào khoảng cảnh báo (lần đầu load không kêu ầm ĩ)
          playNotificationBeep();
          showNotify(`⏰ Sắp tới giờ giao: ${fresh.map((f) => f.name).slice(0, 3).join(', ')}${fresh.length > 3 ? '…' : ''}`);
        }
        seenAlertIdsRef.current = new Set(ids.map((x) => x.key));
      } catch { /* bỏ qua, thử lại nhịp sau */ }
    };
    poll();
    const t = setInterval(poll, 60000);
    return () => { stopped = true; clearInterval(t); };
  }, [showNotify]);

  useEffect(() => {
    const baseTitle = 'FitBlend CSKH';
    document.title = fbUnreadTotal > 0 ? `(${fbUnreadTotal}) ${baseTitle}` : baseTitle;
    return () => {
      document.title = baseTitle;
    };
  }, [fbUnreadTotal]);

  // Trình duyệt chặn phát âm thanh tự động cho tới khi người dùng tương tác (click/gõ phím) —
  // theo dõi trạng thái để hiện nút "Bật âm thanh" rõ ràng thay vì để CSKH tự hỏi vì sao im lặng.
  useEffect(() => {
    if (soundOn) return;
    const check = setInterval(() => {
      if (isAudioRunning()) {
        setSoundOn(true);
        clearInterval(check);
      }
    }, 1000);
    return () => clearInterval(check);
  }, [soundOn]);

  const handleEnableSound = () => {
    unlockAudio();
    playNotificationBeep();
    setSoundOn(true);
  };
  const pendingCombos = useMemo(() => combos.filter((c) => c.status === 'pending'), [combos]);
  const myCombos = useMemo(
    () => combos.filter((c) => c.careStaffId === employeeId && c.status !== 'pending'),
    [combos, employeeId]
  );
  // Combo để theo dõi ở tab "Theo dõi đơn" — mọi combo CSKH này phụ trách (mọi trạng thái).
  const trackedCombos = useMemo(
    () => combos.filter((c) => c.careStaffId === employeeId),
    [combos, employeeId]
  );
  const retailCustomers = useMemo(
    () => assignments.filter((a) => a.customerType === 'retail'),
    [assignments]
  );
  const comboCustomers = useMemo(
    () => assignments.filter((a) => a.customerType === 'combo' || !a.customerType),
    [assignments]
  );

  const comboHubProps = {
    variant: 'cskh' as const,
    staffId: activeEmployee?.id,
    staffName: activeEmployee?.fullName,
    claimAs: activeEmployee ? { id: activeEmployee.id, name: activeEmployee.fullName } : null,
  };

  const filterSearch = (items: CustomerCareAssignment[]) => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (a) =>
        a.customerName?.toLowerCase().includes(q) ||
        a.customerPhone.includes(q) ||
        (a.fbName || '').toLowerCase().includes(q)
    );
  };

  const filterOrdersSearch = (items: Order[]) => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (o) =>
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.customerPhone || '').includes(q) ||
        (o.deliveryAddress || '').toLowerCase().includes(q)
    );
  };

  const describeOrderItems = (order: Order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    return items
      .map((item: any) => {
        const qty = item.quantity && item.quantity > 1 ? `${item.quantity} ly ` : '1 ly ';
        const size = item.size ? `${item.size} ` : '';
        const protein = item.protein ? `${item.protein}g protein ` : '';
        const toppings = Array.isArray(item.toppings) && item.toppings.length ? item.toppings.join(', ') : '';
        return `${qty}${size}${protein}${item.productName || item.name || ''}${toppings ? ` (${toppings})` : ''}`.trim();
      })
      .join(' · ');
  };

  const openCustomer = (phone: string) => {
    const a = assignments.find((x) => x.customerPhone === phone);
    if (a) setSelectedAssignment(a);
  };

  const handleCreateLead = async () => {
    if (!activeEmployee || !leadForm.fbName.trim()) {
      alert('Vui lòng nhập tên Facebook');
      return;
    }
    setCreatingLead(true);
    try {
      await api.createSalesLead({
        fbName: leadForm.fbName.trim(),
        customerName: leadForm.customerName.trim(),
        customerPhone: leadForm.customerPhone.trim(),
        notes: leadForm.notes.trim(),
        careStaffId: activeEmployee.id,
        careStaffName: activeEmployee.fullName,
        pipelineStage: 'fb_new',
      });
      setLeadForm({ fbName: '', customerName: '', customerPhone: '', notes: '' });
      await refreshData();
    } catch {
      alert('Tạo lead thất bại');
    } finally {
      setCreatingLead(false);
    }
  };

  const updateLeadStage = async (lead: SalesLead, pipelineStage: PipelineStage) => {
    await api.updateSalesLead(lead.id, {
      pipelineStage,
      activityType: 'status_change',
      activityContent: `Lead → ${PIPELINE_STAGES.find((s) => s.id === pipelineStage)?.label}`,
    });
    await refreshData();
  };

  const copyRefLink = async () => {
    if (!activeEmployee) return;
    const link = buildWebLink(activeEmployee.id);
    await navigator.clipboard.writeText(link);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleTaskClick = (task: SalesTask) => {
    if (task.type === 'pending_claim') setView('pending');
    else if (task.customerPhone) {
      openCustomer(task.customerPhone);
      if (task.type === 'retail_followup') setView('retail');
      else setView('combo');
    } else if (task.leadId) setView('leads');
  };

  if (!activeEmployee) return null;

  const navItems: { id: View; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard, badge: tasks.length || undefined },
    { id: 'sales', label: 'Nhập đơn', icon: ShoppingBag },
    { id: 'orders', label: 'Theo dõi đơn', icon: Package, badge: activeOrderCount || undefined },
    { id: 'retail', label: 'Khách lẻ', icon: Store, badge: retailCustomers.length },
    { id: 'customers', label: 'Quản lý khách', icon: Users, badge: myCombos.filter((c) => c.status === 'active').length || undefined },
    { id: 'schedule', label: 'Lịch tuần', icon: CalendarDays },
    { id: 'fbMessages', label: 'Tin nhắn FB', icon: MessageCircle, badge: fbUnreadTotal || undefined },
    { id: 'bulkSend', label: 'Gửi hàng loạt', icon: Megaphone },
    { id: 'alerts', label: 'Cảnh báo', icon: Bell, badge: deliveryAlertCount || undefined },
    { id: 'settings', label: 'Cài đặt', icon: SettingsIcon },
  ];

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-100">
      <header className="bg-gradient-to-r from-indigo-800 via-violet-800 to-indigo-700 text-white shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Chăm sóc khách hàng · FitBlend
              </p>
              <h1 className="text-xl lg:text-2xl font-black mt-0.5">{activeEmployee.fullName}</h1>
              <p className="text-indigo-200 text-sm">{branchLabel(activeEmployee.branch) || activeEmployee.branch}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {!soundOn && (
                <button
                  type="button"
                  onClick={handleEnableSound}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-sm font-semibold animate-pulse"
                  title="Bấm để bật âm thanh báo tin nhắn mới"
                >
                  <BellOff className="w-4 h-4" />
                  Bật âm thanh
                </button>
              )}
              {soundOn && (
                <button
                  type="button"
                  onClick={() => playNotificationBeep()}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20"
                  title="Âm thanh thông báo đã bật — bấm để thử lại"
                >
                  <Bell className="w-5 h-5" />
                </button>
              )}
              <button
                type="button"
                onClick={copyRefLink}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold"
              >
                {copiedRef ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Link giới thiệu
              </button>
              <button type="button" onClick={logout} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20" title="Đăng xuất">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 overflow-x-auto shrink-0 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex gap-0.5 min-w-max">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                view === item.id
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span
                  className={`text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    item.id === 'fbMessages' ? 'bg-red-600' : 'bg-amber-500'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main
        className={
          view === 'fbMessages'
            ? 'flex-1 min-h-0 w-full mx-auto px-2 sm:px-3 py-2 lg:py-3 overflow-hidden'
            : view === 'sales'
              // Nhập đơn tự quản lý cuộn bên trong (không cho cả trang cuộn) → layout CỐ ĐỊNH,
              // không "tụt lên tụt xuống" khi thêm món / đổi bước.
              ? 'flex-1 min-h-0 max-w-6xl w-full mx-auto px-3 sm:px-6 py-3 lg:py-4 overflow-hidden'
              : 'flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6 overflow-y-auto'
        }
      >
        {view === 'dashboard' && (
              <div className={`space-y-6 ${dataLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                <SalesAnalyticsDashboard />

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard icon={Store} label="Khách lẻ / combo" value={`${dashboard.retailCustomerCount} / ${dashboard.comboCustomerCount}`} sub={`${dashboard.leadCount} lead`} />
                  <MetricCard icon={AlertCircle} label="Cơ hội upsale" value={String(dashboard.upsellOpportunities)} sub={`Tỷ lệ chốt: ${dashboard.conversionRate}%`} />
                </div>

                <div className="bg-white rounded-2xl border p-5">
                  <h3 className="font-bold text-gray-800 mb-3">Việc ưu tiên</h3>
                  {tasks.slice(0, 5).length === 0 ? (
                    <p className="text-sm text-gray-400">Không có việc cần làm</p>
                  ) : (
                    <div className="space-y-2">
                      {tasks.slice(0, 5).map((t) => (
                        <button key={t.id} type="button" onClick={() => handleTaskClick(t)} className={`w-full text-left p-3 rounded-xl border-l-4 bg-gray-50 hover:bg-indigo-50 text-sm ${PRIORITY_COLOR[t.priority]}`}>
                          <p className="font-semibold text-gray-900">{t.title}</p>
                          <p className="text-xs text-gray-500">{t.subtitle}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === 'sales' && activeEmployee && (
              <OnlineSalesOrderEntry
                employee={activeEmployee}
                prefill={orderPrefill}
                onComplete={() => {
                  setOrderPrefill(undefined);
                  refreshData();
                }}
                onViewOrders={() => setView('orders')}
              />
            )}

            {view === 'leads' && (
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 bg-white rounded-2xl border p-5 space-y-3 h-fit">
                  <h3 className="font-bold text-gray-800">Thêm lead Facebook</h3>
                  <input placeholder="Tên Facebook *" value={leadForm.fbName} onChange={(e) => setLeadForm({ ...leadForm, fbName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border text-sm" />
                  <input placeholder="Tên khách" value={leadForm.customerName} onChange={(e) => setLeadForm({ ...leadForm, customerName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border text-sm" />
                  <input placeholder="SĐT" value={leadForm.customerPhone} onChange={(e) => setLeadForm({ ...leadForm, customerPhone: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border text-sm" />
                  <textarea placeholder="Ghi chú" value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border text-sm h-20 resize-none" />
                  <button type="button" onClick={handleCreateLead} disabled={creatingLead} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-60">
                    {creatingLead ? 'Đang tạo...' : 'Tạo lead'}
                  </button>
                </div>
                <div className="lg:col-span-8 space-y-3">
                  {leads.length === 0 ? (
                    <EmptyState icon={UserPlus} title="Chưa có lead" subtitle="Thêm lead từ inbox Facebook" />
                  ) : (
                    leads.map((lead) => {
                      const stage = PIPELINE_STAGES.find((s) => s.id === lead.pipelineStage);
                      return (
                        <div key={lead.id} className="bg-white rounded-2xl border p-4">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <p className="font-bold text-gray-900">{lead.fbName || lead.customerName}</p>
                              <p className="text-sm text-gray-500">{lead.customerPhone || 'Chưa có SĐT'}</p>
                            </div>
                            {stage && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.color}`}>{stage.label}</span>}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setOrderPrefill({
                                  name: lead.customerName || lead.fbName || '',
                                  phone: lead.customerPhone || '',
                                });
                                setView('sales');
                              }}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                              Nhập đơn
                            </button>
                            {(['fb_replied', 'zalo_sent', 'web_sent', 'closed_retail', 'closed_combo'] as PipelineStage[]).map((st) => (
                              <button key={st} type="button" onClick={() => updateLeadStage(lead, st)} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-200 hover:border-indigo-400 text-gray-600">
                                {PIPELINE_STAGES.find((s) => s.id === st)?.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {view === 'pending' && (
              <CustomerComboHub {...comboHubProps} defaultStatusFilter="pending" title="Combo chờ chốt" />
            )}

            {view === 'orders' && (
              <CskhOrderTracker
                orders={retailOrders}
                combos={trackedCombos}
                loading={dataLoading}
                onRefresh={refreshData}
                onOpen={setSelectedOrder}
              />
            )}

            {view === 'retail' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Tìm tên, SĐT..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-white"
                  />
                </div>
                {filterSearch(retailCustomers).length === 0 ? (
                  <EmptyState icon={Store} title="Chưa có khách lẻ" subtitle="Khách mua lẻ qua link của bạn sẽ hiện ở đây" />
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                    {filterSearch(retailCustomers).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setSelectedAssignment(a)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-indigo-50/40"
                      >
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                          {(a.customerName || 'K').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{a.customerName || 'Khách hàng'}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {a.customerPhone}</p>
                          {a.address && <p className="text-xs text-gray-500 flex items-start gap-1 mt-0.5"><MapPin className="w-3 h-3 mt-0.5 shrink-0 text-emerald-600" /> <span className="truncate">{a.address}</span></p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === 'customers' && (
              <CustomerManagement scope="cskh" staffId={activeEmployee.id} staffName={activeEmployee.fullName} />
            )}

            {view === 'schedule' && (
              <div className="max-w-2xl mx-auto">
                <div className="mb-3 text-sm text-gray-500">Lịch giao combo trong tuần của bạn. Sửa lịch tại tab <span className="font-semibold text-gray-700">Khách combo → Chi tiết</span>.</div>
                <WeeklyComboSchedule careStaffId={activeEmployee.id} variant="cskh" branchLabel={branchLabel} />
              </div>
            )}

            {view === 'fbMessages' && (
              <FbMessagesTab staffId={activeEmployee.id} staffName={activeEmployee.fullName} />
            )}

            {view === 'bulkSend' && (
              <BulkMessageTab staffId={activeEmployee.id} staffName={activeEmployee.fullName} />
            )}

            {view === 'alerts' && <DeliveryAlerts />}

            {view === 'settings' && <CskhSettings />}
      </main>

      {selectedAssignment && activeEmployee && (
        <CustomerDetailDrawer
          assignment={selectedAssignment}
          combos={combos}
          employee={activeEmployee}
          onClose={() => setSelectedAssignment(null)}
          onUpdated={refreshData}
        />
      )}

      {selectedOrder && (
        <RetailOrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} onSaved={refreshData} />
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub }: { icon: typeof TrendingUp; label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 text-indigo-600 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-black text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: typeof ShoppingBag; title: string; subtitle: string }) {
  return (
    <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
      <Icon className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p className="font-semibold text-gray-500">{title}</p>
      <p className="text-sm mt-1">{subtitle}</p>
    </div>
  );
}

function LoaderCenter() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
    </div>
  );
}
