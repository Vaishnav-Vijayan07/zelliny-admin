// Data contracts for every admin section. Your real API should return these shapes.
import type { Tone } from "./types";

export interface Tile {
  key: string;
  label: string;
  count: number;
  hint?: string;
  /** Who owns this stage — tiles are grouped under it. */ group?: string;
}
export interface Tagged {
  label: string;
  tone: Tone;
}

export interface OrderLine {
  name: string;
  sku: string;
  qty: number;
  price: number;
  /** Category id, e.g. "fragrance" — the returns policy depends on it. */ category?: string;
}
export interface OrderRow {
  id: string;
  date: string;
  customer: string;
  itemCount: number;
  payment: string;
  /** "Courier" | "Appointment" | "Pickup" */
  payStatus: Tagged;
  fulfilment: string;
  status: Tagged;
  total: number;
  zone: string;
  lines: OrderLine[];
  /** Taken by phone, WhatsApp or in person — not from the website. */
  manual: boolean;
  /** Courier airway bill, set once a pickup is booked. */
  awb: string | null;
  /** Booked in-person delivery slot, for appointment orders. */
  appointment: string | null;
  /** Date the customer received it, e.g. "19 Sep 2026" — return windows count from here. */
  deliveredOn?: string | null;
}
/** One line in an order's history — who did what, when. `who` is a person, "Customer", "Paymob" or "Bosta". */
export interface OrderEvent {
  text: string;
  when: string;
  who: string;
}
/** Everything on the single-order page. */
export interface OrderDetail extends OrderRow {
  customerInfo: {
    id: string;
    name: string;
    email: string;
    phone: string;
    orders: number;
    spent: number;
  };
  subtotal: number;
  discount: number;
  delivery: number;
  address: string;
  transactionId: string | null;
  gift: { wrap: string; message: string; hidePrices: boolean };
  history: OrderEvent[];
}
/** A manual order saved but not placed — doesn't count in orders or revenue. */
export interface DraftOrderRow {
  id: string;
  saved: string;
  by: string;
  customer: string;
  lines: OrderLine[];
  source: string;
  total: number;
  note?: string;
}
export interface OrdersData {
  tiles: Tile[];
  rows: OrderRow[];
  drafts: DraftOrderRow[];
}

export interface RefundRecord {
  ref: string;
  method: string;
  amount: number;
  by: string;
  when: string;
}
export interface ReturnRow {
  id: string;
  order: string;
  customer: string;
  /** First returned item's name (all items are in `lines`). */
  item: string;
  /** The customer's own words. */
  reason: string;
  /** Policy rule it was matched to, e.g. "Manufacturing defect · within 30 days". */
  rule: string;
  /** Reason type chosen by the team, e.g. "Manufacturing defect". */
  kind: string;
  amount: number;
  status: Tagged;
  date: string;
  lines: OrderLine[];
  customerInfo: { id: string; name: string; phone: string };
  /** Courier pickup airway bill for the return, if Bosta collects it. */
  awb: string | null;
  /** The order’s payment method — refunds go back to it. */
  payment: string;
  /** How the request reached us, e.g. "Website form", "Phone call". */
  via: string;
  photos: number;
  inspect: string | null;
  refund: RefundRecord | null;
  /** Who did what, oldest first. `who` is a person, the customer, or "Bosta". */
  log: OrderEvent[];
}
export interface ReturnsData {
  tiles: Tile[];
  rows: ReturnRow[];
  /** Returns-policy windows are measured from this date (normally today). */
  asOf: string;
  policy: { title: string; text: string }[];
}

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  nameAr: string;
  brand: string;
  category: string;
  mode: string;
  price: number | null;
  offer: number | null;
  stock: number;
  sold: number;
  enquiries: number;
  status: Tagged;
  color: string;
  gender: "Women" | "Men" | "Unisex";
  /** The product's own "On site" switch. */
  visible: boolean;
  imageCount: number;
  /** Set when the product's maison or category is switched off, e.g. "Chloé maison is off". */
  hiddenBy: string | null;
  isDraft: boolean;
}
export interface ProductsData {
  rows: ProductRow[];
  brands: string[];
  categories: string[];
  genders: string[];
}

export interface CategoryRow {
  id: string;
  name: string;
  nameAr: string;
  count: number;
  mode: string;
  order: number;
  status: Tagged;
}
export interface BrandRow {
  id: string;
  name: string;
  nameAr: string;
  categories: string;
  mode: string;
  count: number;
  featured: boolean;
  status: Tagged;
}

export type AttributePreviewType = "COLOR" | "ICON" | "TEXT";
/** `color` is a hex string (COLOR type), `icon` a data/image URL (ICON type) — both null otherwise. */
export interface AttributeValueRow {
  id: string;
  value: string;
  color: string | null;
  icon: string | null;
  iconAlt: string | null;
}
export interface AttributeRow {
  id: string;
  name: string;
  previewType: AttributePreviewType;
  values: AttributeValueRow[];
  status: Tagged;
}

/** A customer who pressed "Notify me when it's back" on a sold-out product. */
export interface WaitingCustomer {
  id: string;
  name: string;
  email: string;
  date: string;
  account: "Customer" | "Guest";
  language: "English" | "Arabic";
  notified: string | null;
}
export interface WaitlistRow {
  productId: string;
  customers: WaitingCustomer[];
}
export interface PreorderRow {
  productId: string;
  expected: string;
  limit: number;
  open: boolean;
  payment: string;
  customers: { customerId: string; name: string; date: string }[];
}
/** Stock lives on the products themselves (productsQuery); this is what Inventory adds. */
export interface InventoryData {
  waitlists: WaitlistRow[];
  preorders: PreorderRow[];
  /** Site-wide switches that live on this page. */
  features: { backInStock: boolean; preorders: boolean };
}

/** One saved delivery address. The default one is also mirrored into `address` / `city`. */
export interface CustomerAddress {
  id: string;
  /** Home, Work, Other … */
  label: string;
  address: string;
  city: string;
  isDefault: boolean;
}
export interface CustomerRow {
  id: string;
  name: string;
  /** Empty when the customer never gave one (e.g. ordered by phone). */
  email: string;
  phone: string;
  city: string;
  orders: number;
  spent: number;
  since: string;
  /** What they agreed to receive offers by. Order and delivery updates are always sent. */
  marketing: { email: boolean; sms: boolean; whatsapp: boolean };
  language: "English" | "Arabic";
  address: string;
  /** Every saved delivery address; the default one is mirrored into `address` / `city`. */
  addresses: CustomerAddress[];
  birthday: string;
  /** How they found us, e.g. "Instagram". */
  source: string;
  notes: string;
}
export interface CustomersData {
  rows: CustomerRow[];
  /** All accounts in the store — `rows` may be the first page of them. */
  totalAccounts: number;
}
/** Where an enquiry came from — captured by the website form, or "added by hand". */
export interface EnquirySource {
  channel: string;
  how: string;
  page?: string;
  campaign?: string;
  device?: string;
  visits?: number;
  manual?: boolean;
}
export interface QuoteLine {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  unit: number;
  /** Personalisation price per piece. */ pers: number;
}
export interface EnquiryRow {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  items: string;
  qty: number;
  /** Personalisation asked for, e.g. "Logo engraving". */
  branding: string;
  stage: Tagged;
  owner: string;
  date: string;
  time: string;
  /** Category of interest. */
  interest: string;
  budget: string;
  needBy: string;
  message: string;
  src: EnquirySource;
  followUp: string;
  quote: QuoteLine[];
  quoteRef: string | null;
  quoteSent: string | null;
  /** Order created from this enquiry, once won. */
  order: string | null;
  /** Arrived and not opened yet. */
  unread: boolean;
  /** History, oldest first. `via` is "System", "Phone", "Email", "WhatsApp" or "Note". */
  log: { via: string; text: string; when: string }[];
}
export interface EnquiriesData {
  rows: EnquiryRow[];
  /** Team members who can own an enquiry (from Team & permissions). */
  owners: string[];
  /** Products that can go on a quotation. */
  products: { id: string; name: string; sku: string; brand: string; price: number | null }[];
}

export interface PaymentRow {
  id: string;
  order: string;
  customer: string;
  method: string;
  date: string;
  amount: number;
  status: Tagged;
}
export interface PaymentsData {
  summary: { label: string; value: string }[];
  rows: PaymentRow[];
}

export interface DiscountRow {
  code: string;
  type: string;
  value: string;
  scope: string;
  min: string;
  uses: string;
  dates: string;
  status: Tagged;
}
export interface BundleLine {
  productId: string;
  qty: number;
}
export interface BundleRow {
  id: string;
  name: string;
  nameAr: string;
  items: string[];
  lines: BundleLine[];
  mode: string;
  price: number;
  occasion: string;
  color: string;
  visible: boolean;
}

export interface ZoneRow {
  id: string;
  name: string;
  areas: string[];
  fee: number;
  free: string;
  eta: string;
  cod: boolean;
}
export interface AppointmentRow {
  order: string;
  customer: string;
  item: string;
  when: string;
  where: string;
  agent: string;
  status: Tagged;
}
export interface DeliveryData {
  zones: ZoneRow[];
  appointments: AppointmentRow[];
}

export interface StaffRow {
  name: string;
  email: string;
  role: string;
  access: string;
  last: string;
  status: Tagged;
}
/** Where an activity row's item links to. */
export type ActivityLink =
  | { kind: "order" | "return" | "product" | "enquiry"; id: string }
  | { kind: "section"; section: string };
export interface ActivityRow {
  /** Log reference shown in the detail dialog, e.g. LOG-88420. */
  id: string;
  day: string;
  time: string;
  /** A team member's name, or "System" for automatic entries. */
  who: string;
  area: string;
  action: string;
  item: string;
  link?: ActivityLink;
  before: string;
  after: string;
  /** Device / place the action came from. */
  from: string;
  /** Highlighted red, e.g. a failed sign-in. */
  flag?: boolean;
}
export interface ApprovalRow {
  id: string;
  request: string;
  by: string;
  when: string;
  detail: string;
  status: Tagged;
}

export interface ReportsData {
  kpis: { label: string; value: string; delta: string }[];
  byCategory: { label: string; value: number }[];
  byCity: { label: string; value: number }[];
}

/** Generic "key/value" settings & simple list screens (loyalty, scripts, gifting, content, browsing, selling, settings). */
export interface SettingsGroup {
  title: string;
  description?: string | undefined;
  rows: { label: string; value: string; tone?: Tone | undefined }[];
}
export interface SimplePageData {
  groups: SettingsGroup[];
}

/** Everything the "Create manual order" form needs to pick from. */
export interface OrderFormData {
  customers: {
    id: string;
    name: string;
    phone: string;
    email: string;
    city: string;
    orders: number;
    address: string;
  }[];
  products: {
    id: string;
    name: string;
    sku: string;
    brand: string;
    price: number | null;
    stock: number;
    color: string;
  }[];
  /** Delivery areas with the courier fee for each. */
  zones: { name: string; fee: number }[];
  sources: string[];
}

/* ---------- Browsing & follow-up ---------- */
export type BrowserStop = "home" | "category" | "product" | "bag" | "checkout";
export interface BrowserView {
  productId: string;
  name: string;
  brand: string;
  category: string;
  price: number | null;
  color: string;
  times: number;
}
export interface BrowserRow {
  id: string;
  name: string;
  email: string;
  how: string;
  optin: boolean;
  last: string;
  visits: number;
  views: BrowserView[];
  stop: BrowserStop;
  stopTxt: string;
  intent: "Hot" | "Warm" | "Cool";
  src: string;
  device: string;
  sent: { when: string; subject: string; status: string }[];
  /** Linked customer record, when this person has ordered before. */
  customer: { id: string; orders: number; spent: number } | null;
}
export interface BrowsingData {
  visitors: number;
  rows: BrowserRow[];
}
