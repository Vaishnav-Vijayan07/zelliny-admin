// Maps the prototype's sample records into the typed contracts in section-types.ts.
import type { Tone } from "./types";
import type * as T from "./section-types";
import {
  APPTS,
  BRANDS,
  BUNDLES,
  CATS,
  CUSTOMERS,
  DISCOUNTS,
  ENQUIRIES,
  ORDERS,
  PRODUCTS,
  RETURNS,
  STAFF,
  ZONES,
} from "./sample-records";
import { ACTIVITY_LOG } from "./activity-log";
import { GENERATED_PRODUCTS, SAMPLE_GENDER, type SampleProduct } from "./sample-catalogue";

const TONES: Record<string, Tone> = {
  Pending: "warn",
  Processing: "info",
  "Ready to ship": "info",
  Shipped: "info",
  Delivered: "ok",
  Cancelled: "mute",
  Returned: "mute",
  Paid: "ok",
  Unpaid: "warn",
  "Awaiting payment": "warn",
  Refunded: "mute",
  Requested: "warn",
  Inspecting: "info",
  Approved: "info",
  Received: "warn",
  Inspected: "warn",
  Rejected: "bad",
  "Return open": "warn",
  New: "warn",
  Contacted: "info",
  Quoted: "info",
  Negotiation: "warn",
  Won: "ok",
  Lost: "bad",
  Active: "ok",
  Draft: "mute",
  Scheduled: "info",
  Expired: "mute",
  VIP: "ok",
  Returning: "info",
  Confirmed: "ok",
  "In stock": "ok",
  "Low stock": "warn",
  "Out of stock": "bad",
  "Out for delivery": "info",
  Waiting: "warn",
};
const tag = (label: string): T.Tagged => ({ label, tone: TONES[label] ?? "mute" });
const cust = (id: string) => CUSTOMERS.find((c) => c.id === id)?.name ?? id;
const prod = (id: string) => PRODUCTS.find((p) => p.id === id);
const brand = (id: string) => BRANDS.find((b) => b.id === id)?.en ?? id;
const cat = (id: string) => CATS.find((c) => c.id === id)?.en ?? id;
const count = <X>(xs: X[], f: (x: X) => boolean) => xs.filter(f).length;

/* ---------- orders + returns sample (as in the prototype, v12–v14) ---------- */
type SampleOrder = (typeof ORDERS)[number] & { delivered?: string };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parseDay = (s: string) => {
  const m = s.match(/(\d{1,2}) (\w{3}) (\d{4})/);
  return m ? new Date(+m[3]!, MON.indexOf(m[2]!), +m[1]!) : null;
};
const fmtDay = (d: Date) => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
/** Returns windows are measured from this date in the sample data. Your API sends today's date. */
export const RETURNS_AS_OF = "25 Sep 2026";

/** Older delivered orders, so some can be returned and some are outside the window. */
const EXTRA_ORDERS: SampleOrder[] = (
  [
    [
      "ZL-10482",
      "C201",
      "18 Sep 2026, 14:20",
      [
        ["P1003", 1],
        ["P1010", 1],
      ],
      "Paymob · Card",
      "New Cairo",
      "19 Sep 2026",
    ],
    [
      "ZL-10481",
      "C207",
      "15 Sep 2026, 11:05",
      [["P1008", 2]],
      "Paymob · Wallet",
      "6th of October",
      "16 Sep 2026",
    ],
    [
      "ZL-10480",
      "C204",
      "10 Sep 2026, 19:40",
      [["P1013", 1]],
      "Paymob · Card",
      "Alexandria",
      "11 Sep 2026",
    ],
    [
      "ZL-10479",
      "C203",
      "2 Sep 2026, 12:15",
      [
        ["P1006", 1],
        ["P1021", 1],
      ],
      "Paymob · Card",
      "Heliopolis",
      "3 Sep 2026",
    ],
    [
      "ZL-10478",
      "C202",
      "14 Aug 2026, 16:30",
      [["P1004", 1]],
      "Paymob · Card",
      "Sheikh Zayed",
      "15 Aug 2026",
    ],
  ] as [string, string, string, [string, number][], string, string, string][]
).map(
  ([id, c, date, items, pay, zone, delivered]) =>
    ({
      id,
      cust: c,
      date,
      items,
      pay,
      zone,
      delivered,
      ship: 0,
      payStatus: "Paid",
      status: "Delivered",
      fulfil: "Courier",
      total: items.reduce((a, [p, q]) => a + ((prod(p)?.offer || prod(p)?.price) ?? 0) * q, 0),
    }) as unknown as SampleOrder,
);

type SampleReturn = {
  id: string;
  order: string;
  cust: string;
  items: [string, number][];
  reason: string;
  rule: string;
  kind: string;
  amount: number;
  status: string;
  date: string;
  via: string;
  photos: number;
  inspect: string | null;
  awb: string | null;
  refund: T.RefundRecord | null;
  log: T.OrderEvent[];
};
const ev = (text: string, when: string, who: string): T.OrderEvent => ({ text, when, who });
const RETURN_LOG: Record<string, T.OrderEvent[]> = {
  "RMA-2036": [
    ev("Return requested by customer", "20 Sep, 10:14", "Laila Abdelrahman"),
    ev("Approved · Changed mind · unopened", "20 Sep, 11:02", "Zain"),
    ev("Return pickup booked · AWB BST-88207741", "20 Sep, 11:02", "Bosta"),
    ev("Received at the office", "21 Sep, 15:40", "Ahmed"),
    ev("Inspected · sealed · back in stock", "21 Sep, 16:05", "Ahmed"),
    ev(
      "Refund issued · 8,400 EGP to Paymob · Wallet · ref PMB-RF-40218",
      "22 Sep, 11:05",
      "Ramy Bakr",
    ),
  ],
  "RMA-2035": [
    ev("Return requested by customer · 2 photos", "23 Sep, 09:30", "Nadine El-Sayed"),
    ev("Approved · Manufacturing defect", "23 Sep, 10:15", "Ramy Bakr"),
    ev("Return pickup booked · AWB BST-88213390", "23 Sep, 10:15", "Bosta"),
    ev("Received at the office", "24 Sep, 18:02", "Ahmed"),
  ],
  "RMA-2034": [
    ev("Return requested by customer", "23 Sep, 12:40", "Salma Fathy"),
    ev("Approved · Wrong item sent", "23 Sep, 13:10", "Zain"),
    ev("Return pickup booked · AWB BST-88213561", "23 Sep, 13:10", "Bosta"),
  ],
  "RMA-2033": [ev("Return requested by customer · 3 photos", "24 Sep, 08:55", "Omar Hassan")],
  "RMA-2032": [
    ev("Return requested by customer", "18 Sep, 21:10", "Omar Hassan"),
    ev("Rejected · opened fragrance is not returnable", "19 Sep, 09:40", "Zain"),
  ],
};
const RETURNS_ALL: SampleReturn[] = [
  ...RETURNS.map((r): SampleReturn => {
    const log = RETURN_LOG[r.id] ?? [];
    const awb = log.map((x) => x.text.match(/AWB (BST-\d+)/)?.[1]).find(Boolean) ?? null;
    return {
      id: r.id,
      order: r.order,
      cust: r.cust,
      items: [[r.item, 1]],
      rule: r.rule,
      amount: r.amount,
      date: r.date,
      reason:
        r.id === "RMA-2034"
          ? "Wrong item sent — received Burberry Her EDT instead of EDP"
          : r.reason,
      kind: r.rule.startsWith("Manufacturing")
        ? "Manufacturing defect"
        : r.id === "RMA-2034"
          ? "Wrong item sent"
          : "Changed mind · unopened, within 14 days",
      status: r.status === "Inspecting" ? "Received" : r.status,
      via: "Website form",
      photos: (log[0]?.text.match(/(\d) photos?/)?.[1] ?? 0) as number,
      inspect: r.status === "Refunded" ? "Perfect — back in stock" : null,
      awb,
      log,
      refund:
        r.id === "RMA-2036"
          ? {
              ref: "PMB-RF-40218",
              method: "Paymob · Wallet (original)",
              amount: 8400,
              by: "Ramy Bakr",
              when: "22 Sep 2026, 11:05",
            }
          : null,
    };
  }),
  {
    id: "RMA-2037",
    order: "ZL-10490",
    cust: "C205",
    items: [["P1012", 1]],
    reason: "Clasp stiff — defect",
    rule: "Manufacturing defect · within 30 days",
    kind: "Manufacturing defect",
    amount: 6900,
    status: "Requested",
    date: "24 Sep 2026",
    via: "Website form",
    photos: 1,
    inspect: null,
    awb: null,
    refund: null,
    log: [ev("Return requested by customer · 1 photo", "24 Sep, 19:20", "Laila Abdelrahman")],
  },
  {
    id: "RMA-2038",
    order: "ZL-10484",
    cust: "C206",
    items: [["P1007", 1]],
    reason: "Order cancelled before dispatch",
    rule: "Order cancelled",
    kind: "Order cancelled",
    amount: 6100,
    status: "Inspected",
    date: "21 Sep 2026",
    via: "Phone call",
    photos: 0,
    inspect: "Item never left · in stock",
    awb: null,
    refund: null,
    log: [
      ev("Order cancelled on customer request", "21 Sep, 10:30", "Ahmed"),
      ev("Approved · Order cancelled", "21 Sep, 10:31", "Ahmed"),
      ev("Item never left · confirmed in stock", "21 Sep, 10:40", "Ahmed"),
    ],
  },
];
const openReturn = (orderId: string) =>
  RETURNS_ALL.some((r) => r.order === orderId && !["Refunded", "Rejected"].includes(r.status));
/** Orders reflect their returns: an open return shows on the order, a rejected one leaves it Delivered. */
const ALL_ORDERS: SampleOrder[] = [...ORDERS, ...EXTRA_ORDERS].map((o) => {
  if (o.id === "ZL-10484") return o;
  if (openReturn(o.id)) return { ...o, status: "Return open" } as SampleOrder;
  if (o.id === "ZL-10489")
    return { ...o, status: "Delivered", delivered: "24 Sep 2026" } as SampleOrder;
  return o;
});
const deliveredOn = (o: SampleOrder) => {
  if (o.delivered) return o.delivered;
  const d = parseDay(o.date);
  if (!d) return null;
  d.setDate(d.getDate() + 1);
  return fmtDay(d);
};

const RETURN_TILES = [
  { key: "Requested", hint: "Customer asked · approve or reject", group: "Your team" },
  { key: "Approved", hint: "Bosta bringing it back", group: "Courier" },
  { key: "Received", hint: "At the office · inspect it", group: "Your team" },
  { key: "Inspected", hint: "Checked · refund is next", group: "Your team" },
  { key: "Refunded", hint: "Money returned · closed", group: "Closed" },
  { key: "Rejected", hint: "Not accepted · closed", group: "Closed" },
];
const RETURNS_POLICY = [
  {
    title: "Fragrance & beauty",
    text: "Returnable within 14 days of delivery — unopened, sealed, original packaging, invoice presented.",
  },
  { title: "Manufacturing defects", text: "Accepted within 30 days on all categories." },
  { title: "Not returnable", text: "Opened beauty, engraved or personalised pieces." },
  { title: "Watches & fine jewellery", text: "Manufacturing defects only." },
  { title: "Refund method", text: "Always to the original payment method." },
];

export function mockReturns(): T.ReturnsData {
  const rows: T.ReturnRow[] = RETURNS_ALL.map((r) => {
    const c = CUSTOMERS.find((x) => x.id === r.cust);
    const lines = orderLines(r.items);
    return {
      id: r.id,
      order: r.order,
      customer: c?.name ?? r.cust,
      item: lines[0]?.name ?? "",
      reason: r.reason,
      rule: r.rule,
      kind: r.kind,
      amount: r.amount,
      status: tag(r.status),
      date: r.date,
      lines,
      customerInfo: { id: r.cust, name: c?.name ?? r.cust, phone: c?.phone ?? "" },
      payment: ALL_ORDERS.find((o) => o.id === r.order)?.pay ?? "Paymob · Card",
      awb: r.awb,
      via: r.via,
      photos: Number(r.photos) || 0,
      inspect: r.inspect,
      refund: r.refund,
      log: r.log,
    };
  });
  const tiles = RETURN_TILES.map((t) => ({
    ...t,
    label: t.key,
    count: count(RETURNS_ALL, (r) => r.status === t.key),
  }));
  return { tiles, rows, asOf: RETURNS_AS_OF, policy: RETURNS_POLICY };
}

const ORDER_TILES = [
  { key: "Pending", hint: "New · confirm it", group: "Your team" },
  { key: "Processing", hint: "Being prepared by the team", group: "Your team" },
  { key: "Ready to ship", hint: "Packed · waiting for courier", group: "Your team" },
  { key: "Shipped", hint: "With the courier", group: "Courier" },
  { key: "Delivered", hint: "Customer has it", group: "Courier" },
];

const orderLines = (items: (string | number)[][]): T.OrderLine[] =>
  items.map(([id, q]) => {
    const p = prod(String(id));
    return {
      name: p?.en ?? String(id),
      sku: p?.sku ?? "",
      qty: Number(q),
      price: p?.offer || p?.price || 0,
      category: p?.cat ?? "",
    };
  });

export function mockOrders(): T.OrdersData {
  const rows: T.OrderRow[] = ALL_ORDERS.map((o, k) => ({
    id: o.id,
    date: o.date,
    customer: cust(o.cust),
    itemCount: o.items.length,
    payment: o.pay,
    payStatus: tag(o.payStatus),
    fulfilment: o.fulfil,
    status: tag(o.status),
    total: o.total + o.ship,
    zone: o.zone,
    lines: orderLines(o.items),
    manual: false,
    // Courier orders that have left the building carry the Bosta airway bill.
    awb:
      o.fulfil === "Courier" && ["Shipped", "Delivered"].includes(o.status)
        ? `BST-8821${4000 + k * 37}`
        : null,
    appointment: null,
    deliveredOn: ["Delivered", "Return open", "Returned"].includes(o.status)
      ? deliveredOn(o)
      : null,
  }));
  const tiles = ORDER_TILES.map((t) => ({
    ...t,
    label: t.key,
    count: count(ALL_ORDERS, (o) => o.status === t.key),
  }));
  const draftLines = orderLines([
    ["P1012", 1],
    ["P1011", 1],
  ]);
  const drafts: T.DraftOrderRow[] = [
    {
      id: "D-031",
      saved: "Today 16:20",
      by: "Zain",
      customer: cust("C205"),
      lines: draftLines,
      source: "Instagram",
      total: draftLines.reduce((a, l) => a + l.price * l.qty, 0),
      note: "Waiting for her to confirm the bracelet size",
    },
  ];
  return { tiles, rows, drafts };
}

/** "24 Sep, 16:05" + minutes → same format (rolls to "Next day"). */
const addMin = (d: string, m: number) => {
  const [day, t = "00:00"] = d.split(", ");
  const [h = 0, mi = 0] = t.split(":").map(Number);
  let x = h * 60 + mi + m;
  const next = x >= 1440;
  x %= 1440;
  return `${next ? "Next day" : day}, ${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

export function mockOrderDetail(id: string): T.OrderDetail | null {
  const row = mockOrders().rows.find((r) => r.id === id);
  const o = ALL_ORDERS.find((x) => x.id === id);
  const c = o && CUSTOMERS.find((x) => x.id === o.cust);
  if (!row || !o || !c) return null;
  const cod = o.pay === "Cash on Delivery",
    appt = o.fulfil === "Appointment";
  const d = o.date.replace(" 2026", "");
  const i = STAGE_ORDER.indexOf(o.status === "Return open" ? "Delivered" : o.status);
  const h: T.OrderEvent[] = [
    { text: "Order placed on zelliny.com", when: d, who: "Customer" },
    {
      text: cod
        ? `Cash on Delivery — to collect ${(o.total + o.ship).toLocaleString("en-US")} EGP at the door`
        : `Payment captured · ${o.pay}`,
      when: d,
      who: "Paymob",
    },
  ];
  const ev = (text: string, when: string, who: string) => h.push({ text, when, who });
  if (i >= 1) ev("Confirmed · started preparing", addMin(d, 40), "Ahmed");
  if (i >= 2) ev("Packing checklist completed · Ready to ship", addMin(d, 180), "Ahmed");
  if (row.awb) ev(`Courier pickup booked · AWB ${row.awb}`, addMin(d, 180), "Ahmed");
  if (i >= 3)
    ev(
      appt ? "Out for delivery with the Zelliny team" : "Collected by Bosta (scanned)",
      appt ? "Next day, 11:00" : "Next day, 10:20",
      appt ? "Ahmed" : "Bosta",
    );
  if (i >= 3 && !appt) ev("Out for delivery", "Next day, 13:05", "Bosta");
  if (i >= 4)
    ev(
      appt ? "Delivered in person · signature taken" : "Delivered · signed by customer",
      appt ? "Next day, 15:30" : "Next day, 16:40",
      appt ? "Ahmed" : "Bosta",
    );
  if (i >= 4 && cod)
    ev("Cash collected by Bosta · to be paid to Zelliny", "Next day, 16:40", "Bosta");
  if (o.status === "Cancelled") ev("Cancelled · customer request · refunded", d, "Ahmed");
  if (o.status === "Returned") ev("Returned · refunded", d, "Ramy Bakr");
  const subtotal = row.lines.reduce((a, l) => a + l.price * l.qty, 0);
  return {
    ...row,
    customerInfo: {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      orders: c.orders,
      spent: c.spent,
    },
    subtotal,
    discount: Math.max(0, subtotal - o.total),
    delivery: o.ship,
    address: `Villa 14, Street 90, ${o.zone}`,
    transactionId: cod ? null : `PMB-${o.id.slice(3)}-7731`,
    gift: { wrap: "Ribbon wrapping", message: "Happy birthday, with love.", hidePrices: true },
    history: h,
  };
}
const STAGE_ORDER = ["Pending", "Processing", "Ready to ship", "Shipped", "Delivered"];

export const stockLabel = (stock: number) =>
  stock === 0 ? "Out of stock" : stock <= 2 ? "Low stock" : "In stock";

export function mockProducts(): T.ProductsData {
  const all = [...PRODUCTS, ...GENERATED_PRODUCTS] as SampleProduct[];
  const onSite = (x: { status: string; visible?: boolean }) => x.visible ?? x.status !== "Draft";
  const rows = all.map((p): T.ProductRow => {
    const b = BRANDS.find((x) => x.id === p.brand);
    const c = CATS.find((x) => x.id === p.cat);
    const hiddenBy =
      b && !onSite(b)
        ? `${b.en} maison is off`
        : c && !onSite(c)
          ? `${c.en} category is off`
          : null;
    const isDraft = p.status === "Draft";
    return {
      id: p.id,
      sku: p.sku,
      name: p.en,
      nameAr: p.ar,
      brand: brand(p.brand),
      category: cat(p.cat),
      mode: p.mode,
      price: p.price,
      offer: p.offer,
      stock: p.stock,
      sold: p.sold,
      enquiries: p.enq ?? 0,
      status: isDraft ? tag("Draft") : tag(stockLabel(p.stock)),
      color: p.img,
      gender: p.gender ?? SAMPLE_GENDER[p.id] ?? "Unisex",
      visible: !isDraft,
      imageCount: 5,
      hiddenBy,
      isDraft,
    };
  });
  return {
    rows,
    brands: BRANDS.map((b) => b.en),
    categories: CATS.map((c) => c.en),
    genders: ["Women", "Men", "Unisex"],
  };
}

export const mockCategories = (): T.CategoryRow[] =>
  CATS.map((c) => ({
    id: c.id,
    name: c.en,
    nameAr: c.ar,
    count: c.count,
    mode: c.mode,
    order: c.order,
    status: tag(c.status),
  }));

export const mockBrands = (): T.BrandRow[] =>
  BRANDS.map((b) => ({
    id: b.id,
    name: b.en,
    nameAr: b.ar,
    categories: b.cats.map(cat).join(", "),
    mode: b.mode,
    count: b.count,
    featured: b.featured,
    status: tag(b.status),
  }));

/* Attributes (variant options like colour/size) — not in the original prototype, added for the admin's own catalogue needs. */
const ATTRIBUTES: {
  id: string;
  name: string;
  previewType: T.AttributePreviewType;
  status: string;
  values: { id: string; value: string; color?: string; icon?: string; iconAlt?: string }[];
}[] = [
  {
    id: "colour",
    name: "Colour",
    previewType: "COLOR",
    status: "Active",
    values: [
      { id: "colour-black", value: "Black", color: "#0a0a0a" },
      { id: "colour-gold", value: "Gold", color: "#c9a227" },
      { id: "colour-burgundy", value: "Burgundy", color: "#5c1a24" },
      { id: "colour-tan", value: "Tan", color: "#b08968" },
    ],
  },
  {
    id: "size",
    name: "Size",
    previewType: "TEXT",
    status: "Active",
    values: [
      { id: "size-s", value: "Small" },
      { id: "size-m", value: "Medium" },
      { id: "size-l", value: "Large" },
    ],
  },
  {
    id: "material",
    name: "Material",
    previewType: "ICON",
    status: "Active",
    values: [
      { id: "material-leather", value: "Leather" },
      { id: "material-canvas", value: "Canvas" },
    ],
  },
  { id: "finish", name: "Finish", previewType: "TEXT", status: "Inactive", values: [] },
];

export const mockAttributes = (): T.AttributeRow[] =>
  ATTRIBUTES.map((a) => ({
    id: a.id,
    name: a.name,
    previewType: a.previewType,
    status: tag(a.status),
    values: a.values.map((v) => ({
      id: v.id,
      value: v.value,
      color: v.color ?? null,
      icon: v.icon ?? null,
      iconAlt: v.iconAlt ?? null,
    })),
  }));

/* Back-in-stock waiting lists and pre-orders, as in the prototype (v17–v18). */
const WAITING: [string, [string, string, string, "Customer" | "Guest", "English" | "Arabic"][]][] =
  [
    [
      "P1007",
      [
        ["Mariam Adel", "mariam.adel@example.com", "3 Sep 2026", "Customer", "English"],
        ["Hassan Nabil", "hassan.nabil@example.com", "4 Sep 2026", "Guest", "Arabic"],
        ["Farida Samir", "farida.s@example.com", "5 Sep 2026", "Customer", "English"],
        ["Karim Mansour", "karim.m@example.com", "6 Sep 2026", "Customer", "English"],
        ["Nadine El-Sayed", "nadine.es@example.com", "7 Sep 2026", "Customer", "English"],
        ["Omar Tarek", "omar.tarek@example.com", "8 Sep 2026", "Guest", "Arabic"],
        ["Salma Fathy", "salma.f@example.com", "9 Sep 2026", "Customer", "English"],
        ["Youssef Kamal", "youssef.k@example.com", "11 Sep 2026", "Customer", "Arabic"],
        ["Heba Mostafa", "heba.m@example.com", "12 Sep 2026", "Guest", "English"],
        ["Ali Sherif", "ali.sherif@example.com", "13 Sep 2026", "Guest", "English"],
        ["Rana Hegazy", "rana.h@example.com", "15 Sep 2026", "Customer", "English"],
        ["Tamer Wahba", "tamer.w@example.com", "17 Sep 2026", "Guest", "Arabic"],
        ["Laila Abdelrahman", "laila.a@example.com", "19 Sep 2026", "Customer", "English"],
        ["Mona Ezzat", "mona.e@example.com", "22 Sep 2026", "Guest", "Arabic"],
      ],
    ],
    [
      "P1010",
      [
        ["Dina Raouf", "dina.r@example.com", "15 Sep 2026", "Customer", "English"],
        ["Nour El-Din", "nour.e@example.com", "16 Sep 2026", "Customer", "English"],
        ["Ghada Fouad", "ghada.f@example.com", "17 Sep 2026", "Guest", "Arabic"],
        ["Sara Helmy", "sara.h@example.com", "18 Sep 2026", "Guest", "English"],
        ["Yasmin Hosny", "yasmin.h@example.com", "20 Sep 2026", "Customer", "English"],
        ["Aya Mahmoud", "aya.m@example.com", "23 Sep 2026", "Guest", "Arabic"],
      ],
    ],
    [
      "P1005",
      [
        ["Mostafa Ali", "mostafa.a@example.com", "21 Sep 2026", "Customer", "English"],
        ["Sherif Lotfy", "sherif.l@example.com", "23 Sep 2026", "Guest", "Arabic"],
        ["Ahmed Fawzy", "ahmed.f@example.com", "25 Sep 2026", "Customer", "English"],
      ],
    ],
  ];
const PREORDERS: T.PreorderRow[] = [
  {
    productId: "P1005",
    expected: "12 Oct 2026",
    limit: 10,
    open: true,
    payment: "Paid in full online",
    customers: [
      ["C202", "Omar Hassan", "21 Sep 2026"],
      ["C206", "Youssef Kamal", "23 Sep 2026"],
      ["C208", "Tarek Samir", "25 Sep 2026"],
    ].map(([customerId, name, date]) => ({ customerId: customerId!, name: name!, date: date! })),
  },
  {
    productId: "P1020",
    expected: "20 Oct 2026",
    limit: 6,
    open: false,
    payment: "Paid in full online",
    customers: [
      ["C201", "Nadine El-Sayed", "18 Sep 2026"],
      ["C203", "Salma Fathy", "19 Sep 2026"],
      ["C205", "Laila Abdelrahman", "20 Sep 2026"],
      ["C207", "Hana Mostafa", "22 Sep 2026"],
      ["C209", "Mona Adel", "24 Sep 2026"],
      ["C210", "Sherif Nabil", "26 Sep 2026"],
    ].map(([customerId, name, date]) => ({ customerId: customerId!, name: name!, date: date! })),
  },
  {
    productId: "P1013",
    expected: "5 Nov 2026",
    limit: 4,
    open: true,
    payment: "Paid in full online",
    customers: [],
  },
];

export function mockInventory(): T.InventoryData {
  return {
    waitlists: WAITING.map(([productId, list]) => ({
      productId,
      customers: list.map(([name, email, date, account, language], i) => ({
        id: `${productId}-${i}`,
        name,
        email,
        date,
        account,
        language,
        notified: null,
      })),
    })),
    preorders: PREORDERS,
    features: { backInStock: true, preorders: false },
  };
}

/** Extra sample customers (prototype v14/v16) so contact rules and numbered pages show. */
const EXTRA_CUSTOMERS: [
  string,
  string,
  string,
  string,
  number,
  number,
  string,
  Partial<T.CustomerRow["marketing"]>,
  string?,
][] = [
  [
    "Mona Adel",
    "",
    "+20 100 772 4410",
    "Nasr City",
    1,
    4600,
    "Aug 2026",
    { email: false },
    "Phone call",
  ],
  [
    "Sherif Nabil",
    "sherif.n@example.com",
    "+20 127 330 5518",
    "Alexandria",
    2,
    15700,
    "Jun 2026",
    { whatsapp: false },
  ],
  ["Rania Galal", "rania.g@example.com", "+20 100 481 2290", "Zamalek", 3, 19400, "May 2026", {}],
  ["Ahmed Fawzy", "ahmed.f@example.com", "+20 122 730 6618", "New Cairo", 1, 7250, "Sep 2026", {}],
  [
    "Dalia Shaker",
    "",
    "+20 111 205 7743",
    "Heliopolis",
    2,
    12100,
    "Jul 2026",
    { email: false },
    "WhatsApp",
  ],
  ["Mostafa Ali", "mostafa.a@example.com", "+20 106 339 1020", "Maadi", 1, 5450, "Aug 2026", {}],
  [
    "Nour El-Din",
    "nour.e@example.com",
    "+20 127 604 8812",
    "Sheikh Zayed",
    5,
    33800,
    "Apr 2026",
    {},
  ],
  [
    "Yasmin Hosny",
    "yasmin.h@example.com",
    "+20 101 772 5530",
    "Alexandria",
    2,
    9800,
    "Jun 2026",
    {},
    "Instagram",
  ],
];
const homeAddress = (id: string, city: string): T.CustomerAddress => ({
  id: `-a1`,
  label: "Home",
  address: `Villa 14, Street 90, ${city}`,
  city,
  isDefault: true,
});
/** A second saved address for a few sample customers. */
const SECOND_ADDRESS: Record<string, [string, string, string]> = {
  C201: ["Work", "Tower B, Floor 7, Smart Village", "Sheikh Zayed"],
  C202: ["Other", "Villa 3, Beverly Hills", "Sheikh Zayed"],
  C205: ["Work", "Office 3, 26 July St", "Zamalek"],
  C210: ["Work", "12 Sidi Gaber St, Floor 2", "Alexandria"],
};
const addressesFor = (id: string, city: string): T.CustomerAddress[] => {
  const second = SECOND_ADDRESS[id];
  return [
    homeAddress(id, city),
    ...(second
      ? [
          {
            id: `${id}-a2`,
            label: second[0],
            address: second[1],
            city: second[2],
            isDefault: false,
          },
        ]
      : []),
  ];
};
export const mockCustomers = (): T.CustomersData => {
  const base: T.CustomerRow[] = CUSTOMERS.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    city: c.city,
    orders: c.orders,
    spent: c.spent,
    since: c.since,
    email: c.id === "C208" ? "" : c.email, // ordered by phone, never gave an email
    marketing: { email: c.id !== "C206" && c.id !== "C208", sms: true, whatsapp: true }, // C206 unsubscribed from emails
    language: "English",
    address: `Villa 14, Street 90, ${c.city}`,
    addresses: addressesFor(c.id, c.city),
    birthday: c.id === "C201" ? "14 March" : "",
    source: "Website",
    notes: c.id === "C201" ? "Prefers delivery after 6 pm. Loves woody fragrances." : "",
  }));
  const extra: T.CustomerRow[] = EXTRA_CUSTOMERS.map(
    ([name, email, phone, city, orders, spent, since, mkt, source], i) => ({
      id: `C${209 + i}`,
      name,
      email,
      phone,
      city,
      orders,
      spent,
      since,
      marketing: { email: !!email, sms: true, whatsapp: true, ...mkt },
      language: i === 0 ? "Arabic" : "English",
      address: `Villa 14, Street 90, ${city}`,
      addresses: addressesFor(`C${209 + i}`, city),
      birthday: "",
      source: source ?? "Website",
      notes: "",
    }),
  );
  return { rows: [...base, ...extra], totalAccounts: 1146 };
};

/* Extra detail per sample enquiry, as in the prototype (v14). */
type EnqExtra = Pick<
  T.EnquiryRow,
  "interest" | "time" | "budget" | "needBy" | "message" | "src"
> & {
  log: [string, string, string][];
  quote?: [string, number, number, number][];
  quoteRef?: string;
  quoteSent?: string;
  order?: string;
  followUp?: string;
  unread?: boolean;
};
const ENQ_EXTRA: Record<string, EnqExtra> = {
  "ENQ-318": {
    interest: "Writing Instruments",
    time: "20:15",
    budget: "",
    needBy: "30 Oct 2026",
    unread: true,
    followUp: "Mon 28 Sep, 10:00",
    message:
      "We would like premium pens and wallets for our top clients before year end. Please share engraving options and your gift box.",
    src: {
      channel: "Google",
      how: "Search · “corporate gifts cairo”",
      page: "Corporate Gifting page",
      device: "Desktop",
      visits: 1,
    },
    log: [
      ["System", "Enquiry received from the website form", "24 Sep, 20:15"],
      ["System", "Auto-reply sent to client (EN)", "24 Sep, 20:15"],
    ],
  },
  "ENQ-317": {
    interest: "Leather Goods",
    time: "11:40",
    budget: "1,500 EGP / pc",
    needBy: "20 Oct 2026",
    message: "Card holders for 250 employees, initials embossed. Can you deliver to two offices?",
    src: {
      channel: "LinkedIn",
      how: "Company post",
      page: "Product page · Cerruti 1881 Card Holder",
      device: "Desktop",
      visits: 3,
    },
    log: [
      ["System", "Enquiry received from product page · Cerruti 1881 Card Holder", "23 Sep, 11:40"],
      [
        "Phone",
        "Zain called Ahmed — confirmed 250 pcs and two delivery addresses",
        "23 Sep, 13:05",
      ],
    ],
  },
  "ENQ-316": {
    interest: "Writing Instruments",
    time: "09:20",
    budget: "",
    needBy: "15 Oct 2026",
    message:
      "Looking for an executive gift for our board — 40 pens with logo engraving, presented in a gift box.",
    src: {
      channel: "Google",
      how: "Search · “executive pens engraving”",
      page: "Corporate Gifting page",
      device: "Desktop",
      visits: 1,
    },
    log: [
      ["System", "Enquiry received from the website form", "22 Sep, 09:20"],
      ["Email", "Ramy emailed catalogue and engraving samples", "22 Sep, 12:10"],
      ["Email", "Quotation Q-2026-0419 sent · 204,000 EGP", "23 Sep, 16:30"],
    ],
    quote: [["name:S.T. Dupont Défi Fountain Pen", 40, 4850, 250]],
    quoteRef: "Q-2026-0419",
    quoteSent: "23 Sep",
  },
  "ENQ-315": {
    interest: "Mixed / not sure yet",
    time: "18:02",
    budget: "250,000 EGP total",
    needBy: "5 Nov 2026",
    message: "Gift sets for a launch event, around 300 guests. Open to suggestions.",
    src: { channel: "WhatsApp", how: "Message to our number", manual: true },
    log: [
      ["WhatsApp", "Hesham sent the request on WhatsApp", "20 Sep, 18:02"],
      ["Phone", "Call — discussed three set options", "21 Sep, 11:00"],
      ["Email", "Revised quote sent", "23 Sep, 15:45"],
    ],
    quote: [
      ["P1008", 150, 2650, 0],
      ["P1021", 150, 2950, 120],
    ],
    quoteRef: "Q-2026-0418",
    quoteSent: "23 Sep",
  },
  "ENQ-314": {
    interest: "Leather Goods",
    time: "10:10",
    budget: "",
    needBy: "1 Oct 2026",
    order: "ZL-C-0031",
    message: "Leather sets for our hotel partners, logo printed.",
    src: {
      channel: "Facebook",
      how: "Paid ad",
      page: "Corporate Gifting page",
      campaign: "Hospitality partners",
      device: "Mobile",
      visits: 1,
    },
    log: [
      ["System", "Enquiry received from the website form", "17 Sep, 10:10"],
      ["Phone", "Call with Rana", "17 Sep, 12:00"],
      ["System", "Order confirmed · ZL-C-0031", "19 Sep, 14:20"],
    ],
  },
  "ENQ-313": {
    interest: "Smoking Accessories",
    time: "15:30",
    budget: "",
    needBy: "",
    message: "Lighters for 15 partners, initials engraved.",
    src: { channel: "Email", how: "Wrote to info@zelliny.com", manual: true },
    log: [
      ["Email", "Request received by email", "12 Sep, 15:30"],
      ["Email", "Quote sent", "13 Sep, 10:00"],
      ["System", "Marked lost — chose another supplier", "18 Sep, 09:40"],
    ],
  },
  "ENQ-312": {
    interest: "Writing Instruments",
    time: "14:25",
    budget: "900 EGP / pc",
    needBy: "25 Oct 2026",
    message: "180 pens for staff awards, logo engraved.",
    src: {
      channel: "Direct",
      how: "Typed zelliny.com",
      page: "Product page · Hugo Boss Gear Matrix",
      device: "Desktop",
      visits: 4,
    },
    log: [
      ["System", "Enquiry received from product page · Hugo Boss Gear Matrix", "15 Sep, 14:25"],
      ["Phone", "Call with Noha", "15 Sep, 16:00"],
      ["Email", "Quote sent", "16 Sep, 11:30"],
    ],
    quote: [["P1015", 180, 1450, 150]],
    quoteRef: "Q-2026-0417",
    quoteSent: "16 Sep",
  },
};
const NEW_ENQUIRY = {
  id: "ENQ-319",
  company: "Nile Ventures",
  contact: "Aya Hamdy",
  email: "aya@nileventures.example",
  phone: "+20 102 555 7340",
  items: "S.T. Dupont pens or Hugo Boss leather — open to ideas",
  qty: 60,
  branding: "Logo engraving",
  stage: "New",
  owner: "Unassigned",
  date: "25 Sep",
};
const ENQ_319: EnqExtra = {
  interest: "Mixed / not sure yet",
  time: "09:12",
  budget: "",
  needBy: "Early November",
  unread: true,
  message:
    "We are planning year-end gifts for 60 investors. Could you suggest two or three options within a premium budget?",
  src: {
    channel: "Instagram",
    how: "Paid ad",
    page: "Corporate Gifting page",
    campaign: "Year-end gifting 2026",
    device: "Mobile",
    visits: 2,
  },
  log: [
    ["System", "Enquiry received from the website form", "25 Sep, 09:12"],
    ["System", "Auto-reply sent to client (EN)", "25 Sep, 09:12"],
  ],
};

export function mockEnquiries(): T.EnquiriesData {
  const products = [...PRODUCTS, ...GENERATED_PRODUCTS] as SampleProduct[];
  const rows: T.EnquiryRow[] = [
    { ...NEW_ENQUIRY, x: ENQ_319 },
    ...ENQUIRIES.map((e) => ({ ...e, x: ENQ_EXTRA[e.id]! })),
  ].map(({ x, ...e }) => ({
    id: e.id,
    company: e.company,
    contact: e.contact,
    email: e.email,
    phone: e.phone,
    items: e.items,
    qty: e.qty,
    branding: e.branding,
    stage: tag(e.stage),
    owner: e.owner,
    date: e.date,
    time: x.time,
    interest: x.interest,
    budget: x.budget,
    needBy: x.needBy,
    message: x.message,
    src: x.src,
    followUp: x.followUp ?? "",
    unread: !!x.unread,
    order: x.order ?? null,
    quoteRef: x.quoteRef ?? null,
    quoteSent: x.quoteSent ?? null,
    quote: (x.quote ?? []).map(([ref, qty, unit, pers]) => {
      // "name:…" picks the first published product with that name.
      const p = ref.startsWith("name:")
        ? products.find((y) => y.status !== "Draft" && y.en.startsWith(ref.slice(5)))
        : products.find((y) => y.id === ref);
      const pid = p?.id ?? ref;
      return { productId: pid, name: p?.en ?? pid, sku: p?.sku ?? "", qty, unit, pers };
    }),
    log: x.log.map(([via, text, when]) => ({ via, text, when })),
  }));
  return {
    rows,
    owners: ["Ramy Bakr", "Zain", "Ahmed", "Abdelfattah Mohamed", "Nada Samir"],
    products: products
      .filter((p) => p.status !== "Draft")
      .map((p) => ({
        id: p.id,
        name: p.en,
        sku: p.sku,
        brand: brand(p.brand),
        price: p.offer || p.price,
      })),
  };
}

export function mockPayments(): T.PaymentsData {
  const rows = ORDERS.map((o, i) => ({
    id: `TX-${88120 - i}`,
    order: o.id,
    customer: cust(o.cust),
    method: o.pay,
    date: o.date,
    amount: o.total + o.ship,
    status: tag(o.payStatus),
  }));
  const sum = (s: string) =>
    rows
      .filter((r) => r.status.label === s)
      .reduce((a, r) => a + r.amount, 0)
      .toLocaleString("en-US");
  return {
    summary: [
      { label: "Collected", value: `${sum("Paid")} EGP` },
      { label: "Cash on delivery due", value: `${sum("Unpaid")} EGP` },
      { label: "Refunded", value: `${sum("Refunded")} EGP` },
      { label: "Next Paymob payout", value: "Mon 28 Sep" },
    ],
    rows,
  };
}

export const mockDiscounts = (): T.DiscountRow[] =>
  DISCOUNTS.map((d) => ({ ...d, status: tag(d.status) }));

export const mockBundles = (): T.BundleRow[] =>
  BUNDLES.map((b) => ({
    id: b.id,
    name: b.en,
    nameAr: b.ar,
    items: b.items.map((i) => prod(i)?.en ?? i),
    lines: b.items.map((i) => ({ productId: i, qty: 1 })),
    mode: b.mode,
    price: b.price,
    occasion: b.occasion,
    color: b.img,
    visible: b.visible,
  }));

const ZONE_AREAS: [string, string[]][] = [
  ["Greater Cairo", ["Heliopolis", "Nasr City", "Zamalek", "Maadi"]],
  ["New Cairo", ["New Cairo", "Fifth Settlement"]],
  ["Giza & October", ["Giza", "Sheikh Zayed", "6th of October"]],
  ["Alexandria", ["Alexandria"]],
  ["North Coast", ["North Coast"]],
  ["Red Sea", ["Hurghada", "Red Sea"]],
  ["Upper Egypt", ["Luxor", "Aswan"]],
];
export const mockDelivery = (): T.DeliveryData => ({
  zones: ZONES.map((z, i) => ({
    id: `Z${i + 1}`,
    name: ZONE_AREAS[i]?.[0] ?? z.zone,
    areas: ZONE_AREAS[i]?.[1] ?? [z.zone],
    fee: z.fee,
    free: z.free,
    eta: z.eta,
    cod: z.cod,
  })),
  appointments: APPTS.map((a) => ({
    order: a.order,
    customer: cust(a.cust),
    item: a.item,
    when: a.when,
    where: a.where,
    agent: a.agent,
    status: tag(a.status),
  })),
});

export const mockStaff = (): T.StaffRow[] => STAFF.map((s) => ({ ...s, status: tag(s.status) }));
export const mockActivity = (): T.ActivityRow[] => ACTIVITY_LOG;

export const mockApprovals = (): T.ApprovalRow[] => [
  {
    id: "AP-51",
    request: "Price change · Gucci Bloom 100ml",
    by: "Zain",
    when: "24 Sep, 18:20",
    detail: "8,400 → 7,900 EGP",
    status: tag("Waiting"),
  },
  {
    id: "AP-50",
    request: "Refund · RMA-2035",
    by: "Abdelfattah Mohamed",
    when: "24 Sep, 17:02",
    detail: "9,800 EGP to Paymob card",
    status: tag("Waiting"),
  },
  {
    id: "AP-49",
    request: "New discount · MOTHERSDAY",
    by: "Nada Samir",
    when: "24 Sep, 11:40",
    detail: "15% on Fragrance, min 5,000 EGP",
    status: tag("Waiting"),
  },
  {
    id: "AP-48",
    request: "Publish product · Chloé EDP 75ml",
    by: "Nada Samir",
    when: "23 Sep, 16:15",
    detail: "New product page",
    status: tag("Waiting"),
  },
  {
    id: "AP-47",
    request: "Manual order discount · ZL-10491",
    by: "Ahmed",
    when: "23 Sep, 12:05",
    detail: "300 EGP off",
    status: tag("Waiting"),
  },
  {
    id: "AP-46",
    request: "Stock adjustment · HB-483",
    by: "Ahmed",
    when: "22 Sep, 10:30",
    detail: "−4 units (damaged)",
    status: tag("Approved"),
  },
];

export const mockReports = (): T.ReportsData => ({
  kpis: [
    { label: "Revenue", value: "907,350 EGP", delta: "+18.4%" },
    { label: "Orders", value: "152", delta: "+12.1%" },
    { label: "Average order", value: "5,969 EGP", delta: "+5.6%" },
    { label: "Returning customers", value: "38%", delta: "+4 pt" },
  ],
  byCategory: [
    { label: "Fragrance", value: 412300 },
    { label: "Watches", value: 148500 },
    { label: "Jewellery", value: 121900 },
    { label: "Beauty", value: 98400 },
    { label: "Bags", value: 72650 },
    { label: "Leather Goods", value: 53600 },
  ],
  byCity: [
    { label: "New Cairo", value: 214000 },
    { label: "Zamalek", value: 168300 },
    { label: "Sheikh Zayed", value: 131400 },
    { label: "Alexandria", value: 117900 },
    { label: "Maadi", value: 88100 },
    { label: "Other", value: 187650 },
  ],
});

const g = (
  title: string,
  rows: [string, string, Tone?][],
  description?: string,
): T.SettingsGroup => ({
  title,
  description,
  rows: rows.map(([label, value, tone]) => ({ label, value, tone })),
});

export const SIMPLE_PAGES: Record<string, () => T.SimplePageData> = {
  selling: () => ({
    groups: [
      g(
        "Selling mode by category",
        CATS.map((c) => [c.en, c.mode, c.mode === "Enquiry only" ? "info" : "ok"]),
        "Choose whether each category is sold online or by enquiry.",
      ),
      g("Rules", [
        ["Enquiry-only products excluded from discounts", "On", "ok"],
        ["Show price on enquiry-only products", "Off", "mute"],
      ]),
    ],
  }),
  browsing: () => ({
    groups: [
      g("Live now", [
        ["Visitors on site", "23"],
        ["Carts open", "7"],
        ["Checkout started", "2", "warn"],
      ]),
      g("Follow-up automations", [
        ["Abandoned cart email · 1 h", "Active", "ok"],
        ["Back-in-stock alert", "Active", "ok"],
        ["Viewed 3+ times reminder", "Paused", "mute"],
      ]),
    ],
  }),
  loyalty: () => ({
    groups: [
      g("Programme", [
        ["Earn rate", "1 point per 100 EGP"],
        ["Redeem rate", "100 points = 50 EGP"],
        ["Points expire", "After 12 months"],
      ]),
      g("Tiers", [
        ["Silver", "0 – 19,999 EGP"],
        ["Gold", "20,000 – 49,999 EGP"],
        ["Black", "50,000 EGP +"],
      ]),
      g("Members", [
        ["Total members", "1,284"],
        ["Points outstanding", "412,600"],
        ["Redeemed · 30 days", "38,200"],
      ]),
    ],
  }),
  gifting: () => ({
    groups: [
      g("Gift services", [
        ["Signature box wrapping", "150 EGP", "ok"],
        ["Ribbon wrapping", "Free", "ok"],
        ["Handwritten card", "Free", "ok"],
        ["Engraving (pens, lighters)", "350 EGP", "ok"],
      ]),
      g("Delivery options", [
        ["Send as a gift (hide prices)", "On", "ok"],
        ["Scheduled delivery date", "On", "ok"],
      ]),
    ],
  }),
  content: () => ({
    groups: [
      g("Homepage", [
        ["Hero banner", "Autumn edit · live", "ok"],
        ["Curated for You", "10 products"],
        ["Featured Maisons", "8 maisons"],
      ]),
      g("Pages", [
        ["Corporate Gifting", "Published", "ok"],
        ["About Zelliny", "Published", "ok"],
        ["Returns policy", "Published", "ok"],
        ["Gift guide · Mother's Day", "Draft", "mute"],
      ]),
    ],
  }),
  scripts: () => ({
    groups: [
      g("Tracking", [
        ["Google Analytics 4", "Connected", "ok"],
        ["Meta Pixel", "Connected", "ok"],
        ["TikTok Pixel", "Not set", "mute"],
        ["Google Tag Manager", "Connected", "ok"],
      ]),
      g("Custom scripts", [
        ["Head · Hotjar", "Active", "ok"],
        ["Body end · WhatsApp widget", "Active", "ok"],
      ]),
    ],
  }),
  settings: () => ({
    groups: [
      g("Store", [
        ["Store name", "Zelliny"],
        ["Legal name", "Zelliny for Gifts and Luxury Products"],
        ["Currency", "EGP"],
        ["Languages", "English, Arabic"],
      ]),
      g("Payments", [
        ["Paymob · Card", "On", "ok"],
        ["Paymob · Wallet", "On", "ok"],
        ["Cash on Delivery", "On", "ok"],
        ["Bank transfer", "Manual orders only", "info"],
      ]),
      g("Notifications", [
        ["New order email", "ramy.bakr@zelliny.com"],
        ["Low stock alert", "10 units or fewer"],
      ]),
    ],
  }),
};

export function mockOrderForm(): T.OrderFormData {
  const all = [...PRODUCTS, ...GENERATED_PRODUCTS] as SampleProduct[];
  return {
    customers: mockCustomers().rows.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      city: c.city,
      orders: c.orders,
      address: c.address,
    })),
    products: all
      .filter((p) => p.status !== "Draft")
      .map((p) => ({
        id: p.id,
        name: p.en,
        sku: p.sku,
        brand: brand(p.brand),
        price: p.offer || p.price,
        stock: p.stock,
        color: p.img,
      })),
    zones: [
      ["New Cairo", 75],
      ["Heliopolis", 75],
      ["Nasr City", 75],
      ["Maadi", 75],
      ["Zamalek", 75],
      ["6th of October", 90],
      ["Sheikh Zayed", 90],
      ["Alexandria", 120],
      ["North Coast", 150],
    ].map(([name, fee]) => ({ name: String(name), fee: Number(fee) })),
    sources: ["Phone call", "WhatsApp", "Instagram", "Facebook", "In person", "Email"],
  };
}

/* ---------- Browsing & follow-up (people we know, with what they looked at) ---------- */
const BROWSER_SEED: {
  id: string;
  name: string;
  email: string;
  cust: string | null;
  how: string;
  optin: boolean;
  last: string;
  visits: number;
  views: [string, number][];
  stop: T.BrowserStop;
  stopTxt: string;
  intent: "Hot" | "Warm" | "Cool";
  src: string;
  device: string;
  sent: [string, string, string][];
}[] = [
  {
    id: "B01",
    name: "Nadine El-Sayed",
    email: "nadine.e@example.com",
    cust: "C201",
    how: "Signed in",
    optin: true,
    last: "Today 20:14",
    visits: 4,
    views: [
      ["P1011", 5],
      ["P1012", 2],
    ],
    stop: "bag",
    stopTxt: "Left the necklace in the bag",
    intent: "Hot",
    src: "Instagram",
    device: "iPhone",
    sent: [],
  },
  {
    id: "B02",
    name: "Karim Mansour",
    email: "karim.m@example.com",
    cust: "C204",
    how: "Signed in",
    optin: true,
    last: "Today 18:51",
    visits: 3,
    views: [["P1013", 6]],
    stop: "checkout",
    stopTxt: "Stopped at the delivery step",
    intent: "Hot",
    src: "Google",
    device: "Windows",
    sent: [],
  },
  {
    id: "B03",
    name: "Ali Fawzy",
    email: "ali.fawzy@example.com",
    cust: null,
    how: "Started checkout",
    optin: false,
    last: "Today 16:30",
    visits: 2,
    views: [["P1014", 2]],
    stop: "checkout",
    stopTxt: "Stopped at payment",
    intent: "Hot",
    src: "Facebook",
    device: "Android",
    sent: [],
  },
  {
    id: "B04",
    name: "Rana Adly",
    email: "rana.adly@example.com",
    cust: null,
    how: "Created an account",
    optin: true,
    last: "Today 13:05",
    visits: 5,
    views: [
      ["P1001", 4],
      ["P1004", 1],
    ],
    stop: "product",
    stopTxt: "Viewed 4 times, never added",
    intent: "Hot",
    src: "Instagram",
    device: "iPhone",
    sent: [["22 Sep", "Still thinking about Terre d'Hermès?", "Opened · clicked · no order yet"]],
  },
  {
    id: "B05",
    name: "Omar Hassan",
    email: "omar.h@example.com",
    cust: "C202",
    how: "Signed in",
    optin: true,
    last: "Yesterday 22:40",
    visits: 2,
    views: [
      ["P1004", 3],
      ["P1005", 2],
    ],
    stop: "product",
    stopTxt: "Compared two fragrances",
    intent: "Warm",
    src: "Direct",
    device: "iPhone",
    sent: [],
  },
  {
    id: "B06",
    name: "Farida Nabil",
    email: "farida.n@example.com",
    cust: null,
    how: "Joined newsletter",
    optin: true,
    last: "Yesterday 19:12",
    visits: 3,
    views: [
      ["P1002", 2],
      ["P1020", 2],
      ["P1006", 1],
    ],
    stop: "category",
    stopTxt: "Browsing Fragrance, no product chosen",
    intent: "Warm",
    src: "Instagram",
    device: "iPhone",
    sent: [],
  },
  {
    id: "B07",
    name: "Hana Mostafa",
    email: "hana.m@example.com",
    cust: "C207",
    how: "Signed in",
    optin: true,
    last: "Yesterday 11:26",
    visits: 2,
    views: [["P1009", 3]],
    stop: "product",
    stopTxt: "Read reviews, left",
    intent: "Warm",
    src: "Google",
    device: "Mac",
    sent: [["Yesterday", "Your Clarins Double Serum is waiting", "Opened"]],
  },
  {
    id: "B09",
    name: "Salma Fathy",
    email: "salma.f@example.com",
    cust: "C203",
    how: "Signed in",
    optin: true,
    last: "22 Sep 12:10",
    visits: 1,
    views: [
      ["P1006", 1],
      ["P1007", 1],
    ],
    stop: "product",
    stopTxt: "Quick look",
    intent: "Cool",
    src: "Facebook",
    device: "Android",
    sent: [],
  },
  {
    id: "B10",
    name: "Youssef Kamal",
    email: "youssef.k@example.com",
    cust: "C206",
    how: "Signed in",
    optin: true,
    last: "21 Sep 21:02",
    visits: 1,
    views: [["P1008", 1]],
    stop: "home",
    stopTxt: "Left after the homepage and one product",
    intent: "Cool",
    src: "Direct",
    device: "iPhone",
    sent: [],
  },
];
export const mockBrowsing = (): T.BrowsingData => ({
  visitors: 4820,
  rows: BROWSER_SEED.map((b): T.BrowserRow => {
    const c = b.cust ? CUSTOMERS.find((x) => x.id === b.cust) : undefined;
    return {
      id: b.id,
      name: b.name,
      email: b.email,
      how: b.how,
      optin: b.optin,
      last: b.last,
      visits: b.visits,
      stop: b.stop,
      stopTxt: b.stopTxt,
      intent: b.intent,
      src: b.src,
      device: b.device,
      views: b.views.map(([pid, times]) => {
        const p = prod(pid);
        return {
          productId: pid,
          name: p?.en ?? pid,
          brand: p ? brand(p.brand) : "",
          category: p ? cat(p.cat) : "",
          price: p ? (p.offer ?? p.price ?? null) : null,
          color: p?.img ?? "#ccc",
          times,
        };
      }),
      sent: b.sent.map(([when, subject, status]) => ({ when, subject, status })),
      customer: c
        ? {
            id: c.id,
            orders: (c as { orders?: number }).orders ?? 0,
            spent: (c as { spent?: number }).spent ?? 0,
          }
        : null,
    };
  }),
});
