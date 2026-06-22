export type CustomerType = 'lead' | 'retail' | 'combo';

export type PipelineStage =
  | 'fb_new'
  | 'fb_replied'
  | 'zalo_sent'
  | 'web_sent'
  | 'closed_retail'
  | 'closed_combo'
  | 'nurturing'
  | 'upsell_pending';

export type SalesActivityType =
  | 'fb_reply'
  | 'zalo'
  | 'call'
  | 'web_link'
  | 'note'
  | 'claim'
  | 'upsell'
  | 'status_change'
  | 'lead_created'
  | 'converted';

export interface SalesLead {
  id: string;
  fbName?: string;
  customerName?: string;
  customerPhone?: string;
  careStaffId: string;
  careStaffName: string;
  pipelineStage: PipelineStage;
  source: 'facebook' | 'zalo' | 'web' | 'other';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  lastContactAt?: string;
}

export interface SalesActivity {
  id: string;
  customerPhone?: string;
  leadId?: string;
  careStaffId: string;
  careStaffName: string;
  activityType: SalesActivityType;
  content: string;
  createdAt?: string;
}

export interface OnlineSalesDashboard {
  revenueMonth: number;
  revenueWeek: number;
  comboRevenueMonth: number;
  retailRevenueMonth: number;
  pendingClaims: number;
  activeCombos: number;
  expiringCombos: number;
  leadCount: number;
  retailCustomerCount: number;
  comboCustomerCount: number;
  conversionRate: number;
  upsellOpportunities: number;
}

export interface TeamStat {
  staffId: string;
  fullName: string;
  employeeId: string;
  username: string;
  revenueMonth: number;
  comboCount: number;
  leadCount: number;
  customerCount: number;
  pendingClaims: number;
}

export interface SalesTask {
  id: string;
  type: 'pending_claim' | 'expiring_combo' | 'retail_followup' | 'lead_stale' | 'upsell';
  title: string;
  subtitle: string;
  priority: 'high' | 'medium' | 'low';
  customerPhone?: string;
  leadId?: string;
  comboId?: string;
  orderId?: string;
  dueHint?: string;
}
