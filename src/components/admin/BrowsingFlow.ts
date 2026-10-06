// Follow-up emails sent and people excluded in this browser. Swap for API mutations later.
import { useSyncExternalStore } from "react";

export interface SentMail {
  when: string;
  subject: string;
  status: string;
}
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
export function recordSent(id: string, subject: string) {
  sent = {
    ...sent,
    [id]: [{ when: "Today", subject, status: "Sent · not opened yet" }, ...(sent[id] ?? [])],
  };
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

export const OFFERS = [
  "No discount",
  "Free gift wrap",
  "Free engraving",
  "5% off this item",
  "10% off this item",
];
export const firstName = (n: string) => n.split(" ")[0]!;
export const defaultSubject = (n: string) => `Still thinking about it, ${firstName(n)}?`;
