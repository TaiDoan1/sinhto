import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Branch } from '../types/branch';
import { DEFAULT_BRANCHES, branchLabel as labelFor } from '../config/branches';
import * as api from '../utils/api';
import { useSSE } from './SSEContext';

interface BranchContextValue {
  branches: Branch[];
  activeBranches: Branch[];
  loading: boolean;
  refresh: () => Promise<void>;
  branchLabel: (id: string) => string;
  getBranch: (id: string) => Branch | undefined;
}

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { subscribe } = useSSE();
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.fetchBranches();
      if (Array.isArray(data) && data.length > 0) {
        setBranches(data);
      }
    } catch {
      /* giữ fallback */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubCreate = subscribe('BRANCH_CREATED', (data: Branch) => {
      setBranches((prev) => (prev.some((b) => b.id === data.id) ? prev : [...prev, data]));
    });
    const unsubUpdate = subscribe('BRANCH_UPDATED', (data: Branch) => {
      setBranches((prev) => prev.map((b) => (b.id === data.id ? data : b)));
    });
    const unsubDelete = subscribe('BRANCH_DELETED', (data: { id: string }) => {
      setBranches((prev) => prev.filter((b) => b.id !== data.id));
    });
    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
    };
  }, [load, subscribe]);

  const activeBranches = useMemo(() => branches.filter((b) => b.active), [branches]);

  const value = useMemo<BranchContextValue>(
    () => ({
      branches,
      activeBranches,
      loading,
      refresh: load,
      branchLabel: (id: string) => labelFor(branches, id),
      getBranch: (id: string) => branches.find((b) => b.id === id),
    }),
    [branches, activeBranches, loading, load]
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranches() {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    return {
      branches: DEFAULT_BRANCHES,
      activeBranches: DEFAULT_BRANCHES,
      loading: false,
      refresh: async () => {},
      branchLabel: (id: string) => labelFor(DEFAULT_BRANCHES, id),
      getBranch: (id: string) => DEFAULT_BRANCHES.find((b) => b.id === id),
    };
  }
  return ctx;
}
