// Product changes made in this browser — shared by the Products list and the product editor,
// so a switch flipped in one place shows in the other. Swap these for API mutations later.
import { useMemo, useSyncExternalStore } from "react";
import type { ProductRow } from "@/lib/api/section-types";
import type { Tone } from "@/lib/api/types";

export type ProductEdit = Partial<Omit<ProductRow, "id">>;
let created: ProductRow[] = [];
let edits: Record<string, ProductEdit> = {};
let deleted: string[] = [];
/** Units added back by returns, by SKU. */
let restocked: Record<string, number> = {};
const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());
const NO_ROWS: ProductRow[] = [];
const NO_EDITS: Record<string, ProductEdit> = {};
const NO_IDS: string[] = [];
const NO_STOCK: Record<string, number> = {};

export const stockLabel = (n: number) =>
  n === 0 ? "Out of stock" : n <= 2 ? "Low stock" : "In stock";
const TONE: Record<string, Tone> = {
  "In stock": "ok",
  "Low stock": "warn",
  "Out of stock": "bad",
  Draft: "mute",
};
/** The status badge follows the draft flag and stock. */
export const statusOf = (stock: number, isDraft: boolean) => {
  const l = isDraft ? "Draft" : stockLabel(stock);
  return { label: l, tone: TONE[l] ?? "mute" };
};

export function useProducts(rows: ProductRow[]): ProductRow[] {
  const c = useSyncExternalStore(
    sub,
    () => created,
    () => NO_ROWS,
  );
  const e = useSyncExternalStore(
    sub,
    () => edits,
    () => NO_EDITS,
  );
  const d = useSyncExternalStore(
    sub,
    () => deleted,
    () => NO_IDS,
  );
  const back = useSyncExternalStore(
    sub,
    () => restocked,
    () => NO_STOCK,
  );
  return useMemo(
    () =>
      [...c, ...rows]
        .filter((r) => !d.includes(r.id))
        .map((r) => {
          const x = e[r.id];
          const add = back[r.sku] ?? 0;
          if (!x && !add) return r;
          const m = { ...r, ...x };
          const stock = m.stock + add;
          return { ...m, stock, status: statusOf(stock, m.isDraft) };
        }),
    [c, rows, e, d, back],
  );
}
export function editProduct(id: string, e: ProductEdit) {
  edits = { ...edits, [id]: { ...edits[id], ...e } };
  emit();
}
/** A returned item that passed inspection goes back into Inventory. */
export function addStock(sku: string, qty: number) {
  restocked = { ...restocked, [sku]: (restocked[sku] ?? 0) + qty };
  emit();
}
export function editProducts(next: Record<string, ProductEdit>) {
  const o = { ...edits };
  for (const id in next) o[id] = { ...o[id], ...next[id] };
  edits = o;
  emit();
}
export function addProduct(p: ProductRow) {
  created = [p, ...created];
  emit();
}
export function deleteProduct(id: string) {
  deleted = [...deleted, id];
  emit();
}
