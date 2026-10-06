// Attribute (and attribute value) changes made in this browser — shared by the Attributes list,
// the attribute editor and the values manager. Swap these for API mutations later.
import { useMemo, useSyncExternalStore } from "react";
import type { AttributeRow, AttributeValueRow } from "@/lib/api/section-types";

export type AttributeEdit = Partial<Omit<AttributeRow, "id">>;
let created: AttributeRow[] = [];
let edits: Record<string, AttributeEdit> = {};
let deleted: string[] = [];
const listeners = new Set<() => void>();
const sub = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const emit = () => listeners.forEach((l) => l());
const NO_ROWS: AttributeRow[] = [];
const NO_EDITS: Record<string, AttributeEdit> = {};
const NO_IDS: string[] = [];

export function useAttributes(rows: AttributeRow[]): AttributeRow[] {
  const c = useSyncExternalStore(sub, () => created, () => NO_ROWS);
  const e = useSyncExternalStore(sub, () => edits, () => NO_EDITS);
  const d = useSyncExternalStore(sub, () => deleted, () => NO_IDS);
  return useMemo(() => [...c, ...rows].filter((r) => !d.includes(r.id)).map((r) => {
    const x = e[r.id];
    return x ? { ...r, ...x } : r;
  }), [c, rows, e, d]);
}

export function addAttribute(a: AttributeRow) { created = [a, ...created]; emit(); }
export function editAttribute(id: string, e: AttributeEdit) { edits = { ...edits, [id]: { ...edits[id], ...e } }; emit(); }
export function deleteAttribute(id: string) { deleted = [...deleted, id]; emit(); }

export function addAttributeValue(attribute: AttributeRow, value: AttributeValueRow) {
  editAttribute(attribute.id, { values: [...attribute.values, value] });
}
export function updateAttributeValue(attribute: AttributeRow, valueId: string, patch: Partial<AttributeValueRow>) {
  editAttribute(attribute.id, { values: attribute.values.map((v) => (v.id === valueId ? { ...v, ...patch } : v)) });
}
export function deleteAttributeValue(attribute: AttributeRow, valueId: string) {
  editAttribute(attribute.id, { values: attribute.values.filter((v) => v.id !== valueId) });
}
