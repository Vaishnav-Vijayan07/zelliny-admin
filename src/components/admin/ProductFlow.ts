// Product changes made in this browser — shared by the Products list and the product editor,
// so a switch flipped in one place shows in the other. Swap these for API mutations later.
import { useMemo, useSyncExternalStore } from "react";
import type { ProductRow } from "@/lib/api/section-types";
import type { Tone } from "@/lib/api/types";

export type ProductEdit = Partial<Omit<ProductRow, "id">>;
let created: ProductRow[] = [];
let edits: Record<string, ProductEdit> = {};
let deleted: string[] = [];
const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());
const NO_ROWS: ProductRow[] = [];
const NO_EDITS: Record<string, ProductEdit> = {};
const NO_IDS: string[] = [];

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
  return useMemo(
    () =>
      [...c, ...rows]
        .filter((r) => !d.includes(r.id))
        .map((r) => {
          const x = e[r.id];
          if (!x) return r;
          const m = { ...r, ...x };
          return { ...m, status: statusOf(m.stock, m.isDraft) };
        }),
    [c, rows, e, d],
  );
}
export function editProduct(id: string, e: ProductEdit) {
  edits = { ...edits, [id]: { ...edits[id], ...e } };
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
