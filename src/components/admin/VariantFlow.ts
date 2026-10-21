// Product variants: every combination of attribute values a product is sold in (e.g. Size 100 ml ·
// Concentration EDP). Stock, price and SKU live on the variant. Inventory lists variants and the
// product page lists a product's variants; both open the same editor. Edits are kept in this browser —
// swap for API calls later.
import { useMemo, useSyncExternalStore } from "react";
import type { AttributeRow, ProductRow } from "@/lib/api/section-types";

export type Bi = [string, string];
export interface VariantAttr {
  name: string;
  value: string;
}
export interface Variant {
  id: string;
  productId: string;
  /** "100 ml / EDP" — the attribute values joined, or "Default" for a product with no attributes. */
  label: string;
  attrs: VariantAttr[];
  sku: string;
  barcode: string;
  price: number | null;
  offer: number | null;
  stock: number;
  sold: number;
  /** Name & description */
  name: Bi;
  shortDesc: Bi;
  desc: Bi;
  /** Images (object URLs); the first one is the hero. */
  images: string[];
  alt: Bi;
  /** Size & weight (g / cm) */
  weight: string;
  length: string;
  width: string;
  height: string;
  /** SEO */
  seoTitle: Bi;
  meta: Bi;
  url: string;
}
export type VariantEdit = Partial<Omit<Variant, "id" | "productId" | "attrs" | "label">>;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Splits `total` over `n` parts so that the parts add up exactly. */
const split = (total: number, n: number, i: number) =>
  Math.floor(total / n) + (i < total % n ? 1 : 0);

/** Keeps the original stock split but takes the current simple / variable type from the edited products. */
export const withCurrentType = (raw: ProductRow[], current: ProductRow[]): ProductRow[] => {
  const type = new Map(current.map((p) => [p.id, p.variable]));
  return raw.map((r) => (type.has(r.id) ? { ...r, variable: type.get(r.id) } : r));
};

/** Builds the variants of every variable product from the attributes that apply to its category. */
export function buildVariants(products: ProductRow[], attributes: AttributeRow[]): Variant[] {
  const usable = attributes.filter((a) => a.status.label !== "Inactive" && a.values.length > 0);
  const out: Variant[] = [];
  products.forEach((p, pi) => {
    if (!p.variable) return; // simple products have no variants
    const attrs = usable
      .filter((a) => a.categories.length === 0 || a.categories.includes(p.category))
      .slice(0, 2);
    let combos: VariantAttr[][] = [[]];
    attrs.forEach((a) => {
      const vals = a.values.slice(0, 2);
      combos = combos.flatMap((c) => vals.map((v) => [...c, { name: a.name, value: v.value }]));
    });
    const n = combos.length;
    combos.forEach((c, i) => {
      const label = c.length ? c.map((x) => x.value).join(" / ") : "Default";
      out.push({
        id: `${p.id}~${i + 1}`,
        productId: p.id,
        label,
        attrs: c,
        sku: n > 1 ? `${p.sku}-${String(i + 1).padStart(2, "0")}` : p.sku,
        barcode: `33461${String(pi * 10 + i + 1).padStart(8, "0")}`,
        price: p.price,
        offer: p.offer,
        stock: split(p.stock, n, i),
        sold: split(p.sold || 0, n, i),
        name: [c.length ? `${p.name} — ${label}` : p.name, p.nameAr],
        shortDesc: ["", ""],
        desc: ["", ""],
        images: [],
        alt: ["", ""],
        weight: "",
        length: "",
        width: "",
        height: "",
        seoTitle: ["", ""],
        meta: ["", ""],
        url: slugify(`${p.name} ${label === "Default" ? "" : label}`),
      });
    });
  });
  return out;
}

let edits: Record<string, VariantEdit> = {};
const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const NO_EDITS: Record<string, VariantEdit> = {};

/** Variants with the saved edits applied. Pass the original product rows so the split stays stable. */
export function useVariants(products: ProductRow[], attributes: AttributeRow[]): Variant[] {
  const e = useSyncExternalStore(
    sub,
    () => edits,
    () => NO_EDITS,
  );
  const base = useMemo(() => buildVariants(products, attributes), [products, attributes]);
  return useMemo(() => base.map((v) => (e[v.id] ? { ...v, ...e[v.id] } : v)), [base, e]);
}
export function editVariants(next: Record<string, VariantEdit>) {
  const o = { ...edits };
  for (const id in next) o[id] = { ...o[id], ...next[id] };
  edits = o;
  listeners.forEach((l) => l());
}
