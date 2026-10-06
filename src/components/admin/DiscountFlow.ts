// Promotions (coupons, offers, cart discounts) created / edited in this browser. Swap for API mutations later.
// Model mirrors react-learn's promotions: coupon | offer (direct discount or BOGO) | cartDiscount (amount/% or free gift).
import { useMemo, useSyncExternalStore } from "react";
import type { DiscountRow } from "@/lib/api/section-types";

export type PromotionType = "coupon" | "offer" | "cartDiscount";
export type Mode = "percentage" | "discount"; // percent or fixed amount
export type Scope = "common" | "category" | "product";

export const PROMOTION_TYPES: {
  value: PromotionType;
  label: string;
  hint: string;
  badge: string;
}[] = [
  {
    value: "coupon",
    label: "Coupon code",
    hint: "Customers enter a promo code at checkout.",
    badge: "bg-info-bg text-info",
  },
  {
    value: "offer",
    label: "Special offer / BOGO",
    hint: "Automatic discounts or buy-X-get-Y deals on catalogue products.",
    badge: "bg-hover text-foreground",
  },
  {
    value: "cartDiscount",
    label: "Cart auto-discount",
    hint: "Automatic price cut or free gift when the cart reaches a threshold.",
    badge: "bg-ok-bg text-ok",
  },
];
export const MODES: { value: Mode; label: string }[] = [
  { value: "discount", label: "Fixed amount (EGP)" },
  { value: "percentage", label: "Percentage (%)" },
];
export const COUPON_SCOPES: { value: Scope; label: string; hint: string }[] = [
  { value: "common", label: "Storewide", hint: "All shoppable products" },
  { value: "category", label: "Category specific", hint: "Items in chosen categories" },
  { value: "product", label: "Product specific", hint: "Chosen products only" },
];
export const APPLY_ON: { value: Scope; label: string }[] = [
  { value: "common", label: "All products" },
  { value: "category", label: "Product category" },
  { value: "product", label: "Specific product" },
];

export const typeMeta = (t: PromotionType) => PROMOTION_TYPES.find((x) => x.value === t)!;

export interface Promotion {
  id: string;
  name: string;
  description: string;
  type: PromotionType;
  sortOrder: string;
  active: boolean;
  used: number;
  starts: string;
  ends: string;
  // coupon
  code: string;
  couponMode: Mode;
  value: string;
  scope: Scope;
  items: string[];
  min: string;
  maxDiscount: string;
  usageLimit: string;
  perUser: string;
  newUsers: boolean;
  showInWebsite: boolean;
  // offer
  offerType: "discount" | "bogo";
  discountMode: Mode;
  discountValue: string;
  applyOn: Scope;
  // bogo / free gift
  buyProduct: string;
  buyQty: string;
  getProduct: string;
  getQty: string;
  buyGetType: "free" | "discount";
  bogoPct: string;
  // cart auto-discount
  cartType: "discount" | "product";
}

export const blank = (): Promotion => ({
  id: "",
  name: "",
  description: "",
  type: "coupon",
  sortOrder: "0",
  active: true,
  used: 0,
  starts: "",
  ends: "",
  code: "",
  couponMode: "percentage",
  value: "10",
  scope: "common",
  items: [],
  min: "",
  maxDiscount: "",
  usageLimit: "",
  perUser: "1",
  newUsers: false,
  showInWebsite: true,
  offerType: "discount",
  discountMode: "percentage",
  discountValue: "10",
  applyOn: "common",
  buyProduct: "",
  buyQty: "1",
  getProduct: "",
  getQty: "1",
  buyGetType: "free",
  bogoPct: "100",
  cartType: "discount",
});

const num = (s: string) => s.replace(/[^\d.]/g, "");
const SEED_DATES: Record<string, [string, string]> = {
  WELCOME10: ["2026-09-01", "2026-10-31"],
  MOTHERSDAY: ["2027-03-10", "2027-03-21"],
  SUMMER500: ["2026-07-01", "2026-08-31"],
};

export function fromRow(r: DiscountRow, i: number): Promotion {
  const [used, limit] = r.uses.split("/").map((s) => s.trim());
  const all = /all/i.test(r.scope);
  const [starts, ends] = SEED_DATES[r.code] ?? ["", ""];
  const p: Promotion = {
    ...blank(),
    id: `seed-${r.code}`,
    name: r.code,
    code: r.code,
    sortOrder: String(i),
    starts,
    ends,
    scope: all ? "common" : "category",
    items: all ? [] : r.scope.split(/ & |, /),
    min: r.min === "—" ? "" : num(r.min),
    usageLimit: limit && limit !== "∞" ? limit : "",
    used: Number(used) || 0,
    active: r.status.label === "Active" || r.status.label === "Scheduled",
  };
  if (r.type === "Percentage") return { ...p, couponMode: "percentage", value: num(r.value) };
  if (r.type === "Fixed amount") return { ...p, couponMode: "discount", value: num(r.value) };
  if (r.type === "Buy X get Y")
    return { ...p, type: "offer", offerType: "bogo", description: r.value, code: "" };
  return {
    ...p,
    type: "cartDiscount",
    cartType: "product",
    getProduct: r.value,
    description: r.type,
    code: "",
  };
}

let created: Promotion[] = [];
let edits: Record<string, Partial<Promotion>> = {};
let deleted: string[] = [];
const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());
const NO_C: Promotion[] = [];
const NO_E: Record<string, Partial<Promotion>> = {};
const NO_D: string[] = [];

export function usePromotions(rows: DiscountRow[]): Promotion[] {
  const c = useSyncExternalStore(
    sub,
    () => created,
    () => NO_C,
  );
  const e = useSyncExternalStore(
    sub,
    () => edits,
    () => NO_E,
  );
  const d = useSyncExternalStore(
    sub,
    () => deleted,
    () => NO_D,
  );
  return useMemo(
    () =>
      [...c, ...rows.map(fromRow)]
        .filter((x) => !d.includes(x.id))
        .map((x) => (e[x.id] ? { ...x, ...e[x.id] } : x)),
    [c, rows, e, d],
  );
}
export function addPromotion(x: Omit<Promotion, "id">): string {
  const id = `p-${Date.now().toString(36)}`;
  created = [{ ...x, id }, ...created];
  emit();
  return id;
}
export function editPromotion(id: string, p: Partial<Promotion>) {
  if (created.some((x) => x.id === id))
    created = created.map((x) => (x.id === id ? { ...x, ...p } : x));
  else edits = { ...edits, [id]: { ...edits[id], ...p } };
  emit();
}
export function deletePromotion(id: string) {
  created = created.filter((x) => x.id !== id);
  deleted = [...deleted, id];
  emit();
}

export const randomCode = () =>
  "PROMO-" +
  Array.from(
    { length: 6 },
    () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)],
  ).join("");

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const part = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y: y!, m: m! - 1, d: d! };
};
export const fmt = (iso: string) => {
  const p = part(iso);
  return `${p.d} ${MON[p.m]} ${p.y}`;
};
export function datesLabel(starts: string, ends: string) {
  if (!starts && !ends) return "Always active";
  if (!ends) return `From ${fmt(starts)}`;
  if (!starts) return `Until ${fmt(ends)}`;
  const a = part(starts),
    b = part(ends);
  if (a.y === b.y && a.m === b.m) return `${a.d} – ${b.d} ${MON[b.m]} ${b.y}`;
  return a.y === b.y
    ? `${a.d} ${MON[a.m]} – ${b.d} ${MON[b.m]} ${b.y}`
    : `${fmt(starts)} – ${fmt(ends)}`;
}

const off = (mode: Mode, v: string) =>
  mode === "percentage" ? `${v || "…"}% off` : `${v || "…"} EGP off`;
const bogoText = (p: Promotion) =>
  `Buy ${p.buyQty || 1} ${p.buyProduct || "item"}, get ${p.getQty || 1} ${p.getProduct || "item"} ${p.buyGetType === "free" ? "free" : `at ${p.bogoPct || "…"}% off`}`;
const giftText = (p: Promotion) =>
  `Free gift: ${p.getProduct || "reward product"}${p.buyGetType === "discount" ? ` (${p.bogoPct}% off)` : ""}`;

/** One-line description of the benefit, shown in the list and the editor summary. */
export function benefit(p: Promotion): string {
  if (p.type === "coupon") return off(p.couponMode, p.value);
  if (p.type === "offer")
    return p.offerType === "bogo" ? bogoText(p) : off(p.discountMode, p.discountValue);
  return p.cartType === "product" ? giftText(p) : off(p.couponMode, p.value);
}
/** What the promotion applies to. */
export function appliesTo(p: Promotion): string {
  const s =
    p.type === "coupon"
      ? p.scope
      : p.type === "offer" && p.offerType === "discount"
        ? p.applyOn
        : "common";
  if (s === "common") return "All shoppable products";
  return p.items.join(", ") || (s === "category" ? "Categories" : "Products");
}
/** Live status from the active switch and schedule. */
export function statusOf(
  p: Promotion,
  today = new Date().toISOString().slice(0, 10),
): { label: string; tone: "ok" | "info" | "mute" } {
  if (!p.active) return { label: "Inactive", tone: "mute" };
  if (p.ends && p.ends < today) return { label: "Expired", tone: "mute" };
  if (p.starts && p.starts > today) return { label: "Scheduled", tone: "info" };
  return { label: "Active", tone: "ok" };
}
