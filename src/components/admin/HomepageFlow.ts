// Homepage layout (section order, on/off, listed categories / products / maisons, text) kept in this browser.
// Swap for API calls later.
import { useSyncExternalStore } from "react";

export type SectionKey =
  | "hero"
  | "categories"
  | "occasion"
  | "curated"
  | "lifestyle"
  | "maisons"
  | "business"
  | "packaging"
  | "concierge";
export interface Copy {
  title: string;
  titleAr: string;
  sub: string;
  subAr: string;
}
export interface Tile {
  name: string;
  desc: string;
}
export interface HeroItem {
  id: string;
  kind: "image" | "video";
  src: string | null;
  name: string;
  seconds: number;
}
export interface HomeState {
  order: SectionKey[];
  on: Record<SectionKey, boolean>;
  categories: string[];
  products: string[];
  maisons: string[];
  copy: Record<SectionKey, Copy>;
  hero: HeroItem[];
  business: Tile[];
  packaging: Tile[];
}

export const SECTION_INFO: Record<SectionKey, { name: string; hint: string }> = {
  hero: { name: "Hero banner", hint: "Full-width image or video at the top, with the headline" },
  categories: { name: "Shop by category", hint: "Photo tiles for the categories you list" },
  occasion: {
    name: "One house for every occasion",
    hint: "Wide banner image with a ribbon-and-box photo",
  },
  curated: { name: "Curated for You", hint: "A scrolling row of the products you pick" },
  lifestyle: {
    name: "Luxury, thoughtfully selected",
    hint: "Wide lifestyle photo with a line of text",
  },
  maisons: { name: "The Maisons — Houses we curate", hint: "Logos of the maisons you list" },
  business: { name: "Zelliny for Business", hint: "Corporate gifting panels" },
  packaging: {
    name: "Signature Packaging",
    hint: "Ribbon wrapping, embossing and engraving tiles",
  },
  concierge: {
    name: "The Zelliny Concierge",
    hint: "Closing banner with a button to speak to the team",
  },
};

const c = (title: string, sub = "", titleAr = "", subAr = ""): Copy => ({
  title,
  titleAr,
  sub,
  subAr,
});
let state: HomeState = {
  order: [
    "hero",
    "categories",
    "occasion",
    "curated",
    "lifestyle",
    "maisons",
    "business",
    "packaging",
    "concierge",
  ],
  on: {
    hero: true,
    categories: true,
    occasion: true,
    curated: true,
    lifestyle: true,
    maisons: true,
    business: true,
    packaging: true,
    concierge: true,
  },
  categories: [
    "fragrance",
    "beauty",
    "jewellery",
    "watches",
    "bags",
    "leather",
    "writing",
    "smoking",
  ],
  products: ["P1014", "P1001", "P1018", "P1013"],
  maisons: ["burberry", "clarins", "cerruti", "hugoboss", "guess"],
  copy: {
    hero: c("HOUSE OF ZELLINY", "A GIFT TO REMEMBER", "بيت زيليني", "هدية لا تُنسى"),
    categories: c("Shop by Category", "The Collection", "تسوق حسب الفئة", "المجموعة"),
    occasion: c(
      "One house for every occasion",
      "House of Zelliny",
      "بيت واحد لكل مناسبة",
      "بيت زيليني",
    ),
    curated: c("Curated for You", "", "مختارات لك"),
    lifestyle: c("Luxury, thoughtfully selected", "", "فخامة مختارة بعناية"),
    maisons: c("Houses we curate", "The Maisons", "البيوت التي نختارها", "الدور"),
    business: c(
      "Luxury gifting for relationships that matter most",
      "Zelliny for Business",
      "هدايا فاخرة للعلاقات الأهم",
      "زيليني للأعمال",
    ),
    packaging: c(
      "Every gift, crafted with intention",
      "Signature Packaging",
      "كل هدية صُنعت بعناية",
      "التغليف المميز",
    ),
    concierge: c(
      "A personal service, start to finish",
      "The Zelliny Concierge",
      "خدمة شخصية من البداية للنهاية",
      "كونسيرج زيليني",
    ),
  },
  hero: [
    { id: "h1", kind: "video", src: null, name: "hero-desktop.mp4", seconds: 0 },
    { id: "h2", kind: "image", src: null, name: "autumn-gifting.jpg", seconds: 5 },
  ],
  business: [
    { name: "Client Appreciation", desc: "Thank the clients who matter" },
    { name: "Employee Recognition", desc: "Reward your team" },
    { name: "Executive & VIP Gifts", desc: "Considered gifts for leaders" },
  ],
  packaging: [
    { name: "Ribbon wrapping", desc: "Custom ribbon wrapping with your branding" },
    { name: "Embossing", desc: "Embossed logo with your company name" },
    { name: "Engraving", desc: "Personalized engraving and bespoke finishing" },
  ],
};

const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const set = (s: HomeState) => {
  state = s;
  listeners.forEach((l) => l());
};
export const useHome = () =>
  useSyncExternalStore(
    sub,
    () => state,
    () => state,
  );

export const reorder = <T>(list: T[], from: number, to: number) => {
  const n = [...list];
  const [x] = n.splice(from, 1);
  if (x !== undefined) n.splice(to, 0, x);
  return n;
};

export const setOrder = (order: SectionKey[]) => set({ ...state, order });
export const toggleSection = (k: SectionKey) =>
  set({ ...state, on: { ...state.on, [k]: !state.on[k] } });
export const setList = (k: "categories" | "products" | "maisons", ids: string[]) =>
  set({ ...state, [k]: ids });
export const setCopy = (k: SectionKey, patch: Partial<Copy>) =>
  set({ ...state, copy: { ...state.copy, [k]: { ...state.copy[k], ...patch } } });
export const setTiles = (k: "business" | "packaging", tiles: Tile[]) =>
  set({ ...state, [k]: tiles });
export const setHero = (hero: HeroItem[]) => set({ ...state, hero });
