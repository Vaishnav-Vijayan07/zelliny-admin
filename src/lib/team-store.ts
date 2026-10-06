// Team members and the roles they are assigned, kept in this browser (prototype).
// A role says which sections it can open (none / view only / can edit) and which actions it may take.
// Swap for API calls later; the pages only use the hooks and functions exported here.
import { useSyncExternalStore } from "react";
import { APP_PAGES } from "@/app.config";
import { TEAM_ACCOUNTS } from "@/lib/api/team-accounts";

export type Level = "none" | "view" | "edit";
export interface Role {
  id: string;
  name: string;
  description: string;
  /** The owner role can't be changed or deleted. */
  locked: boolean;
  access: Record<string, Level>;
  actions: Record<string, boolean>;
}
export type MemberStatus = "Active" | "Invited" | "Disabled";
export interface Member { id: string; name: string; email: string; username: string; password: string; roleId: string; status: MemberStatus; lastSeen: string }
export const MIN_PASSWORD = 8;

/** Sections only the owner can open — never offered to other roles. */
export const OWNER_ONLY = ["staff", "settings", "scripts"];
export const ACTIONS: { key: string; label: string; hint: string }[] = [
  { key: "contact", label: "See customer phone numbers and emails", hint: "When off, they are hidden — the Email and Call buttons still work" },
  { key: "export", label: "Download to Excel", hint: "When off, there are no download buttons" },
];
/** Sections a role can be given, grouped like the menu. */
export const SECTION_GROUPS = APP_PAGES.map((g) => ({ title: g.title, pages: g.pages.filter((p) => !OWNER_ONLY.includes(p.key)) })).filter((g) => g.pages.length);
const ALL_KEYS = SECTION_GROUPS.flatMap((g) => g.pages.map((p) => p.key));

const acc = (edit: string[], view: string[] = []): Record<string, Level> => {
  const o: Record<string, Level> = {};
  ALL_KEYS.forEach((k) => { o[k] = edit.includes(k) ? "edit" : view.includes(k) ? "view" : "none"; });
  return o;
};
const acts = (...on: string[]) => Object.fromEntries(ACTIONS.map((a) => [a.key, on.includes(a.key)]));

let roles: Role[] = [
  { id: "owner", name: "Owner", description: "Everything. Only the owner changes the team, roles and settings.", locked: true, access: acc(ALL_KEYS), actions: acts(...ACTIONS.map((a) => a.key)) },
  { id: "manager", name: "Store manager", description: "Runs the shop day to day — products, orders, marketing and the site. Team and settings stay with the owner.",
    locked: false, access: acc(["dashboard", "orders", "returns", "customers", "enquiries", "products", "categories", "attributes", "brands", "selling", "inventory", "discounts", "bundles", "gifting", "content", "browsing", "loyalty"], ["reports", "activity", "payments", "delivery"]), actions: acts("contact") },
  { id: "desk", name: "Order desk", description: "Orders, returns and refunds, payments and corporate enquiries. Customers and stock to look things up.",
    locked: false, access: acc(["orders", "returns", "enquiries"], ["dashboard", "payments", "customers", "inventory", "activity"]), actions: acts() },
  { id: "ops", name: "Operations", description: "Packing, returns received, stock counts and delivery.",
    locked: false, access: acc(["orders", "returns", "inventory", "delivery"], ["dashboard", "activity", "products", "customers"]), actions: acts() },
  { id: "content", name: "Content editor", description: "Products, pictures, bundles and what the site shows. No orders, no customers, no money.",
    locked: false, access: acc(["products", "categories", "attributes", "brands", "bundles", "content"], ["dashboard", "activity", "inventory", "gifting", "browsing"]), actions: acts() },
];
const roleIdOf: Record<string, string> = { Owner: "owner", "Store manager": "manager", "Order desk": "desk", Operations: "ops", "Content editor": "content" };
let members: Member[] = TEAM_ACCOUNTS.map((a, i) => ({
  id: a.username, name: a.name, email: a.email, username: a.username, password: "zelliny123", roleId: roleIdOf[a.role] ?? "desk", status: "Active" as MemberStatus,
  lastSeen: ["Now", "2 h ago", "35 min ago", "Yesterday", "3 d ago"][i] ?? "—",
}));

const listeners = new Set<() => void>();
const sub = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const emit = () => listeners.forEach((l) => l());
export const useRoles = () => useSyncExternalStore(sub, () => roles, () => roles);
export const useMembers = () => useSyncExternalStore(sub, () => members, () => members);

/* ---------- reading (also used by roles.ts for the page gate) ---------- */
export const findRoleByName = (name: string | null | undefined) => roles.find((r) => r.name === name);
export const levelOf = (role: Role, key: string): Level => (role.id === "owner" ? "edit" : OWNER_ONLY.includes(key) ? "none" : role.access[key] ?? "none");
export const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, ".").replace(/(^\.|\.$)/g, "");

/* ---------- roles ---------- */
export function createRole(name: string): Role {
  const r: Role = { id: `r${Date.now()}`, name, description: "", locked: false, access: acc([]), actions: acts() };
  roles = [...roles, r]; emit(); return r;
}
export function updateRole(id: string, patch: Partial<Pick<Role, "name" | "description">>) { roles = roles.map((r) => (r.id === id ? { ...r, ...patch } : r)); emit(); }
export function setLevel(id: string, key: string, level: Level) { roles = roles.map((r) => (r.id === id ? { ...r, access: { ...r.access, [key]: level } } : r)); emit(); }
export function setAction(id: string, key: string, on: boolean) { roles = roles.map((r) => (r.id === id ? { ...r, actions: { ...r.actions, [key]: on } } : r)); emit(); }
export function deleteRole(id: string) { roles = roles.filter((r) => r.id !== id); emit(); }

/* ---------- members ---------- */
export function inviteMember(m: { name: string; email: string; password: string; roleId: string }): Member {
  const username = slug(m.email.split("@")[0] ?? m.name);
  const mem: Member = { id: username, name: m.name, email: m.email, username, password: m.password, roleId: m.roleId, status: "Active", lastSeen: "Not signed in yet" };
  members = [...members, mem]; emit(); return mem;
}
export function updateMember(id: string, patch: Partial<Pick<Member, "name" | "email" | "username" | "password" | "roleId" | "status">>) { members = members.map((m) => (m.id === id ? { ...m, ...patch } : m)); emit(); }
export function removeMember(id: string) { members = members.filter((m) => m.id !== id); emit(); }
