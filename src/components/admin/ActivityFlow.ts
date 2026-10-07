// Entries added during this browser session, shown above the sample log. Swap for an API call later.
// Other flows can call logActivity() to write a line under the signed-in person's name.
import { useSyncExternalStore } from "react";
import type { ActivityRow } from "@/lib/api/section-types";

const FIRST_NEW_REF = 88421;
let added: ActivityRow[] = [];
const listeners = new Set<() => void>();
const sub = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const emit = () => listeners.forEach((l) => l());

export type NewActivity = Pick<ActivityRow, "who" | "area" | "action"> &
  Partial<Pick<ActivityRow, "item" | "link" | "before" | "after" | "from" | "flag">>;

export function logActivity(e: NewActivity) {
  const row: ActivityRow = {
    item: "",
    before: "",
    after: "",
    from: "This browser",
    ...e,
    id: `LOG-${FIRST_NEW_REF + added.length}`,
    day: "Today",
    time: "Just now",
  };
  added = [row, ...added];
  emit();
}

/** Puts back the value an earlier change replaced; the restore itself is logged too. */
export function restoreActivity(row: ActivityRow, by: string) {
  logActivity({
    who: by,
    area: row.area,
    action: `Restored previous value · ${row.action.toLowerCase()}`,
    item: row.item,
    ...(row.link ? { link: row.link } : {}),
    before: row.after,
    after: row.before,
  });
}

export const useAddedActivity = () =>
  useSyncExternalStore(
    sub,
    () => added,
    () => added,
  );
