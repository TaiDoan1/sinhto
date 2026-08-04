export type AppMode =
  | "customer"
  | "online-sales"
  | "staff"
  | "pos"
  | "pos-customer-display"
  | "admin"
  | "store-manager"
  | "hr"
  | "shipper"
  | "combo-ship"
  | "menu";

const PATH_MODE: { prefix: string; mode: AppMode }[] = [
  { prefix: "/menu", mode: "menu" },
  { prefix: "/he-thong", mode: "menu" },
  { prefix: "/admin", mode: "admin" },
  { prefix: "/store-manager", mode: "store-manager" },
  { prefix: "/hr", mode: "hr" },
  { prefix: "/nhan-su", mode: "hr" },
  { prefix: "/pos/customer-display", mode: "pos-customer-display" },
  { prefix: "/pos", mode: "pos" },
  { prefix: "/cs", mode: "online-sales" },
  { prefix: "/cskh", mode: "online-sales" },
  { prefix: "/online-sales", mode: "online-sales" },
  { prefix: "/staff", mode: "staff" },
  { prefix: "/nv", mode: "staff" },
  { prefix: "/shipper", mode: "shipper" },
  { prefix: "/ship-combo", mode: "combo-ship" },
  { prefix: "/giao-combo", mode: "combo-ship" },
  { prefix: "/customer", mode: "customer" },
];

export function getModeFromPath(pathname = window.location.pathname): AppMode {
  for (const { prefix, mode } of PATH_MODE) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return mode;
  }
  return "customer";
}

export function pathForMode(mode: AppMode): string {
  switch (mode) {
    case "menu":
      return "/menu";
    case "admin":
      return "/admin";
    case "store-manager":
      return "/store-manager";
    case "hr":
      return "/hr";
    case "pos":
      return "/pos";
    case "pos-customer-display":
      return "/pos/customer-display";
    case "online-sales":
      return "/cs";
    case "staff":
      return "/staff";
    case "shipper":
      return "/shipper";
    case "combo-ship":
      return "/ship-combo";
    case "customer":
      return "/customer";
    default:
      return "/";
  }
}

export function navigateToMode(mode: AppMode) {
  const path = pathForMode(mode);
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export const isDevEnvironment = import.meta.env.DEV;
