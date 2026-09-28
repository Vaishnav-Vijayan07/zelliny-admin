// Mock session, kept in the browser only. When you connect a real backend,
// replace this file with the real session store — the rest of the app only
// uses readSession / useSessionUser / clearSession.
import { useSyncExternalStore } from "react";
import type { CurrentUser } from "@/lib/api/types";

const KEY = "zelliny.session";

type Listener = () => void;
const listeners = new Set<Listener>();

function current(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

let snapshot: CurrentUser | null = null;

function notify() {
  snapshot = current();
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function readSession(): CurrentUser | null {
  return current();
}

export function writeSession(user: CurrentUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
  notify();
}

export function clearSession() {
  localStorage.removeItem(KEY);
  notify();
}

/** Returns the signed-in user, or null while unknown / signed out. */
export function useSessionUser(): CurrentUser | null {
  return useSyncExternalStore(
    (cb) => {
      snapshot ??= current();
      return subscribe(cb);
    },
    () => {
      snapshot ??= current();
      return snapshot;
    },
    () => null,
  );
}
