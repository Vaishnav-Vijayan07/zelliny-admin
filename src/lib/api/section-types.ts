// Data contracts for every admin section. Your real API should return these shapes.
import type { Tone } from "./types";

export interface Tile { key: string; label: string; count: number; hint?: string }
export interface Tagged { label: string; tone: Tone }

export interface OrderRow {
  id: string; date: string; customer: string; itemCount: number; payment: string;
  payStatus: Tagged; fulfilment: string; status: Tagged; total: number; zone: string;
}
export interface OrdersData { tiles: Tile[]; rows: OrderRow[] }

export interface ReturnRow {
  id: string; order: string; customer: string; item: string; reason: string; rule: string;
  amount: number; status: Tagged; date: string;
}
export interface ReturnsData { tiles: Tile[]; rows: ReturnRow[] }

export interface ProductRow {
  id: string; sku: string; name: string; nameAr: string; brand: string; category: string; mode: string;
  price: number | null; offer: number | null; stock: number; sold: number; enquiries: number;
  status: Tagged; color: string;
  gender: "Women" | "Men" | "Unisex";
  /** The product's own "On site" switch. */
  visible: boolean;
  imageCount: number;
  /** Set when the product's maison or category is switched off, e.g. "Chloé maison is off". */
  hiddenBy: string | null;
  isDraft: boolean;
}
export interface ProductsData { rows: ProductRow[]; brands: string[]; categories: string[]; genders: string[] }

export interface CategoryRow { id: string; name: string; nameAr: string; count: number; mode: string; order: number; status: Tagged }
export interface BrandRow { id: string; name: string; nameAr: string; categories: string; mode: string; count: number; featured: boolean; status: Tagged }

export interface InventoryRow { id: string; sku: string; name: string; brand: string; color: string; stock: number; sold: number; state: Tagged }
export interface InventoryData { tiles: Tile[]; rows: InventoryRow[] }

export interface CustomerRow { id: string; name: string; email: string; phone: string; city: string; orders: number; spent: number; since: string; tag: Tagged }
export interface EnquiryRow {
  id: string; company: string; contact: string; email: string; items: string; qty: number;
  branding: string; stage: Tagged; owner: string; date: string; source: string; pillar: string;
}
export interface EnquiriesData { tiles: Tile[]; rows: EnquiryRow[] }

export interface PaymentRow { id: string; order: string; customer: string; method: string; date: string; amount: number; status: Tagged }
export interface PaymentsData { summary: { label: string; value: string }[]; rows: PaymentRow[] }

export interface DiscountRow { code: string; type: string; value: string; scope: string; min: string; uses: string; dates: string; status: Tagged }
export interface BundleRow { id: string; name: string; nameAr: string; items: string[]; price: number; occasion: string; color: string; visible: boolean }

export interface ZoneRow { zone: string; fee: number; free: string; eta: string; cod: boolean; appointment: boolean }
export interface AppointmentRow { order: string; customer: string; item: string; when: string; where: string; agent: string; status: Tagged }
export interface DeliveryData { zones: ZoneRow[]; appointments: AppointmentRow[] }

export interface StaffRow { name: string; email: string; role: string; access: string; last: string; status: Tagged }
export interface ActivityRow { time: string; who: string; what: string; type: string }
export interface ApprovalRow { id: string; request: string; by: string; when: string; detail: string; status: Tagged }

export interface ReportsData {
  kpis: { label: string; value: string; delta: string }[];
  byCategory: { label: string; value: number }[];
  byCity: { label: string; value: number }[];
}

/** Generic "key/value" settings & simple list screens (loyalty, scripts, gifting, content, browsing, selling, settings). */
export interface SettingsGroup { title: string; description?: string | undefined; rows: { label: string; value: string; tone?: Tone | undefined }[] }
export interface SimplePageData { groups: SettingsGroup[] }
