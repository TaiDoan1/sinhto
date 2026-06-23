import { useMemo } from 'react';
import { useOrders } from '../contexts/OrderContext';
import { filterByBranch } from '../utils/branchScope';

/** Đơn hàng chỉ của một chi nhánh (POS) */
export function useBranchOrders(branchId: string) {
  const ctx = useOrders();
  const orders = useMemo(() => filterByBranch(ctx.orders, branchId), [ctx.orders, branchId]);
  const history = useMemo(() => filterByBranch(ctx.history, branchId), [ctx.history, branchId]);
  return { ...ctx, orders, history };
}
