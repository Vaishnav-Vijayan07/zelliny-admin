// Shared data contracts. Your real API should return these shapes.

export type Tone = "ok" | "warn" | "bad" | "info" | "mute";
export type DateRange = "Today" | "7d" | "30d" | "90d" | "YTD";

export interface CurrentUser {
  id: string;
  name: string;
  initials: string;
  role: string;
  username: string;
}

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  badge?: number;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface NeedsNowItem {
  key: string;
  count: number;
  label: string;
  hint: string;
  target: string;
}

export interface Metric {
  label: string;
  value: string;
  delta: string;
  negative?: boolean;
}

export interface RevenueSummary {
  label: string;
  total: number;
  currency: string;
  delta: string;
  comparison: string;
  metrics: Metric[];
  series: { label: string; value: number }[];
}

export interface OrderSummary {
  id: string;
  customer: string;
  placedAt: string;
  city: string;
  payment: string;
  status: string;
  tone: Tone;
  total: number;
  currency: string;
}

export interface RankedProduct {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  value: number;
  unit?: string;
  badge?: { label: string; tone: Tone };
}

export interface RankedList {
  title: string;
  total: number;
  more: number;
  moreLabel: string;
  numbered: boolean;
  items: RankedProduct[];
}

export interface PipelineStage {
  label: string;
  count: number;
  color: "primary" | "info" | "quoted" | "warn" | "good" | "bad";
}

export interface DashboardData {
  greetingName: string;
  dateLabel: string;
  liveVisitors: number;
  needsNow: NeedsNowItem[];
  revenue: RevenueSummary;
  latestOrders: { items: OrderSummary[]; more: number };
  lowStock: RankedList;
  bestSellers: RankedList;
  mostEnquired: RankedList;
  pipeline: { open: number; notContacted: number; stages: PipelineStage[] };
}

export interface ShellData {
  user: CurrentUser;
  team: CurrentUser[];
  nav: NavGroup[];
  notifications: number;
}
