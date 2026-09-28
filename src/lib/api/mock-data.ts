// Sample data from the original prototype. Replace with real API calls in client.ts.
import type { DashboardData, DateRange, NavItem, ShellData } from "./types";
import { APP_PAGES } from "@/app.config";

const BADGES: Record<string, number> = { approvals: 5, orders: 3, returns: 4, enquiries: 2, inventory: 63 };

export function mockShell(): ShellData {
  const team = [
    { id: "ramy", name: "Ramy Bakr", initials: "RB", role: "Owner", username: "ramy.bakr" },
    { id: "zain", name: "Zain", initials: "Z", role: "Store manager", username: "zain" },
    { id: "ahmed", name: "Ahmed", initials: "A", role: "Operations", username: "ahmed" },
    { id: "abdelfattah", name: "Abdelfattah Mohamed", initials: "AM", role: "Order desk", username: "abdelfattah" },
    { id: "nada", name: "Nada Samir", initials: "NS", role: "Content editor", username: "nada.samir" },
  ];
  return {
    user: team[0]!,
    team,
    notifications: 4,
    // Menu structure comes from src/app.config.ts; the API only supplies badge counts.
    nav: APP_PAGES.map((g) => ({
      title: g.title,
      items: g.pages.map((p): NavItem => {
        const badge = BADGES[p.key];
        return badge != null ? { ...p, badge } : { ...p };
      }),
    })),
  };
}

const SERIES = [18200,22400,15800,27600,31200,24900,19400,21700,28900,33400,26100,22800,30600,36200,29400,24300,27100,34800,39600,31900,26700,29800,35400,41200,37800,30100,33900,42600,38700,44850];

function seriesLabels(): string[] {
  const out: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.UTC(2026, 7, 26 + i));
    out.push(`${d.getUTCDate()} ${d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })}`);
  }
  return out;
}

const RANGE_LABEL: Record<DateRange, string> = {
  Today: "today", "7d": "last 7 days", "30d": "last 30 days", "90d": "last 90 days", YTD: "year to date",
};

export function mockDashboard(range: DateRange): DashboardData {
  const labels = seriesLabels();
  return {
    greetingName: "Ramy",
    dateLabel: "Thursday 24 September",
    liveVisitors: 23,
    needsNow: [
      { key: "process", count: 3, label: "Orders to process", hint: "Pending and processing", target: "orders" },
      { key: "ship", count: 1, label: "Ready to ship", hint: "Book the courier", target: "orders" },
      { key: "returns", count: 4, label: "Returns to review", hint: "Inspect and refund", target: "returns" },
      { key: "enquiries", count: 2, label: "Enquiries to contact", hint: "Not yet called or emailed", target: "enquiries" },
      { key: "stock", count: 63, label: "Low or out of stock", hint: "Reorder", target: "inventory" },
    ],
    revenue: {
      label: `Revenue · ${RANGE_LABEL[range]}`,
      total: 907350,
      currency: "EGP",
      delta: "+18.4%",
      comparison: "vs previous 30 days",
      metrics: [
        { label: "Orders", value: "152", delta: "+12.1%" },
        { label: "Average order", value: "5,969 EGP", delta: "+5.6%" },
        { label: "Conversion", value: "2.1%", delta: "+0.3 pt" },
        { label: "Visitors", value: "7,238", delta: "+12.1%" },
      ],
      series: SERIES.map((value, i) => ({ value, label: labels[i] ?? "" })),
    },
    latestOrders: {
      more: 12,
      items: [
        { id: "ZL-10494", customer: "Hana Mostafa", placedAt: "24 Sep, 21:42", city: "6th of October", payment: "Paymob · Card", status: "Pending", tone: "warn", total: 6450, currency: "EGP" },
        { id: "ZL-10493", customer: "Karim Mansour", placedAt: "24 Sep, 19:10", city: "Alexandria", payment: "Paymob · Card", status: "Processing", tone: "info", total: 11500, currency: "EGP" },
        { id: "ZL-10492", customer: "Nadine El-Sayed", placedAt: "24 Sep, 16:05", city: "New Cairo", payment: "Paymob · Wallet", status: "Ready to ship", tone: "info", total: 12450, currency: "EGP" },
        { id: "ZL-10491", customer: "Youssef Kamal", placedAt: "24 Sep, 12:31", city: "Maadi", payment: "Cash on Delivery", status: "Processing", tone: "info", total: 2725, currency: "EGP" },
        { id: "ZL-10490", customer: "Laila Abdelrahman", placedAt: "23 Sep, 22:14", city: "Zamalek", payment: "Paymob · Card", status: "Return open", tone: "warn", total: 6900, currency: "EGP" },
      ],
    },
    lowStock: {
      title: "Low & out of stock · now", total: 63, more: 58, moreLabel: "to reorder", numbered: false,
      items: [
        { id: "PR-1M-EDT-100", name: "1 Million Eau de Toilette 100ml", subtitle: "PR-1M-EDT-100", color: "#b08a3e", value: 0, badge: { label: "Out of stock", tone: "bad" } },
        { id: "HB-483", name: "Hugo Boss Gear Matrix Ballpoint", subtitle: "HB-483", color: "#2b2b2b", value: 0, badge: { label: "Out of stock", tone: "bad" } },
        { id: "STD-508", name: "S.T. Dupont Le Grand Lighter", subtitle: "STD-508", color: "#9a9a9a", value: 0, badge: { label: "Out of stock", tone: "bad" } },
        { id: "HB-406", name: "Hugo Boss Contour Money Clip", subtitle: "HB-406", color: "#4a3a2e", value: 0, badge: { label: "Out of stock", tone: "bad" } },
        { id: "HB-489", name: "Hugo Boss Gear Icon Fountain Pen", subtitle: "HB-489", color: "#222228", value: 0, badge: { label: "Out of stock", tone: "bad" } },
      ],
    },
    bestSellers: {
      title: `Best sellers · ${RANGE_LABEL[range]}`, total: 120, more: 115, moreLabel: "products sold", numbered: true,
      items: [
        { id: "p1", name: "Cool Water Eau de Toilette 125ml", subtitle: "Davidoff", color: "#6c97b8", value: 9, unit: "sold" },
        { id: "p2", name: "1 Million Eau de Toilette 100ml", subtitle: "Paco Rabanne", color: "#b08a3e", value: 8, unit: "sold" },
        { id: "p3", name: "Good Girl Eau de Parfum 80ml", subtitle: "Carolina Herrera", color: "#23233a", value: 7, unit: "sold" },
        { id: "p4", name: "Versace Eros Eau de Toilette 100ml", subtitle: "Versace", color: "#5b8e92", value: 6, unit: "sold" },
        { id: "p5", name: "Gucci Bloom Eau de Parfum 100ml", subtitle: "Gucci", color: "#c9a7a4", value: 5, unit: "sold" },
      ],
    },
    mostEnquired: {
      title: `Most enquired · ${RANGE_LABEL[range]}`, total: 172, more: 167, moreLabel: "products enquired", numbered: true,
      items: [
        { id: "e1", name: "Hugo Boss Gear Matrix Ballpoint", subtitle: "Hugo Boss", color: "#2b2b2b", value: 14, unit: "enquiries" },
        { id: "e2", name: "Hugo Boss Gear Matrix Card Holder", subtitle: "Hugo Boss", color: "#4a3a2e", value: 12, unit: "enquiries" },
        { id: "e3", name: "Hugo Boss Gear Matrix Key Ring", subtitle: "Hugo Boss", color: "#262626", value: 12, unit: "enquiries" },
        { id: "e4", name: "Hugo Boss Grained Passport Holder", subtitle: "Hugo Boss", color: "#4a3a2e", value: 12, unit: "enquiries" },
        { id: "e5", name: "Hugo Boss Gear Ribs Fountain Pen", subtitle: "Hugo Boss", color: "#4a4d55", value: 12, unit: "enquiries" },
      ],
    },
    pipeline: {
      open: 6,
      notContacted: 2,
      stages: [
        { label: "New", count: 2, color: "primary" },
        { label: "Contacted", count: 1, color: "info" },
        { label: "Quoted", count: 2, color: "quoted" },
        { label: "Negotiation", count: 1, color: "warn" },
        { label: "Won", count: 1, color: "good" },
        { label: "Lost", count: 1, color: "bad" },
      ],
    },
  };
}
