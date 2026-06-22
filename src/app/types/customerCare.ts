export interface CustomerCareAssignment {
  id: string;
  customerPhone: string;
  customerName: string;
  careStaffId: string;
  careStaffName: string;
  assignedAt?: Date;
  assignedBy?: string;
  notes?: string;
  customerType?: 'lead' | 'retail' | 'combo';
  fbName?: string;
  pipelineStage?: string;
  lastContactAt?: string;
  tags?: string;
  salesRefCode?: string;
}

export type ComboSubscriptionStatus = 'pending' | 'active' | 'paused' | 'completed';
