// Delivery zones and their areas, changed in this browser. An area belongs to exactly one zone.
// Swap these for API mutations later.
import { useMemo, useSyncExternalStore } from "react";
import type { ZoneRow } from "@/lib/api/section-types";

export type ZoneEdit = Partial<Omit<ZoneRow, "id">>;
let created: ZoneRow[] = [];
let edits: Record<string, ZoneEdit> = {};
let deleted: string[] = [];
const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());
const NO_ROWS: ZoneRow[] = [];
const NO_EDITS: Record<string, ZoneEdit> = {};
const NO_IDS: string[] = [];

export function useZones(rows: ZoneRow[]): ZoneRow[] {
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
      [...rows, ...c]
        .filter((z) => !d.includes(z.id))
        .map((z) => (e[z.id] ? { ...z, ...e[z.id] } : z)),
    [rows, c, e, d],
  );
}
export function addZone(z: ZoneRow) {
  created = [...created, z];
  emit();
}
export function editZone(id: string, patch: ZoneEdit) {
  edits = { ...edits, [id]: { ...edits[id], ...patch } };
  emit();
}
export function deleteZone(id: string) {
  deleted = [...deleted, id];
  emit();
}

const norm = (s: string) => s.trim().toLowerCase();
/** The zone that already owns this area (other than `exceptZoneId`), or undefined. */
export const areaOwner = (zones: ZoneRow[], area: string, exceptZoneId?: string) =>
  zones.find((z) => z.id !== exceptZoneId && z.areas.some((a) => norm(a) === norm(area)));
export const zoneNameTaken = (zones: ZoneRow[], name: string, exceptZoneId?: string) =>
  zones.some((z) => z.id !== exceptZoneId && norm(z.name) === norm(name));
