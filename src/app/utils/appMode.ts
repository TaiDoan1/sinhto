export type AppMode = 'customer' | 'online-sales' | 'staff' | 'pos' | 'admin' | 'shipper';

const PATH_MODE: { prefix: string; mode: AppMode }[] = [
  { prefix: '/admin', mode: 'admin' },
  { prefix: '/pos', mode: 'pos' },
  { prefix: '/cs', mode: 'online-sales' },
  { prefix: '/cskh', mode: 'online-sales' },
  { prefix: '/online-sales', mode: 'online-sales' },
  { prefix: '/staff', mode: 'staff' },
  { prefix: '/nv', mode: 'staff' },
  { prefix: '/shipper', mode: 'shipper' },
];

export function getModeFromPath(pathname = window.location.pathname): AppMode {
  for (const { prefix, mode } of PATH_MODE) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return mode;
  }
  return 'customer';
}

export function pathForMode(mode: AppMode): string {
  switch (mode) {
    case 'admin': return '/admin';
    case 'pos': return '/pos';
    case 'online-sales': return '/cs';
    case 'staff': return '/staff';
    case 'shipper': return '/shipper';
    default: return '/';
  }
}

export function navigateToMode(mode: AppMode) {
  const path = pathForMode(mode);
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export const isDevEnvironment = import.meta.env.DEV;
