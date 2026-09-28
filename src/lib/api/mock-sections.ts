// Maps the prototype's sample records into the typed contracts in section-types.ts.
import type { Tone } from "./types";
import type * as T from "./section-types";
import { APPTS, BRANDS, BUNDLES, CATS, CUSTOMERS, DISCOUNTS, ENQUIRIES, ORDERS, PRODUCTS, RETURNS, STAFF, ACTIVITY, ZONES } from "./sample-records";
import { GENERATED_PRODUCTS, SAMPLE_GENDER, type SampleProduct } from "./sample-catalogue";

const TONES: Record<string, Tone> = {
  Pending: "warn", Processing: "info", "Ready to ship": "info", Shipped: "info", Delivered: "ok",
  Cancelled: "mute", Returned: "mute", Paid: "ok", Unpaid: "warn", Refunded: "mute",
  Requested: "warn", Inspecting: "info", Approved: "info", Rejected: "bad",
  New: "warn", Contacted: "info", Quoted: "info", Negotiation: "warn", Won: "ok", Lost: "bad",
  Active: "ok", Draft: "mute", Scheduled: "info", Expired: "mute", VIP: "ok", Returning: "info",
  Confirmed: "ok", "In stock": "ok", "Low stock": "warn", "Out of stock": "bad", "Out for delivery": "info", Waiting: "warn",
};
const tag = (label: string): T.Tagged => ({ label, tone: TONES[label] ?? "mute" });
const cust = (id: string) => CUSTOMERS.find((c) => c.id === id)?.name ?? id;
const prod = (id: string) => PRODUCTS.find((p) => p.id === id);
const brand = (id: string) => BRANDS.find((b) => b.id === id)?.en ?? id;
const cat = (id: string) => CATS.find((c) => c.id === id)?.en ?? id;
const count = <X,>(xs: X[], f: (x: X) => boolean) => xs.filter(f).length;

export function mockOrders(): T.OrdersData {
  const rows: T.OrderRow[] = ORDERS.map((o) => ({
    id: o.id, date: o.date, customer: cust(o.cust), itemCount: o.items.length, payment: o.pay,
    payStatus: tag(o.payStatus), fulfilment: o.fulfil, status: tag(o.status), total: o.total + o.ship, zone: o.zone,
  }));
  const tiles = ["Pending", "Processing", "Ready to ship", "Shipped", "Delivered"].map((s) => ({
    key: s, label: s, count: count(ORDERS, (o) => o.status === s),
  }));
  return { tiles, rows };
}

export function mockReturns(): T.ReturnsData {
  const rows = RETURNS.map((r) => ({
    id: r.id, order: r.order, customer: cust(r.cust), item: prod(r.item)?.en ?? r.item, reason: r.reason,
    rule: r.rule, amount: r.amount, status: tag(r.status), date: r.date,
  }));
  const tiles = ["Requested", "Inspecting", "Approved", "Refunded", "Rejected"].map((s) => ({
    key: s, label: s, count: count(RETURNS, (r) => r.status === s),
  }));
  return { tiles, rows };
}

export const stockLabel = (stock: number) => (stock === 0 ? "Out of stock" : stock <= 2 ? "Low stock" : "In stock");

export function mockProducts(): T.ProductsData {
  const all = [...PRODUCTS, ...GENERATED_PRODUCTS] as SampleProduct[];
  const onSite = (x: { status: string; visible?: boolean }) => x.visible ?? x.status !== "Draft";
  const rows = all.map((p): T.ProductRow => {
    const b = BRANDS.find((x) => x.id === p.brand);
    const c = CATS.find((x) => x.id === p.cat);
    const hiddenBy = b && !onSite(b) ? `${b.en} maison is off` : c && !onSite(c) ? `${c.en} category is off` : null;
    const isDraft = p.status === "Draft";
    return {
      id: p.id, sku: p.sku, name: p.en, nameAr: p.ar, brand: brand(p.brand), category: cat(p.cat), mode: p.mode,
      price: p.price, offer: p.offer, stock: p.stock, sold: p.sold, enquiries: p.enq ?? 0,
      status: isDraft ? tag("Draft") : tag(stockLabel(p.stock)), color: p.img,
      gender: p.gender ?? SAMPLE_GENDER[p.id] ?? "Unisex", visible: !isDraft, imageCount: 5, hiddenBy, isDraft,
    };
  });
  return { rows, brands: BRANDS.map((b) => b.en), categories: CATS.map((c) => c.en), genders: ["Women", "Men", "Unisex"] };
}

export const mockCategories = (): T.CategoryRow[] =>
  CATS.map((c) => ({ id: c.id, name: c.en, nameAr: c.ar, count: c.count, mode: c.mode, order: c.order, status: tag(c.status) }));

export const mockBrands = (): T.BrandRow[] =>
  BRANDS.map((b) => ({ id: b.id, name: b.en, nameAr: b.ar, categories: b.cats.map(cat).join(", "), mode: b.mode, count: b.count, featured: b.featured, status: tag(b.status) }));

export function mockInventory(): T.InventoryData {
  const state = (s: number) => (s === 0 ? { label: "Out of stock", tone: "bad" as Tone } : s <= 10 ? { label: "Low", tone: "warn" as Tone } : { label: "In stock", tone: "ok" as Tone });
  const rows = PRODUCTS.map((p) => ({ id: p.id, sku: p.sku, name: p.en, brand: brand(p.brand), color: p.img, stock: p.stock, sold: p.sold, state: state(p.stock) }));
  return {
    tiles: [
      { key: "all", label: "All products", count: rows.length },
      { key: "Low", label: "Low stock", count: count(rows, (r) => r.state.label === "Low"), hint: "10 or fewer" },
      { key: "Out of stock", label: "Out of stock", count: count(rows, (r) => r.state.label === "Out of stock"), hint: "Reorder now" },
    ],
    rows,
  };
}

export const mockCustomers = (): T.CustomerRow[] =>
  CUSTOMERS.map((c) => ({ ...c, tag: tag(c.tag) }));

export function mockEnquiries(): T.EnquiriesData {
  const stages = ["New", "Contacted", "Quoted", "Negotiation", "Won", "Lost"];
  return {
    tiles: stages.map((s) => ({ key: s, label: s, count: count(ENQUIRIES, (e) => e.stage === s) })),
    rows: ENQUIRIES.map((e) => ({ id: e.id, company: e.company, contact: e.contact, email: e.email, items: e.items, qty: e.qty, branding: e.branding, stage: tag(e.stage), owner: e.owner, date: e.date, source: e.source, pillar: e.pillar })),
  };
}

export function mockPayments(): T.PaymentsData {
  const rows = ORDERS.map((o, i) => ({ id: `TX-${88120 - i}`, order: o.id, customer: cust(o.cust), method: o.pay, date: o.date, amount: o.total + o.ship, status: tag(o.payStatus) }));
  const sum = (s: string) => rows.filter((r) => r.status.label === s).reduce((a, r) => a + r.amount, 0).toLocaleString("en-US");
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

export const mockDiscounts = (): T.DiscountRow[] => DISCOUNTS.map((d) => ({ ...d, status: tag(d.status) }));

export const mockBundles = (): T.BundleRow[] =>
  BUNDLES.map((b) => ({ id: b.id, name: b.en, nameAr: b.ar, items: b.items.map((i) => prod(i)?.en ?? i), price: b.price, occasion: b.occasion, color: b.img, visible: b.visible }));

export const mockDelivery = (): T.DeliveryData => ({
  zones: ZONES.map((z) => ({ zone: z.zone, fee: z.fee, free: z.free, eta: z.eta, cod: z.cod, appointment: z.appt })),
  appointments: APPTS.map((a) => ({ order: a.order, customer: cust(a.cust), item: a.item, when: a.when, where: a.where, agent: a.agent, status: tag(a.status) })),
});

export const mockStaff = (): T.StaffRow[] => STAFF.map((s) => ({ ...s, status: tag(s.status) }));
export const mockActivity = (): T.ActivityRow[] => ACTIVITY.map((a) => ({ time: a.t, who: a.who, what: a.what, type: a.type }));

export const mockApprovals = (): T.ApprovalRow[] => [
  { id: "AP-51", request: "Price change · Gucci Bloom 100ml", by: "Zain", when: "24 Sep, 18:20", detail: "8,400 → 7,900 EGP", status: tag("Waiting") },
  { id: "AP-50", request: "Refund · RMA-2035", by: "Abdelfattah Mohamed", when: "24 Sep, 17:02", detail: "9,800 EGP to Paymob card", status: tag("Waiting") },
  { id: "AP-49", request: "New discount · MOTHERSDAY", by: "Nada Samir", when: "24 Sep, 11:40", detail: "15% on Fragrance, min 5,000 EGP", status: tag("Waiting") },
  { id: "AP-48", request: "Publish product · Chloé EDP 75ml", by: "Nada Samir", when: "23 Sep, 16:15", detail: "New product page", status: tag("Waiting") },
  { id: "AP-47", request: "Manual order discount · ZL-10491", by: "Ahmed", when: "23 Sep, 12:05", detail: "300 EGP off", status: tag("Waiting") },
  { id: "AP-46", request: "Stock adjustment · HB-483", by: "Ahmed", when: "22 Sep, 10:30", detail: "−4 units (damaged)", status: tag("Approved") },
];

export const mockReports = (): T.ReportsData => ({
  kpis: [
    { label: "Revenue", value: "907,350 EGP", delta: "+18.4%" },
    { label: "Orders", value: "152", delta: "+12.1%" },
    { label: "Average order", value: "5,969 EGP", delta: "+5.6%" },
    { label: "Returning customers", value: "38%", delta: "+4 pt" },
  ],
  byCategory: [
    { label: "Fragrance", value: 412300 }, { label: "Watches", value: 148500 }, { label: "Jewellery", value: 121900 },
    { label: "Beauty", value: 98400 }, { label: "Bags", value: 72650 }, { label: "Leather Goods", value: 53600 },
  ],
  byCity: [
    { label: "New Cairo", value: 214000 }, { label: "Zamalek", value: 168300 }, { label: "Sheikh Zayed", value: 131400 },
    { label: "Alexandria", value: 117900 }, { label: "Maadi", value: 88100 }, { label: "Other", value: 187650 },
  ],
});

const g = (title: string, rows: [string, string, Tone?][], description?: string): T.SettingsGroup => ({
  title, description, rows: rows.map(([label, value, tone]) => ({ label, value, tone })),
});

export const SIMPLE_PAGES: Record<string, () => T.SimplePageData> = {
  selling: () => ({ groups: [
    g("Selling mode by category", CATS.map((c) => [c.en, c.mode, c.mode === "Enquiry only" ? "info" : "ok"]), "Choose whether each category is sold online or by enquiry."),
    g("Rules", [["Enquiry-only products excluded from discounts", "On", "ok"], ["Show price on enquiry-only products", "Off", "mute"]]),
  ] }),
  browsing: () => ({ groups: [
    g("Live now", [["Visitors on site", "23"], ["Carts open", "7"], ["Checkout started", "2", "warn"]]),
    g("Follow-up automations", [["Abandoned cart email · 1 h", "Active", "ok"], ["Back-in-stock alert", "Active", "ok"], ["Viewed 3+ times reminder", "Paused", "mute"]]),
  ] }),
  loyalty: () => ({ groups: [
    g("Programme", [["Earn rate", "1 point per 100 EGP"], ["Redeem rate", "100 points = 50 EGP"], ["Points expire", "After 12 months"]]),
    g("Tiers", [["Silver", "0 – 19,999 EGP"], ["Gold", "20,000 – 49,999 EGP"], ["Black", "50,000 EGP +"]]),
    g("Members", [["Total members", "1,284"], ["Points outstanding", "412,600"], ["Redeemed · 30 days", "38,200"]]),
  ] }),
  gifting: () => ({ groups: [
    g("Gift services", [["Signature box wrapping", "150 EGP", "ok"], ["Ribbon wrapping", "Free", "ok"], ["Handwritten card", "Free", "ok"], ["Engraving (pens, lighters)", "350 EGP", "ok"]]),
    g("Delivery options", [["Send as a gift (hide prices)", "On", "ok"], ["Scheduled delivery date", "On", "ok"]]),
  ] }),
  content: () => ({ groups: [
    g("Homepage", [["Hero banner", "Autumn edit · live", "ok"], ["Curated for You", "10 products"], ["Featured Maisons", "8 maisons"]]),
    g("Pages", [["Corporate Gifting", "Published", "ok"], ["About Zelliny", "Published", "ok"], ["Returns policy", "Published", "ok"], ["Gift guide · Mother's Day", "Draft", "mute"]]),
  ] }),
  scripts: () => ({ groups: [
    g("Tracking", [["Google Analytics 4", "Connected", "ok"], ["Meta Pixel", "Connected", "ok"], ["TikTok Pixel", "Not set", "mute"], ["Google Tag Manager", "Connected", "ok"]]),
    g("Custom scripts", [["Head · Hotjar", "Active", "ok"], ["Body end · WhatsApp widget", "Active", "ok"]]),
  ] }),
  settings: () => ({ groups: [
    g("Store", [["Store name", "Zelliny"], ["Legal name", "Zelliny for Gifts and Luxury Products"], ["Currency", "EGP"], ["Languages", "English, Arabic"]]),
    g("Payments", [["Paymob · Card", "On", "ok"], ["Paymob · Wallet", "On", "ok"], ["Cash on Delivery", "On", "ok"], ["Bank transfer", "Manual orders only", "info"]]),
    g("Notifications", [["New order email", "ramy.bakr@zelliny.com"], ["Low stock alert", "10 units or fewer"]]),
  ] }),
};
