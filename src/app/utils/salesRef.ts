const STORAGE_KEY = 'activeSalesRef';

export function captureSalesRefFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const cs = params.get('cs');
  if (cs) {
    localStorage.setItem(STORAGE_KEY, cs.trim());
    return cs.trim();
  }
  return null;
}

export function getActiveSalesRef(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function withSalesRef<T extends Record<string, unknown>>(payload: T): T {
  const ref = getActiveSalesRef();
  if (!ref) return payload;
  return { ...payload, salesRefCode: ref };
}
