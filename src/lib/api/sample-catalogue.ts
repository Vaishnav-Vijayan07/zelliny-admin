// Fills each category up to its product count with deterministic sample products
// (ported from the prototype's v23 generator). Remove once the real catalogue API is connected.
import { BRANDS, CATS, PRODUCTS } from "./sample-records";

export type Gender = "Women" | "Men" | "Unisex";
export interface SampleProduct {
  id: string;
  sku: string;
  en: string;
  ar: string;
  brand: string;
  cat: string;
  mode: string;
  price: number | null;
  offer: number | null;
  stock: number;
  sold: number;
  status: string;
  img: string;
  enq?: number;
  gender?: Gender;
}

interface Spec {
  brand: string;
  en: string;
  ar?: string;
  line?: string;
  ml?: number;
}

let seed = 20260924;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)]!;
const shuffle = <T>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};
const cross = (...ls: unknown[][]): unknown[][] =>
  ls.reduce<unknown[][]>((acc, l) => acc.flatMap((a) => l.map((b) => [...a, b])), [[]]);
const brandOf = (id: string) => BRANDS.find((b) => b.id === id) ?? { en: id, ar: "" };

const FR_CONC: [string, string, string][] = [
  ["Eau de Parfum", "أو دي بارفان", "EDP"],
  ["Eau de Toilette", "أو دي تواليت", "EDT"],
  ["Parfum", "بارفان", "PAR"],
];
const FR: Record<string, string[]> = {
  hermes: [
    "Terre d'Hermès",
    "Twilly d'Hermès",
    "Un Jardin sur le Nil",
    "H24",
    "Eau des Merveilles",
    "Hermès Voyage",
  ],
  gucci: [
    "Gucci Bloom",
    "Gucci Guilty",
    "Gucci Flora Gorgeous Gardenia",
    "Gucci Mémoire d'une Odeur",
  ],
  burberry: ["Burberry Her", "Burberry Hero", "Burberry Goddess", "Mr. Burberry"],
  herrera: ["Good Girl", "Bad Boy", "212 VIP", "CH"],
  versace: ["Versace Eros", "Versace Bright Crystal", "Versace Dylan Blue", "Versace Pour Homme"],
  rabanne: ["1 Million", "Invictus", "Phantom", "Fame", "Olympéa"],
  dg: ["Light Blue", "The One", "K by Dolce & Gabbana", "Devotion"],
  chloe: ["Chloé Nomade", "Chloé Rose Tangerine", "Chloé L'Eau"],
  davidoff: ["Cool Water", "The Game", "Run Wild"],
};
const WOMEN =
  /Twilly|Merveilles|Bloom|Flora|Her$|Goddess|Good Girl|Bright Crystal|Fame|Olympéa|Light Blue|Devotion|Chloé/;
const MEN =
  /Terre|H24|Hero|Mr\. Burberry|Bad Boy|Eros|Dylan|Pour Homme|1 Million|Invictus|Phantom|K by|Cool Water|The Game|Run Wild/;
const TYPE_AR: [RegExp, string][] = [
  [/Necklace|Pendant/, "قلادة"],
  [/Earrings/, "أقراط"],
  [/Bracelet/, "سوار"],
  [/Ring$/, "خاتم"],
  [/Watch/, "ساعة"],
  [/Tote|Bag|Satchel/, "حقيبة"],
  [/Wallet|Coin/, "محفظة"],
  [/Card Holder/, "حامل بطاقات"],
  [/Money Clip/, "مشبك نقود"],
  [/Key Ring/, "حلقة مفاتيح"],
  [/Passport/, "حافظة جواز سفر"],
  [/Fountain/, "قلم حبر"],
  [/Rollerball/, "قلم رولربول"],
  [/Ballpoint/, "قلم جاف"],
  [/Lighter/, "ولاعة"],
  [/Cutter/, "قطاعة سيجار"],
  [/Case/, "علبة سيجار"],
  [/Serum/, "سيروم"],
  [/Cream|Balm|Lotion/, "كريم"],
  [/Oil/, "زيت"],
  [/Lip|Rouge/, "أحمر شفاه"],
  [/Mascara/, "ماسكارا"],
  [/Foundation/, "كريم أساس"],
  [/Cleanser|Gel/, "غسول"],
];
const typeAr = (n: string) => (TYPE_AR.find((t) => t[0].test(n)) ?? [0, "منتج"])[1];

const s = (x: unknown) => x as string;
const SPEC: Record<string, () => Spec[]> = {
  fragrance: () =>
    Object.entries(FR).flatMap(([b, lines]) =>
      cross(lines, FR_CONC, [30, 50, 100])
        .filter(([, c, ml]) => !((c as string[])[2] === "PAR" && ml === 30))
        .map(([l, c, ml]) => {
          const cc = c as string[];
          return {
            brand: b,
            en: `${s(l)} ${cc[0]} ${ml}ml`,
            ar: `${brandOf(b).ar} ${s(l)} ${cc[1]} ${ml} مل`,
            line: s(l),
            ml: ml as number,
          };
        }),
    ),
  beauty: () =>
    cross(
      [
        "Double Serum",
        "Extra-Firming Day Cream",
        "Extra-Firming Night Cream",
        "Hydra-Essentiel Cream",
        "Beauty Flash Balm",
        "Lip Comfort Oil",
        "Total Eye Lift",
        "Multi-Active Day Cream",
        "Multi-Active Night Cream",
        "Super Restorative Serum",
        "Tonic Body Treatment Oil",
        "Gentle Foaming Cleanser",
        "Hydrating Toning Lotion",
        "Blue Orchid Face Treatment Oil",
        "Lotus Face Treatment Oil",
        "Moisture-Rich Body Lotion",
        "Hand and Nail Treatment Cream",
        "Men Energizing Gel",
        "Joli Rouge Lipstick",
        "Skin Illusion Foundation",
        "Wonder Perfect Mascara 4D",
      ],
      ["15ml", "30ml", "50ml", "75ml"],
    ).map(([l, v]) => ({
      brand: "clarins",
      en: `Clarins ${s(l)} ${s(v)}`,
      ar: `${typeAr(s(l))} كلارنس ${s(l)} ${s(v).replace("ml", " مل")}`,
    })),
  jewellery: () => [
    ...cross(
      ["Millenia", "Constella", "Matrix", "Stilla", "Dextera", "Attract", "Una", "Mesmera"],
      ["Necklace", "Earrings", "Bracelet", "Ring"],
      ["Rhodium", "Gold-Tone"],
    ).map(([l, t, c]) => ({ brand: "swarovski", en: `Swarovski ${s(l)} ${s(t)}, ${s(c)}` })),
    ...cross(
      ["Guess 4G Logo", "Guess Rolling Hearts", "Guess Studs Party", "Guess Endless Dream"],
      ["Necklace", "Earrings", "Bracelet"],
      ["Gold-Tone", "Silver-Tone"],
    ).map(([l, t, c]) => ({ brand: "guess", en: `${s(l)} ${s(t)}, ${s(c)}` })),
  ],
  watches: () =>
    cross(
      [
        "Guess Cosmo",
        "Guess Luna",
        "Guess Gala",
        "Guess Soiree",
        "Guess Momentum",
        "Guess Legacy",
        "Guess Zeus",
        "Guess Indy",
        "Guess Crown Jewel",
        "GC Sport Chic",
        "GC Coussin",
        "GC Structura",
      ],
      ["Gold-Tone", "Silver-Tone", "Rose Gold-Tone", "Black"],
    ).map(([l, c]) => ({ brand: "guess", en: `${s(l)} ${s(c)} Watch` })),
  bags: () => [
    ...cross(
      ["GG Marmont", "Ophidia", "Jackie 1961", "Dionysus", "Horsebit 1955"],
      ["Shoulder Bag", "Mini Bag", "Tote"],
    ).map(([l, t]) => ({ brand: "gucci", en: `Gucci ${s(l)} ${s(t)}` })),
    ...cross(
      ["Guess Noelle", "Guess Vikky", "Guess Katey", "Guess Silvana", "Guess Cordelia"],
      ["Tote", "Crossbody Bag", "Satchel"],
    ).map(([l, t]) => ({ brand: "guess", en: `${s(l)} ${s(t)}` })),
  ],
  leather: () => [
    ...cross(
      [
        "Hugo Boss Classic",
        "Hugo Boss Label",
        "Hugo Boss Iconic",
        "Hugo Boss Grained",
        "Hugo Boss Gear Matrix",
        "Hugo Boss Contour",
      ],
      ["Leather Wallet", "Card Holder", "Coin Wallet", "Money Clip", "Key Ring", "Passport Holder"],
    ).map(([l, t]) => ({ brand: "hugoboss", en: `${s(l)} ${s(t)}` })),
    ...cross(
      ["Cerruti 1881 Ribbon", "Cerruti 1881 Castle", "Cerruti 1881 Ascot", "Cerruti 1881 Shadow"],
      ["Leather Wallet", "Card Holder", "Coin Wallet", "Key Ring", "Passport Holder"],
    ).map(([l, t]) => ({ brand: "cerruti", en: `${s(l)} ${s(t)}` })),
  ],
  writing: () => [
    ...cross(
      [
        "Hugo Boss Gear Matrix",
        "Hugo Boss Gear Ribs",
        "Hugo Boss Gear Icon",
        "Hugo Boss Contour",
        "Hugo Boss Label",
        "Hugo Boss Iconic",
        "Hugo Boss Explore",
        "Hugo Boss Formation",
      ],
      ["Ballpoint Pen", "Rollerball Pen", "Fountain Pen"],
      ["Black", "Chrome", "Gunmetal", "Navy"],
    ).map(([l, t, c]) => ({ brand: "hugoboss", en: `${s(l)} ${s(t)}, ${s(c)}` })),
    ...cross(
      ["S.T. Dupont Line D", "S.T. Dupont Défi", "S.T. Dupont D-Initial", "S.T. Dupont Liberté"],
      ["Ballpoint Pen", "Rollerball Pen", "Fountain Pen"],
      ["Black Lacquer", "Palladium", "Gold"],
    ).map(([l, t, c]) => ({ brand: "dupont", en: `${s(l)} ${s(t)}, ${s(c)}` })),
  ],
  smoking: () =>
    cross(
      [
        "Ligne 2 Lighter",
        "Slim 7 Lighter",
        "Maxijet Lighter",
        "Le Grand Lighter",
        "Défi Extrême Lighter",
        "Cigar Cutter",
        "Cigar Case",
      ],
      ["Palladium", "Gold", "Black Lacquer", "Guilloché"],
    ).map(([l, c]) => ({ brand: "dupont", en: `S.T. Dupont ${s(l)}, ${s(c)}` })),
};
const PRICE: Record<string, [number, number]> = {
  fragrance: [3900, 12500],
  beauty: [1450, 6800],
  jewellery: [3900, 14500],
  watches: [7900, 24000],
  bags: [6500, 19500],
  leather: [1900, 6500],
  writing: [2400, 9500],
  smoking: [9500, 38000],
};
const PAL: Record<string, string[]> = {
  fragrance: [
    "#c9b9a6",
    "#e4c6c6",
    "#2b2f45",
    "#6fa3a8",
    "#c7a24a",
    "#e8d8c3",
    "#9fb3c8",
    "#d8b4a0",
  ],
  beauty: ["#f1e3dc", "#e9d5d0", "#d9c3b8", "#c9a99a"],
  jewellery: ["#d9dde3", "#cfd4dc", "#e2d6b8", "#c8b27a"],
  watches: ["#b89556", "#9aa0a6", "#caa27a", "#2c2c2c"],
  bags: ["#6b4f3a", "#3c3c3c", "#a4825f", "#d7c3a5"],
  leather: ["#1f1f1f", "#4a3526", "#5b4636", "#2d2a28"],
  writing: ["#3a3a3a", "#5a5f66", "#2c2c34", "#8c8c8c"],
  smoking: ["#a8a8a8", "#c7a24a", "#1d1d1d", "#8a8a8a"],
};
const CODE: Record<string, string> = {
  hermes: "HER",
  gucci: "GUC",
  clarins: "CLA",
  hugoboss: "HB",
  cerruti: "CER",
  dupont: "STD",
  guess: "GUE",
  swarovski: "SWA",
  burberry: "BUR",
  herrera: "CH",
  versace: "VER",
  rabanne: "PR",
  dg: "DG",
  chloe: "CHL",
  davidoff: "DAV",
};
const ENQ_BRANDS = ["hugoboss", "cerruti", "dupont"];

function generate(): SampleProduct[] {
  const out: SampleProduct[] = [];
  let pid = 2001;
  const names = new Set<string>(PRODUCTS.map((p) => p.en.toLowerCase()));
  for (const c of CATS) {
    const have = PRODUCTS.filter((p) => p.cat === c.id).length;
    const need = Math.max(0, (c.count || 0) - have);
    const spec = SPEC[c.id];
    if (!need || !spec) continue;
    const pool = shuffle(spec().filter((x) => !names.has(x.en.toLowerCase()))).slice(0, need);
    for (const x of pool) {
      names.add(x.en.toLowerCase());
      const enqOnly = c.id === "smoking" || (ENQ_BRANDS.includes(x.brand) && rnd() < 0.78);
      const [lo, hi] = PRICE[c.id]!;
      let price = Math.round((lo + (hi - lo) * Math.pow(rnd(), 1.4)) / 50) * 50;
      if (x.ml)
        price = Math.round((price * (x.ml === 30 ? 0.62 : x.ml === 50 ? 0.82 : 1)) / 50) * 50;
      if (x.brand === "gucci" && c.id === "bags")
        price = Math.round((42000 + rnd() * 68000) / 500) * 500;
      if (x.brand === "dupont" && c.id === "writing")
        price = Math.round((11500 + rnd() * 26000) / 500) * 500;
      const r = rnd();
      const stock =
        r < 0.06 ? 0 : r < 0.12 ? 1 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 38);
      const id = pid++;
      const b = brandOf(x.brand);
      const offer = !enqOnly && rnd() < 0.14 ? Math.round((price * 0.92) / 50) * 50 : null;
      const sold = enqOnly
        ? 0
        : x.brand === "gucci" && c.id === "bags"
          ? Math.floor(rnd() * 2)
          : Math.floor(
              Math.pow(rnd(), 2.2) *
                14 *
                Math.min(c.id === "beauty" ? 0.8 : 2.2, Math.pow(4200 / price, 1.3)),
            );
      const status = rnd() < 0.03 ? "Draft" : "Active";
      const p: SampleProduct = {
        id: `P${id}`,
        sku: `${CODE[x.brand] ?? "ZL"}-${String(id).slice(1)}`,
        en: x.en,
        ar: x.ar ?? `${typeAr(x.en)} ${b.ar} ${x.en.replace(b.en, "").trim()}`,
        brand: x.brand,
        cat: c.id,
        mode: enqOnly ? "Enquiry only" : "Add to Cart",
        price: enqOnly ? null : price,
        offer,
        stock,
        sold,
        status,
        img: pick(PAL[c.id]!),
      };
      if (enqOnly) p.enq = 1 + Math.floor(Math.pow(rnd(), 1.8) * 12);
      else if (ENQ_BRANDS.includes(x.brand) || c.id === "watches" || c.id === "jewellery") {
        if (rnd() < 0.3) p.enq = 1 + Math.floor(rnd() * 4);
      }
      p.gender =
        c.id === "fragrance"
          ? WOMEN.test(x.line ?? "")
            ? "Women"
            : MEN.test(x.line ?? "")
              ? "Men"
              : "Unisex"
          : "Unisex";
      out.push(p);
    }
  }
  return out;
}

export const GENERATED_PRODUCTS: SampleProduct[] = generate();

/** Genders for the prototype's original sample products. */
export const SAMPLE_GENDER: Record<string, Gender> = {
  P1001: "Men",
  P1002: "Women",
  P1003: "Women",
  P1004: "Men",
  P1005: "Men",
  P1006: "Women",
  P1007: "Unisex",
  P1008: "Men",
  P1009: "Unisex",
  P1010: "Women",
  P1011: "Women",
  P1012: "Women",
  P1013: "Women",
  P1014: "Women",
  P1015: "Unisex",
  P1016: "Men",
  P1017: "Unisex",
  P1018: "Unisex",
  P1019: "Unisex",
  P1020: "Women",
  P1021: "Unisex",
};
