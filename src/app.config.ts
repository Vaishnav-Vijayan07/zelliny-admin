// Central list of every admin page — like the routes table in a classic App.js.
// Each entry: key (URL segment, "dashboard" = "/"), label, icon, and menu group.
// To add a page: add an entry here, create src/pages/XPage.tsx, and a thin src/routes/x.tsx.

export interface AppPage {
  key: string;
  label: string;
  icon: string;
}

export interface AppPageGroup {
  title: string;
  pages: AppPage[];
}

export const APP_PAGES: AppPageGroup[] = [
  { title: "Overview", pages: [
    { key: "dashboard", label: "Dashboard", icon: "◰" },
    { key: "approvals", label: "Approvals", icon: "✓" },
    { key: "reports", label: "Reports", icon: "◔" },
    { key: "activity", label: "Activity log", icon: "◷" },
  ]},
  { title: "Sales", pages: [
    { key: "orders", label: "Orders", icon: "▤" },
    { key: "returns", label: "Returns & refunds", icon: "↺" },
    { key: "payments", label: "Payments", icon: "◈" },
    { key: "customers", label: "Customers", icon: "◉" },
  ]},
  { title: "Corporate", pages: [
    { key: "enquiries", label: "Corporate enquiries", icon: "✉" },
  ]},
  { title: "Catalogue", pages: [
    { key: "products", label: "Products", icon: "◇" },
    { key: "categories", label: "Categories", icon: "▦" },
    { key: "brands", label: "Maisons", icon: "❖" },
    { key: "selling", label: "Selling control", icon: "⇄" },
    { key: "inventory", label: "Inventory", icon: "▥" },
  ]},
  { title: "Marketing", pages: [
    { key: "discounts", label: "Discounts & offers", icon: "%" },
    { key: "browsing", label: "Browsing & follow-up", icon: "◎" },
    { key: "loyalty", label: "Loyalty programme", icon: "♢" },
    { key: "bundles", label: "Bundles & gift sets", icon: "❒" },
    { key: "gifting", label: "Gift services", icon: "✦" },
    { key: "content", label: "Site content", icon: "▣" },
  ]},
  { title: "Operations", pages: [
    { key: "delivery", label: "Delivery", icon: "➤" },
    { key: "staff", label: "Team & permissions", icon: "☰" },
    { key: "scripts", label: "Tracking & scripts", icon: "⌘" },
    { key: "settings", label: "Settings", icon: "⚙" },
  ]},
];
