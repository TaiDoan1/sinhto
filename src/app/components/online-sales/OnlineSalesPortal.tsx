import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Phone, User, Package, LogOut, CheckCircle2, Clock, Pause, Play,
  MapPin, Loader2, Users, Search, ShoppingBag, Globe, LayoutDashboard,
  ListTodo, UserPlus, Store, TrendingUp, AlertCircle, Copy, Check,
} from 'lucide-react';
import { useOnlineSales } from '../../contexts/OnlineSalesContext';
import { useCombos } from '../../contexts/ComboContext';
import * as api from '../../utils/api';
import type { CustomerCareAssignment } from '../../types/customerCare';
import type { OnlineSalesDashboard, SalesTask, SalesLead, PipelineStage } from '../../types/onlineSales';
import { BRANCH_LABELS } from '../../types/employee';
import { PIPELINE_STAGES, buildWebLink } from './constants';
import { CustomerDetailDrawer } from './CustomerDetailDrawer';
import { OnlineSalesOrderEntry } from './OnlineSalesOrderEntry';
import { CustomerComboHub } from '../combo/CustomerComboHub';

type View = 'dashboard' | 'leads' | 'sales' | 'pending' | 'retail' | 'combo';

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
  const { combos } = useCombos();
  const [view, setView] = useState<View>('dashboard');
  const [assignments, setAssignments] = useState<CustomerCareAssignment[]>([]);
  const [dashboard, setDashboard] = useState<OnlineSalesDashboard>(EMPTY_DASHBOARD);
  const [tasks, setTasks] = useState<SalesTask[]>([]);
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<CustomerCareAssignment | null>(null);
  const [leadForm, setLeadForm] = useState({ fbName: '', customerName: '', customerPhone: '', notes: '' });
  const [creatingLead, setCreatingLead] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [orderPrefill, setOrderPrefill] = useState<{ name?: string; phone?: string; address?: string } | undefined>();

  const employeeId = activeEmployee?.id || '';

  const refreshData = useCallback(async () => {
    if (!employeeId) return;
    setDataLoading(true);
    try {
      const [dash, taskList, leadList, assigns] = await Promise.allSettled([
        api.fetchOnlineSalesDashboard(employeeId),
        api.fetchSalesTasks(employeeId),
        api.fetchSalesLeads(employeeId),
        api.fetchCareAssignments(employeeId),
      ]);
      if (dash.status === 'fulfilled' && dash.value) setDashboard(dash.value);
      else if (dash.status === 'rejected') setDashboard(EMPTY_DASHBOARD);
      if (taskList.status === 'fulfilled') setTasks(taskList.value);
      if (leadList.status === 'fulfilled') setLeads(leadList.value);
      if (assigns.status === 'fulfilled') setAssignments(assigns.value);
    } finally {
      setDataLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const pendingCombos = useMemo(() => combos.filter((c) => c.status === 'pending'), [combos]);
  const myCombos = useMemo(
    () => combos.filter((c) => c.careStaffId === employeeId && c.status !== 'pending'),
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
    const link = buildWebLink(activeEmployee.username);
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
    { id: 'leads', label: 'Lead FB', icon: UserPlus, badge: leads.length },
    { id: 'pending', label: 'Chờ chốt', icon: Clock, badge: pendingCombos.length },
    { id: 'retail', label: 'Khách lẻ', icon: Store, badge: retailCustomers.length },
    { id: 'combo', label: 'Khách combo', icon: Package, badge: myCombos.filter((c) => c.status === 'active').length },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="bg-gradient-to-r from-indigo-800 via-violet-800 to-indigo-700 text-white shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Bán hàng online · FitBlend
              </p>
              <h1 className="text-xl lg:text-2xl font-black mt-0.5">{activeEmployee.fullName}</h1>
              <p className="text-indigo-200 text-sm">{BRANCH_LABELS[activeEmployee.branch] || activeEmployee.branch}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
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
                <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{item.badge}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
        {view === 'dashboard' && (
              <div className={`space-y-6 ${dataLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard icon={TrendingUp} label="Doanh thu tháng" value={`${dashboard.revenueMonth.toLocaleString('vi-VN')}đ`} sub={`Tuần: ${dashboard.revenueWeek.toLocaleString('vi-VN')}đ`} />
                  <MetricCard icon={Package} label="Combo active" value={String(dashboard.activeCombos)} sub={`${dashboard.expiringCombos} sắp hết`} />
                  <MetricCard icon={Store} label="Khách lẻ / combo" value={`${dashboard.retailCustomerCount} / ${dashboard.comboCustomerCount}`} sub={`${dashboard.leadCount} lead`} />
                  <MetricCard icon={AlertCircle} label="Cơ hội upsale" value={String(dashboard.upsellOpportunities)} sub={`Tỷ lệ chốt: ${dashboard.conversionRate}%`} />
                </div>
                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border p-5">
                    <h3 className="font-bold text-gray-800 mb-3">Doanh thu chi tiết tháng</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">Combo</span><span className="font-bold">{dashboard.comboRevenueMonth.toLocaleString('vi-VN')}đ</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Bán lẻ</span><span className="font-bold">{dashboard.retailRevenueMonth.toLocaleString('vi-VN')}đ</span></div>
                      <div className="flex justify-between border-t pt-2"><span className="text-gray-600">Chờ chốt</span><span className="font-bold text-amber-600">{dashboard.pendingClaims} đơn</span></div>
                    </div>
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
                  <div className="grid md:grid-cols-2 gap-3">
                    {filterSearch(retailCustomers).map((a) => (
                      <CustomerRow key={a.id} assignment={a} onClick={() => setSelectedAssignment(a)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === 'combo' && (
              <CustomerComboHub {...comboHubProps} />
            )}
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
