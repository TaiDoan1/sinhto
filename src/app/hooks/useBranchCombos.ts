import { useMemo } from 'react';
import { useCombos } from '../contexts/ComboContext';
import { filterByBranch } from '../utils/branchScope';
import { getCombosDueToday } from '../utils/comboUtils';

/** Combo chỉ của một chi nhánh */
export function useBranchCombos(branchId: string) {
  const ctx = useCombos();
  const combos = useMemo(() => filterByBranch(ctx.combos, branchId), [ctx.combos, branchId]);
  const getTodayDeliveries = (bid?: string) =>
    getCombosDueToday(combos.filter((c) => c.status === 'active'), bid || branchId);
  return { ...ctx, combos, getTodayDeliveries };
}
