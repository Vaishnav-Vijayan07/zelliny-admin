// Follow-ups sent and people excluded in this browser. Swap for API mutations later.
import { useSyncExternalStore } from "react";
import type { SentMessage } from "@/lib/api/section-types";

export type SentMail = SentMessage;
let sent: Record<string, SentMail[]> = {};
let excluded: string[] = [];
const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());
const NO_S: Record<string, SentMail[]> = {};
const NO_X: string[] = [];

export const useSentMails = () =>
  useSyncExternalStore(
    sub,
    () => sent,
    () => NO_S,
  );
export const useExcluded = () =>
  useSyncExternalStore(
    sub,
    () => excluded,
    () => NO_X,
  );
/** Records a message sent to one person; it shows up under "Follow-ups sent" on their page. */
export function recordSent(id: string, m: Omit<SentMail, "when" | "status">) {
  const status = m.channel === "WhatsApp" ? "Delivered" : "Not opened yet";
  sent = { ...sent, [id]: [{ ...m, when: "Today", status }, ...(sent[id] ?? [])] };
  emit();
}
export function excludeFromFollowUp(id: string) {
  if (!excluded.includes(id)) {
    excluded = [...excluded, id];
    emit();
  }
}
export function includeInFollowUp(id: string) {
  excluded = excluded.filter((x) => x !== id);
  emit();
}

export const NO_OFFER = "No discount";
/** Personal offers: each person gets their own one-use code. */
export const PERSONAL_OFFERS = ["5% off this item", "10% off this item"];
export const EXPIRY_DAYS = ["3", "7", "14"];
export const firstName = (n: string) => n.split(" ")[0]!;
export const defaultSubject = (n: string) => `Still thinking about it, ${firstName(n)}?`;
export const whatsappSubject = (n: string) => `Hi ${firstName(n)}, your selection is waiting`;

/** One-use code for a person, e.g. "NE10-Z96". */
export function personalCode(name: string, offer: string) {
  const pct = offer.match(/^(\d+)%/)?.[1] ?? "";
  const init = name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${init}${pct}-${rand}`;
}
export function expiryLabel(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
