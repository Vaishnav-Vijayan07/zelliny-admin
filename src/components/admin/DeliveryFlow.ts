// Delivery zones and their areas, changed in this browser. An area belongs to exactly one zone.
// Swap these for API mutations later.
import { useMemo, useSyncExternalStore } from "react";
import type { CourierName, ZoneRow } from "@/lib/api/section-types";

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
  zones.find((z) => z.id !== exceptZoneId && z.areas.some((a) => norm(a.en) === norm(area)));
export const zoneNameTaken = (zones: ZoneRow[], name: string, exceptZoneId?: string) =>
  zones.some((z) => z.id !== exceptZoneId && norm(z.name) === norm(name));

/** "3–4 working days", shown in the list, the areas and at checkout. */
export const arrives = (z: Pick<ZoneRow, "etaFrom" | "etaTo">) =>
  `${z.etaFrom === z.etaTo ? z.etaFrom : `${z.etaFrom}–${z.etaTo}`} working days`;

/* ---------- couriers, delivery options and the no-delivery message ---------- */
export type Bi = [string, string];
export interface Courier {
  on: boolean;
  /** Bosta */
  key: string;
  /** Aramex */
  acc: string;
  pin: string;
  user: string;
  pass: string;
  def: boolean;
  pick: string;
  auto: boolean;
  sms: boolean;
}
export interface Store {
  id: string;
  n: Bi;
  ad: Bi;
  h: Bi;
  r: string;
}
const PICKUP = "12 Dr. Zakaria El Bardisi St., El Nozha El Gedida, Cairo";
export const SETTINGS = {
  noMsg: [
    "We don't deliver to your area yet. We're adding new areas soon.",
    "لا نوصّل إلى منطقتك حالياً. سنضيف مناطق جديدة قريباً.",
  ] as Bi,
  couriers: {
    Bosta: {
      on: true,
      key: "bst_live_••••••••4f2a",
      acc: "",
      pin: "",
      user: "",
      pass: "",
      def: true,
      pick: PICKUP,
      auto: true,
      sms: true,
    },
    Aramex: {
      on: false,
      key: "",
      acc: "",
      pin: "",
      user: "",
      pass: "",
      def: false,
      pick: PICKUP,
      auto: true,
      sms: true,
    },
  } as Record<CourierName, Courier>,
  sameDay: {
    on: true,
    fee: "250",
    cut: "14:00",
    zones: ["Z1", "Z2"],
    lab: ["Same-day delivery", "توصيل في نفس اليوم"] as Bi,
    note: [
      "Order before 2:00 pm, Sunday to Thursday",
      "اطلب قبل الساعة ٢ ظهراً، من الأحد إلى الخميس",
    ] as Bi,
  },
  store: { on: false, stores: [] as Store[] },
  cod: {
    on: false,
    max: "40000",
    msg: [
      "Cash on delivery isn't available for orders above 40,000 EGP. Please pay by card.",
      "الدفع عند الاستلام غير متاح للطلبات فوق ٤٠٬٠٠٠ ج.م. يرجى الدفع بالبطاقة.",
    ] as Bi,
  },
};
let version = 0;
export const bumpDelivery = () => {
  version++;
  emit();
};
export const useDeliverySettings = () =>
  useSyncExternalStore(
    sub,
    () => version,
    () => version,
  );
