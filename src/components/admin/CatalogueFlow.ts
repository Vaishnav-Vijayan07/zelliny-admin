// Show/hide switches for whole categories and maisons, made in this browser — shared by
// Categories, Maisons and Selling control. Swap for API mutations later.
import { useMemo, useSyncExternalStore } from "react";
import type { BrandRow, CategoryRow, ProductRow } from "@/lib/api/section-types";
import { editProducts, useProducts, type ProductEdit } from "@/components/admin/ProductFlow";

type Vis = Record<string, boolean>;
let cats: Vis = {};
let brands: Vis = {};
const listeners = new Set<() => void>();
const sub = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const emit = () => listeners.forEach((l) => l());
const NONE: Vis = {};

export type LiveCategory = CategoryRow & { visible: boolean };
export type LiveBrand = BrandRow & { visible: boolean };

export function setCategoryVisible(id: string, v: boolean) { cats = { ...cats, [id]: v }; emit(); }
export function setBrandVisible(id: string, v: boolean) { brands = { ...brands, [id]: v }; emit(); }

type CatEdit = Partial<Omit<CategoryRow, "id">>;
type BrandEdit = Partial<Omit<BrandRow, "id">>;
let newCats: CategoryRow[] = [];
let newBrands: BrandRow[] = [];
let catEdits: Record<string, CatEdit> = {};
let brandEdits: Record<string, BrandEdit> = {};
const NO_C: CategoryRow[] = [];
const NO_B: BrandRow[] = [];
const NO_CE: Record<string, CatEdit> = {};
const NO_BE: Record<string, BrandEdit> = {};

export function addCategory(r: CategoryRow) { newCats = [...newCats, r]; emit(); }
export function editCategory(id: string, e: CatEdit) { catEdits = { ...catEdits, [id]: { ...catEdits[id], ...e } }; emit(); }
export function addBrand(r: BrandRow) { newBrands = [...newBrands, r]; emit(); }
export function editBrand(id: string, e: BrandEdit) { brandEdits = { ...brandEdits, [id]: { ...brandEdits[id], ...e } }; emit(); }

export const isCart = (p: ProductRow) => p.mode === "Add to Cart";
/** Why a product is off the site because of its maison or category, or null. */
export const hiddenReason = (p: ProductRow, catOff: Set<string>, brandOff: Set<string>) =>
  brandOff.has(p.brand) ? `${p.brand} maison is off` : catOff.has(p.category) ? `${p.category} category is off` : null;

/** Categories, maisons and products with every local switch applied. */
export function useCatalogue(categories: CategoryRow[], brandRows: BrandRow[], productRows: ProductRow[]) {
  const c = useSyncExternalStore(sub, () => cats, () => NONE);
  const b = useSyncExternalStore(sub, () => brands, () => NONE);
  const nc = useSyncExternalStore(sub, () => newCats, () => NO_C);
  const nb = useSyncExternalStore(sub, () => newBrands, () => NO_B);
  const ce = useSyncExternalStore(sub, () => catEdits, () => NO_CE);
  const be = useSyncExternalStore(sub, () => brandEdits, () => NO_BE);
  const base = useProducts(productRows);
  return useMemo(() => {
    const catRename = new Map<string, string>();
    const brandRename = new Map<string, string>();
    categories.forEach((x) => { const n = ce[x.id]?.name; if (n && n !== x.name) catRename.set(x.name, n); });
    brandRows.forEach((x) => { const n = be[x.id]?.name; if (n && n !== x.name) brandRename.set(x.name, n); });
    const categoriesLive: LiveCategory[] = [...categories, ...nc].map((x) => { const m = { ...x, ...ce[x.id] }; return { ...m, visible: c[x.id] ?? m.status.label !== "Draft" }; });
    const brandsLive: LiveBrand[] = [...brandRows, ...nb].map((x) => { const m = { ...x, ...be[x.id] }; return { ...m, visible: b[x.id] ?? m.status.label !== "Draft" }; });
    const catOff = new Set(categoriesLive.filter((x) => !x.visible).map((x) => x.name));
    const brandOff = new Set(brandsLive.filter((x) => !x.visible).map((x) => x.name));
    const products = base.map((p) => {
      const q = { ...p, category: catRename.get(p.category) ?? p.category, brand: brandRename.get(p.brand) ?? p.brand };
      return { ...q, hiddenBy: hiddenReason(q, catOff, brandOff) ?? p.hiddenBy };
    });
    return { categories: categoriesLive, brands: brandsLive, products };
  }, [categories, brandRows, base, c, b, nc, nb, ce, be]);
}

/** Switch every priced product in the list to a selling mode. Returns how many changed / were skipped. */
export function bulkMode(list: ProductRow[], mode: "cart" | "enq") {
  const next: Record<string, ProductEdit> = {};
  let n = 0, skipped = 0;
  list.forEach((p) => {
    if (mode === "cart") { if (p.price) { next[p.id] = { mode: "Add to Cart" }; n++; } else skipped++; }
    else { next[p.id] = { mode: "Enquiry only" }; n++; }
  });
  editProducts(next);
  return { n, skipped };
}

/** "x Add to Cart · y Enquiry" scaled to the real product count of the group. */
export function mix(list: ProductRow[], total: number): [number, number] {
  if (!list.length) return [0, total];
  const c = Math.round((total * list.filter(isCart).length) / list.length);
  return [c, total - c];
}
