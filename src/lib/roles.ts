// Role-based access: which pages and dashboard cards each role can see.
// Based on the "Role permissions" table in the original prototype.
// When a real backend exists, it can return these permissions per user instead.

import { findRoleByName, levelOf } from "@/lib/team-store";

export type DashboardWidget =
  "revenue" | "latestOrders" | "lowStock" | "bestSellers" | "mostEnquired" | "pipeline";

interface RoleAccess {
  pages: string[] | "all";
  widgets: DashboardWidget[];
  focus: string; // one-line description shown on the dashboard
}

const ALL_WIDGETS: DashboardWidget[] = [
  "revenue",
  "latestOrders",
  "lowStock",
  "bestSellers",
  "mostEnquired",
  "pipeline",
];

export const ROLE_ACCESS: Record<string, RoleAccess> = {
  Owner: { pages: "all", widgets: ALL_WIDGETS, focus: "Full view of the business" },
  "Store manager": {
    pages: [
      "dashboard",
      "approvals",
      "reports",
      "activity",
      "orders",
      "returns",
      "customers",
      "enquiries",
      "products",
      "categories",
      "attributes",
      "brands",
      "selling",
      "inventory",
      "discounts",
      "browsing",
      "loyalty",
      "bundles",
      "gifting",
      "content",
      "delivery",
      "staff",
    ],
    widgets: ALL_WIDGETS,
    focus: "Sales, catalogue and team approvals",
  },
  Operations: {
    pages: ["dashboard", "activity", "orders", "returns", "inventory", "delivery", "staff"],
    widgets: ["latestOrders", "lowStock"],
    focus: "Orders, returns, stock and delivery",
  },
  "Order desk": {
    pages: ["dashboard", "activity", "orders", "returns", "customers", "delivery"],
    widgets: ["latestOrders"],
    focus: "Processing today's orders and returns",
  },
  "Content editor": {
    pages: [
      "dashboard",
      "activity",
      "products",
      "categories",
      "attributes",
      "brands",
      "bundles",
      "gifting",
      "content",
      "browsing",
    ],
    widgets: ["bestSellers", "mostEnquired"],
    focus: "Products and site content",
  },
};

const access = (role?: string | null): RoleAccess =>
  ROLE_ACCESS[role ?? ""] ?? ROLE_ACCESS["Order desk"]!;

export function canSeePage(role: string | null | undefined, key: string) {
  const custom = findRoleByName(role);
  if (custom) return key === "dashboard" ? true : levelOf(custom, key) !== "none";
  const p = access(role).pages;
  return p === "all" || p.includes(key);
}

export function canSeeWidget(role: string | null | undefined, w: DashboardWidget) {
  return access(role).widgets.includes(w);
}

export const roleFocus = (role?: string | null) => access(role).focus;

/** "/orders" → "orders", "/" → "dashboard" */
export const pageKeyFromPath = (pathname: string) => pathname.split("/")[1] || "dashboard";
