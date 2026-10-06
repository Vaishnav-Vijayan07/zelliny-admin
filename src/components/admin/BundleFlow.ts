// Bundle / gift-set changes made in this browser — shared by the list and the editor. Swap for API mutations later.
import { useMemo, useSyncExternalStore } from "react";
import type { BundleRow, ProductRow } from "@/lib/api/section-types";

export const unitPrice = (p: ProductRow | undefined) => (p ? (p.offer ?? p.price ?? 0) : 0);

export type BundleEdit = Partial<Omit<BundleRow, "id">>;
let created: BundleRow[] = [];
let edits: Record<string, BundleEdit> = {};
const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());
const NO_ROWS: BundleRow[] = [];
const NO_EDITS: Record<string, BundleEdit> = {};

export function useBundles(rows: BundleRow[]): BundleRow[] {
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
  return useMemo(
    () => [...c, ...rows].map((r) => (e[r.id] ? { ...r, ...e[r.id] } : r)),
    [c, rows, e],
  );
}
export function addBundle(b: BundleRow) {
  created = [b, ...created];
  emit();
}
export function editBundle(id: string, e: BundleEdit) {
  edits = { ...edits, [id]: { ...edits[id], ...e } };
  emit();
}
