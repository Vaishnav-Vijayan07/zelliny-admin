// Gift service switches and options changed in this browser. Swap for API mutations later.
import { useSyncExternalStore } from "react";

export interface GiftService { name: string; nameAr: string; price: string; desc: string; color: string; on: boolean }
export interface GiftState { live: { wrap: boolean; pers: boolean }; wrap: GiftService[]; pers: GiftService[] }

let state: GiftState = {
  live: { wrap: true, pers: true },
  wrap: [
    { name: "Ribbon wrapping", nameAr: "تغليف بالشريط", price: "Complimentary", desc: "Black box, ivory ribbon, Zelliny seal", color: "#1a1a1a", on: true },
    { name: "Gift message card", nameAr: "بطاقة إهداء", price: "Complimentary", desc: "Up to 200 characters · printed, not handwritten", color: "#5a5a5a", on: true },
    { name: "Hide prices on invoice", nameAr: "إخفاء الأسعار", price: "Complimentary", desc: "Invoice in the parcel shows no prices", color: "#8a8a8a", on: true },
    { name: "Signature box upgrade", nameAr: "صندوق فاخر", price: "450 EGP", desc: "Rigid keepsake box with magnetic lid", color: "#b8a88f", on: false },
  ],
  pers: [
    { name: "Engraving", nameAr: "الحفر", price: "350 EGP", desc: "Up to 20 characters · 1 or 2 lines · +2 working days", color: "#3a3a3a", on: true },
    { name: "Embossing", nameAr: "النقش البارز", price: "250 EGP", desc: "Up to 3 initials on leather · +2 working days", color: "#6b5a48", on: true },
  ],
};
const listeners = new Set<() => void>();
const sub = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const set = (s: GiftState) => { state = s; listeners.forEach((l) => l()); };

export const useGift = () => useSyncExternalStore(sub, () => state, () => state);
export const setSection = (k: "wrap" | "pers", on: boolean) => set({ ...state, live: { ...state.live, [k]: on } });
export const editService = (k: "wrap" | "pers", i: number, patch: Partial<GiftService>) =>
  set({ ...state, [k]: state[k].map((s, n) => (n === i ? { ...s, ...patch } : s)) });
