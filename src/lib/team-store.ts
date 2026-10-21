// Team members and the roles they are assigned, kept in this browser (prototype).
// A role says which sections it can open (none / view only / can edit) and which actions it may take.
// Swap for API calls later; the pages only use the hooks and functions exported here.
import { useSyncExternalStore } from "react";
import { APP_PAGES } from "@/app.config";
import { TEAM_ACCOUNTS } from "@/lib/api/team-accounts";

export type Level = "none" | "view" | "edit";
/** Above any of these the change does not happen — it waits for the owner's approval. */
export interface Limits {
  /** Each single refund (EGP). */
  refund: number;
  /** All refunds one person gives in a day (EGP). */
  refundDay: number;
  /** Discount codes and offers (%). */
  discount: number;
  /** Price change up or down on Products (%). */
  price: number;
}
export const DEFAULT_LIMITS: Limits = { refund: 5000, refundDay: 15000, discount: 20, price: 20 };
export interface Role {
  id: string;
  name: string;
  description: string;
  /** The owner role can't be changed or deleted. */
  locked: boolean;
  access: Record<string, Level>;
  actions: Record<string, boolean>;
  limits: Limits;
}
export type MemberStatus = "Active" | "Invited" | "Disabled";
export interface Device {
  id: string;
  browser: string;
  city: string;
  seen: string;
}
export interface Member {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string;
  roleId: string;
  status: MemberStatus;
  lastSeen: string;
  /** Mobile number saved on the account (digits), used for the identity check. */
  mobile: string;
  /** Access ends on this date (ISO), "" = no end. */
  ends: string;
  devices: Device[];
}
export const MIN_PASSWORD = 8;

/** Sections only the owner can open — never offered to other roles. */
export const OWNER_ONLY = ["activity", "staff", "settings", "scripts"];
export const ACTIONS: { key: string; label: string; hint: string }[] = [
  {
    key: "contact",
    label: "See customer phone numbers and emails",
    hint: "When off, they are hidden — the Email and Call buttons still work",
  },
  { key: "export", label: "Download to Excel", hint: "When off, there are no download buttons" },
  {
    key: "values",
    label: "See deal values",
    hint: "When off, closed deals show the number of deals but no money amounts",
  },
  {
    key: "protected",
    label: "Payments & connections (protected)",
    hint: "Can switch payment methods and edit WhatsApp / Email / SMS connections — after confirming their own email, mobile number and a code. The owner is alerted every time.",
  },
];
/** Whether the signed-in role may take this action (see the Role page in Team & permissions). */
export const canDo = (roleName: string | null | undefined, key: string) =>
  !!roles.find((r) => r.name === roleName)?.actions[key];
/** Sections a role can be given, grouped like the menu. */
export const SECTION_GROUPS = APP_PAGES.map((g) => ({
  title: g.title,
  pages: g.pages.filter((p) => !OWNER_ONLY.includes(p.key)),
})).filter((g) => g.pages.length);
const ALL_KEYS = SECTION_GROUPS.flatMap((g) => g.pages.map((p) => p.key));

const acc = (edit: string[], view: string[] = []): Record<string, Level> => {
  const o: Record<string, Level> = {};
  ALL_KEYS.forEach((k) => {
    o[k] = edit.includes(k) ? "edit" : view.includes(k) ? "view" : "none";
  });
  return o;
};
const acts = (...on: string[]) =>
  Object.fromEntries(ACTIONS.map((a) => [a.key, on.includes(a.key)]));

let roles: Role[] = [
  {
    id: "owner",
    name: "Owner",
    description: "Everything. Only the owner changes the team, roles and settings.",
    locked: true,
    access: acc(ALL_KEYS),
    actions: acts(...ACTIONS.map((a) => a.key)),
    limits: { ...DEFAULT_LIMITS },
  },
  {
    id: "manager",
    name: "Store manager",
    description:
      "Runs the shop day to day — products, orders, marketing and the site. Team and settings stay with the owner.",
    locked: false,
    access: acc(
      [
        "dashboard",
        "orders",
        "returns",
        "customers",
        "enquiries",
        "products",
        "categories",
        "attributes",
        "brands",
        "selling",
        "inventory",
        "discounts",
        "bundles",
        "gifting",
        "content",
        "browsing",
        "loyalty",
      ],
      ["reports", "payments", "delivery"],
    ),
    actions: acts("contact", "values"),
    limits: { ...DEFAULT_LIMITS },
  },
  {
    id: "desk",
    name: "Order desk",
    description:
      "Orders, returns and refunds, payments and corporate enquiries. Customers and stock to look things up.",
    locked: false,
    access: acc(
      ["orders", "returns", "enquiries"],
      ["dashboard", "payments", "customers", "inventory"],
    ),
    actions: acts(),
    limits: { ...DEFAULT_LIMITS },
  },
  {
    id: "ops",
    name: "Operations",
    description: "Packing, returns received, stock counts and delivery.",
    locked: false,
    access: acc(
      ["orders", "returns", "inventory", "delivery"],
      ["dashboard", "products", "customers"],
    ),
    actions: acts(),
    limits: { ...DEFAULT_LIMITS },
  },
  {
    id: "content",
    name: "Content editor",
    description:
      "Products, pictures, bundles and what the site shows. No orders, no customers, no money.",
    locked: false,
    access: acc(
      ["products", "categories", "attributes", "brands", "bundles", "content"],
      ["dashboard", "inventory", "gifting", "browsing"],
    ),
    actions: acts(),
    limits: { ...DEFAULT_LIMITS },
  },
];
const roleIdOf: Record<string, string> = {
  Owner: "owner",
  "Store manager": "manager",
  "Order desk": "desk",
  Operations: "ops",
  "Content editor": "content",
};
const DEVICES: Record<string, Device[]> = {
  "ramy.bakr": [
    { id: "d1", browser: "Chrome · Windows", city: "Cairo", seen: "Now" },
    { id: "d2", browser: "Safari · iPhone", city: "Dubai", seen: "Yesterday" },
  ],
  zain: [
    { id: "d3", browser: "Safari · iPhone", city: "Cairo", seen: "2 h ago" },
    { id: "d4", browser: "Chrome · Mac", city: "Cairo", seen: "Yesterday" },
  ],
  ahmed: [{ id: "d5", browser: "Chrome · Windows", city: "Cairo", seen: "Yesterday" }],
  abdelfattah: [{ id: "d6", browser: "Chrome · Windows", city: "Cairo", seen: "Today 09:40" }],
  "nada.samir": [{ id: "d7", browser: "Chrome · Mac", city: "Giza", seen: "3 days ago" }],
};
const MOBILES: Record<string, string> = {
  "ramy.bakr": "1017171747",
  zain: "1001234567",
  ahmed: "1112345678",
  abdelfattah: "1223456789",
  "nada.samir": "1554321098",
};
let members: Member[] = TEAM_ACCOUNTS.map((a, i) => ({
  id: a.username,
  name: a.name,
  email: a.email,
  username: a.username,
  password: "zelliny123",
  roleId: roleIdOf[a.role] ?? "desk",
  status: "Active" as MemberStatus,
  lastSeen: ["Now", "2 h ago", "35 min ago", "Yesterday", "3 d ago"][i] ?? "—",
  mobile: MOBILES[a.username] ?? "",
  ends: a.username === "nada.samir" ? "2026-12-31" : "",
  devices: DEVICES[a.username] ?? [],
}));

/* ---------- approvals: requests above a role's limits wait here for the owner ---------- */
export type ApprovalKind = "Refund" | "Price change" | "Discount";
export interface Approval {
  id: string;
  kind: ApprovalKind;
  /** Member id of the person who asked. */
  who: string;
  what: string;
  ref: string;
  why: string;
  when: string;
  status: "wait" | "ok" | "no";
  /** "Approved by Ramy Bakr · Today" */
  decided?: string;
  /** Carries the change out once the owner approves. */
  apply?: () => void;
}
let approvals: Approval[] = [
  {
    id: "ap1",
    kind: "Refund",
    who: "zain",
    what: "Refund 8,400 EGP to Paymob wallet",
    ref: "RMA-2036 · Guess Iconic Gold-Tone Watch",
    why: "Above the 5,000 EGP refund limit",
    when: "Today 11:05",
    status: "wait",
  },
  {
    id: "ap2",
    kind: "Price change",
    who: "zain",
    what: "11,500 → 8,500 EGP (−26%)",
    ref: "Guess Iconic Gold-Tone Watch",
    why: "Above the 20% price-change limit",
    when: "Today 10:20",
    status: "wait",
  },
  {
    id: "ap3",
    kind: "Discount",
    who: "zain",
    what: "New code LEATHER30 · 30% off Leather Goods",
    ref: "Discounts & offers",
    why: "Above the 20% discount limit",
    when: "Yesterday 17:40",
    status: "wait",
  },
  {
    id: "ap5",
    kind: "Refund",
    who: "abdelfattah",
    what: "Refund 3,900 EGP to card",
    ref: "RMA-2038 · Burberry Her Eau de Parfum 100ml",
    why: "Over the 15,000 EGP daily refund total — 12,300 EGP already refunded today",
    when: "Today 13:20",
    status: "wait",
  },
  {
    id: "ap4",
    kind: "Refund",
    who: "abdelfattah",
    what: "Refund 6,450 EGP to card",
    ref: "RMA-2031 · Good Girl Eau de Parfum 80ml",
    why: "Above the 5,000 EGP refund limit",
    when: "18 Oct · 12:10",
    status: "ok",
    decided: "Approved by Ramy Bakr · 18 Oct 12:32",
  },
];
/** What each person has already refunded today (EGP), for the daily total. */
const refundedToday: Record<string, number> = { abdelfattah: 12300 };

/* ---------- security settings (owner only) ---------- */
export interface Security {
  locked: boolean;
  email: string;
  whatsapp: string;
  viaEmail: boolean;
  viaWhatsapp: boolean;
  alerts: Record<string, boolean>;
  idleMinutes: string;
  failedAttempts: string;
  backupEmail: string;
  backupPhone: string;
}
export const ALERTS: [string, string][] = [
  ["refund", "A refund is given"],
  ["price", "A price is changed"],
  ["discount", "A discount or offer is created"],
  ["excel", "Data is downloaded to Excel"],
  ["device", "Someone signs in from a new device"],
  ["failed", "Several failed sign-in attempts on one account"],
  ["team", "A team member is added, switched off or changes role"],
];
export const SECURITY: Security = {
  locked: false,
  email: "Ramy.Bakr@zelliny.com",
  whatsapp: "+20 10 1717 1747",
  viaEmail: true,
  viaWhatsapp: true,
  alerts: Object.fromEntries(ALERTS.map(([k]) => [k, true])),
  idleMinutes: "30",
  failedAttempts: "5",
  backupEmail: "Ramy.Bakr@mardiny.com",
  backupPhone: "+971 •• ••• 4410",
};

let version = 0;
const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};
export const bumpTeam = emit;
export const useRoles = () =>
  useSyncExternalStore(
    sub,
    () => roles,
    () => roles,
  );
export const useMembers = () =>
  useSyncExternalStore(
    sub,
    () => members,
    () => members,
  );
export const useApprovals = () =>
  useSyncExternalStore(
    sub,
    () => approvals,
    () => approvals,
  );
/** Re-renders when security settings change; the settings object itself is SECURITY. */
export const useSecurity = () =>
  useSyncExternalStore(
    sub,
    () => version,
    () => version,
  );

/* ---------- reading (also used by roles.ts for the page gate) ---------- */
/** Whether this person may use protected actions (payments, connections): the owner, or anyone given the permission. */
export const canUseProtected = (roleName: string | null | undefined) => {
  const r = roles.find((x) => x.name === roleName);
  return !!r && (r.id === "owner" || !!r.actions["protected"]);
};
export const findMemberByName = (name: string | null | undefined) =>
  members.find((m) => m.name === name);
export const ownerMember = () => members.find((m) => m.roleId === "owner")!;
export const findRoleByName = (name: string | null | undefined) =>
  roles.find((r) => r.name === name);
export const levelOf = (role: Role, key: string): Level =>
  role.id === "owner" ? "edit" : OWNER_ONLY.includes(key) ? "none" : (role.access[key] ?? "none");
export const slug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "");

/* ---------- roles ---------- */
/** Set while a just-created role has not been saved yet, so its page can say so. */
export const freshRoles = new Set<string>();
export function createRole(name: string, copyFrom?: Role): Role {
  const r: Role = copyFrom
    ? structuredClone({ ...copyFrom, id: `r${Date.now()}`, name, locked: false })
    : {
        id: `r${Date.now()}`,
        name,
        description: "",
        locked: false,
        access: acc([]),
        actions: acts(),
        limits: { ...DEFAULT_LIMITS },
      };
  roles = [...roles, r];
  freshRoles.add(r.id);
  emit();
  return r;
}
export function updateRole(
  id: string,
  patch: Partial<Pick<Role, "name" | "description" | "limits" | "access" | "actions">>,
) {
  roles = roles.map((r) => (r.id === id ? { ...r, ...patch } : r));
  freshRoles.delete(id);
  emit();
}
export function setLevel(id: string, key: string, level: Level) {
  roles = roles.map((r) => (r.id === id ? { ...r, access: { ...r.access, [key]: level } } : r));
  emit();
}
export function setAction(id: string, key: string, on: boolean) {
  roles = roles.map((r) => (r.id === id ? { ...r, actions: { ...r.actions, [key]: on } } : r));
  emit();
}
export function deleteRole(id: string) {
  roles = roles.filter((r) => r.id !== id);
  emit();
}

/* ---------- members ---------- */
/** Emails an invitation (the person sets their own password and 2-step code); status stays "Invited". */
export function inviteMember(m: {
  name: string;
  email: string;
  roleId: string;
  ends: string;
}): Member {
  const username = slug(m.email.split("@")[0] ?? m.name);
  const mem: Member = {
    id: username,
    name: m.name,
    email: m.email,
    username,
    password: "",
    roleId: m.roleId,
    status: "Invited",
    lastSeen: "—",
    mobile: "",
    ends: m.ends,
    devices: [],
  };
  members = [...members, mem];
  emit();
  return mem;
}
export function updateMember(
  id: string,
  patch: Partial<
    Pick<
      Member,
      "name" | "email" | "username" | "password" | "roleId" | "status" | "ends" | "devices"
    >
  >,
) {
  members = members.map((m) => (m.id === id ? { ...m, ...patch } : m));
  emit();
}
export function removeMember(id: string) {
  members = members.filter((m) => m.id !== id);
  emit();
}

/* ---------- limits and approvals ---------- */
const n0 = (n: number) => n.toLocaleString("en-US");
const memberByName = (name: string | null | undefined) => members.find((m) => m.name === name);
const limitsOf = (name: string | null | undefined): Limits | null => {
  const m = memberByName(name);
  const r = roles.find((x) => x.id === m?.roleId);
  return !r || r.id === "owner" ? null : r.limits;
};
/** Why a refund needs the owner's approval, or null when the person may do it. */
export function refundNeedsApproval(who: string | null | undefined, amount: number): string | null {
  const lim = limitsOf(who);
  const m = memberByName(who);
  if (!lim || !m) return null;
  if (amount > lim.refund) return `Above the ${n0(lim.refund)} EGP refund limit`;
  const done = refundedToday[m.id] ?? 0;
  if (done + amount > lim.refundDay)
    return `Over the ${n0(lim.refundDay)} EGP daily refund total — ${n0(done)} EGP already refunded today`;
  return null;
}
export function recordRefund(who: string | null | undefined, amount: number) {
  const m = memberByName(who);
  if (m) refundedToday[m.id] = (refundedToday[m.id] ?? 0) + amount;
}
export function discountNeedsApproval(who: string | null | undefined, percent: number) {
  const lim = limitsOf(who);
  return lim && percent > lim.discount ? `Above the ${lim.discount}% discount limit` : null;
}
export function priceNeedsApproval(who: string | null | undefined, percent: number) {
  const lim = limitsOf(who);
  return lim && Math.abs(percent) > lim.price ? `Above the ${lim.price}% price-change limit` : null;
}
/** The change does not happen; it waits under "Waiting for approval" and the owner is notified. */
export function requestApproval(
  a: Omit<Approval, "id" | "when" | "status" | "who"> & { who: string | null | undefined },
) {
  const m = memberByName(a.who);
  approvals = [
    {
      ...a,
      id: `ap${Date.now()}`,
      who: m?.id ?? "",
      when: "Today",
      status: "wait",
    },
    ...approvals,
  ];
  emit();
}
export function decideApproval(id: string, ok: boolean, by: string, reason?: string) {
  const a = approvals.find((x) => x.id === id);
  if (!a) return;
  if (ok) a.apply?.();
  a.status = ok ? "ok" : "no";
  a.decided = `${ok ? "Approved" : "Rejected"} by ${by} · Today${reason ? ` — ${reason}` : ""}`;
  approvals = [...approvals];
  emit();
}

/* ---------- lock all staff access ---------- */
export function setStaffLocked(locked: boolean) {
  SECURITY.locked = locked;
  emit();
}
