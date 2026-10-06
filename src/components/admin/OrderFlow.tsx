// Order stage flow shared by the Orders list and the single-order page:
// the "next step" rules, the checklist dialogs, and local stage moves.
// Each move calls your API later — replace editOrder's body with a mutation.
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import type { DraftOrderRow, OrderDetail, OrderEvent, OrderRow } from "@/lib/api/section-types";
import type { Tone } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/hooks/use-session";
import { Button } from "./page";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const ORDER_STAGES = ["Pending", "Processing", "Ready to ship", "Shipped", "Delivered"];
const TONE: Record<string, Tone> = {
  Pending: "warn",
  Processing: "info",
  "Ready to ship": "info",
  Shipped: "info",
  Delivered: "ok",
  Cancelled: "mute",
  Returned: "mute",
  Paid: "ok",
  Unpaid: "warn",
  "Awaiting payment": "warn",
  Refunded: "mute",
  "Return open": "warn",
};
export const isAppt = (o: OrderRow) => o.fulfilment === "Appointment";
export const isCOD = (o: OrderRow) => o.payment === "Cash on Delivery";
export const isTeamStage = (o: OrderRow) =>
  ["Pending", "Processing", "Ready to ship"].includes(o.status.label);

/* ---------- local edits store ---------- */
export type OrderEdit = Partial<Pick<OrderRow, "awb" | "appointment">> & {
  status?: string;
  pay?: string;
  events?: OrderEvent[];
};
let edits: Record<string, OrderEdit> = {};
const listeners = new Set<() => void>();
const EMPTY: Record<string, OrderEdit> = {};

export function useOrderEdits() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => edits,
    () => EMPTY,
  );
}
export function editOrder(id: string, e: Omit<OrderEdit, "events">, event?: OrderEvent) {
  const cur = edits[id] ?? {};
  const events = event ? [...(cur.events ?? []), event] : cur.events;
  edits = { ...edits, [id]: { ...cur, ...e, ...(events && { events }) } };
  listeners.forEach((l) => l());
}
/* Manual orders placed and drafts saved in this browser — sent to your API later. */
let created: OrderDetail[] = [];
export type LocalDraft = DraftOrderRow & {
  /** The form state, so "Continue" reopens it as it was. */ form: unknown;
};
let drafts: LocalDraft[] = [];
const NONE: never[] = [];
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());
export const useCreatedOrders = () =>
  useSyncExternalStore(
    sub,
    () => created,
    () => NONE as OrderDetail[],
  );
export const useLocalDrafts = () =>
  useSyncExternalStore(
    sub,
    () => drafts,
    () => NONE as LocalDraft[],
  );
export function addOrder(o: OrderDetail) {
  created = [o, ...created];
  emit();
}
export function saveDraft(d: LocalDraft) {
  drafts = [d, ...drafts.filter((x) => x.id !== d.id)];
  emit();
}
export function removeDraft(id: string) {
  drafts = drafts.filter((x) => x.id !== id);
  emit();
}

/** Layers local edits over an order from the API. */
export function applyEdit<T extends OrderRow>(o: T, e?: OrderEdit): T {
  if (!e) return o;
  return {
    ...o,
    ...(e.awb !== undefined && { awb: e.awb }),
    ...(e.appointment !== undefined && { appointment: e.appointment }),
    status: e.status ? { label: e.status, tone: TONE[e.status] ?? "mute" } : o.status,
    payStatus: e.pay ? { label: e.pay, tone: TONE[e.pay] ?? "mute" } : o.payStatus,
  };
}

/* ---------- rules ---------- */
/** Stage an order can be moved from together with others — or null if it can't be bulk-moved. */
export const bulkKey = (o: OrderRow) =>
  o.status.label === "Pending"
    ? "Pending"
    : o.status.label === "Processing"
      ? "Processing"
      : o.status.label === "Ready to ship" && o.fulfilment === "Courier" && !o.awb
        ? "Ready to ship"
        : null;

/** The one button that moves an order on — empty when the courier owns the next step. */
export function nextLabel(o: OrderRow) {
  const s = o.status.label;
  if (s === "Pending") return "Confirm & start preparing";
  if (s === "Processing") return "Packed · Ready to ship";
  if (s === "Ready to ship") {
    if (o.fulfilment === "Pickup") return "Customer collected it";
    if (isAppt(o))
      return o.appointment ? "Out for delivery with our team" : "Book delivery appointment";
    return o.awb ? "" : "Book courier pickup";
  }
  if (s === "Shipped" && isAppt(o)) return "Delivered · signature taken";
  return "";
}
export const newAwb = () => `BST-8834${Math.floor(1000 + Math.random() * 8999)}`;
const PREV: Record<string, string> = { Processing: "Pending", "Ready to ship": "Processing" };
export const prevStage = (o: OrderRow) => PREV[o.status.label] ?? null;

/* ---------- next-step dialog ---------- */
type Kind = "confirm" | "pack" | "book" | "appt" | "collect" | "deliver" | "cancel" | "back";
type Item = { label: string; hint?: string; done?: boolean };

function checklist(kind: Kind, o: OrderRow): { title: string; ok: string; items: Item[] } | null {
  if (kind === "confirm")
    return {
      title: `Confirm ${o.id}`,
      ok: "Start preparing",
      items: [
        isCOD(o)
          ? {
              label: "Customer confirmed the order by phone",
              hint: "Cash on Delivery — call to confirm address and time",
            }
          : {
              label: "Payment received",
              hint: `${o.payment} · ${formatMoney(o.total)}`,
              done: o.payStatus.label === "Paid",
            },
        {
          label: "All items in stock",
          hint: "Checked automatically · stock is reserved for this order",
          done: true,
        },
      ],
    };
  if (kind === "pack")
    return {
      title: `Pack ${o.id}`,
      ok: "Mark Ready to ship",
      items: [
        ...o.lines.map((l) => ({
          label: `Picked: ${l.name} × ${l.qty}`,
          hint: `SKU ${l.sku} · check it is sealed and undamaged`,
        })),
        { label: "Gift wrap as ordered", hint: "Ribbon wrapping · Zelliny signature box" },
        { label: "Invoice printed and placed in the parcel" },
        { label: "Parcel sealed and labelled" },
      ],
    };
  if (kind === "collect")
    return {
      title: `Collected · ${o.id}`,
      ok: "Mark collected",
      items: [
        { label: `Handed to ${o.customer} at the office` },
        { label: "Signature taken" },
        ...(o.payStatus.label !== "Paid"
          ? [{ label: `Payment received · ${formatMoney(o.total)}` }]
          : []),
      ],
    };
  if (kind === "deliver")
    return {
      title: `Delivered · ${o.id}`,
      ok: "Mark delivered",
      items: [
        {
          label: `Handed to ${o.customer} in person`,
          hint: "ID checked for watches and fine jewellery",
        },
        { label: "Signature taken" },
        ...(isCOD(o) ? [{ label: `Cash collected · ${formatMoney(o.total)}` }] : []),
      ],
    };
  return null;
}

const Title = ({ children }: { children: ReactNode }) => (
  <DialogHeader>
    <DialogTitle className="font-head text-[18px] font-normal">{children}</DialogTitle>
  </DialogHeader>
);
const Kv = ({ rows }: { rows: [string, ReactNode][] }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
    {rows.map(([k, v]) => (
      <div key={k} className="contents">
        <dt className="text-muted-foreground">{k}</dt>
        <dd className="text-right">{v}</dd>
      </div>
    ))}
  </dl>
);
const Ok = ({
  disabled,
  onClick,
  children,
  danger,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "rounded-lg border px-4 py-2 text-[13px] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35",
      danger ? "border-bad bg-bad text-white" : "border-primary bg-primary text-primary-foreground",
    )}
  >
    {children}
  </button>
);

/**
 * Next-step actions for one order at a time.
 * Returns `run(order, kind?)` and the dialog element to render once on the page.
 */
export function useOrderActions() {
  const user = useSessionUser();
  const who = user?.name ?? "You";
  const [step, setStep] = useState<{ order: OrderRow; kind: Kind } | null>(null);
  const [ticks, setTicks] = useState<boolean[]>([]);
  const [reason, setReason] = useState("");
  const ev = (text: string): OrderEvent => ({ text, when: "Just now", who });

  const run = (o: OrderRow, forced?: "cancel" | "back") => {
    const s = o.status.label;
    const kind: Kind | null =
      forced ??
      (s === "Pending"
        ? "confirm"
        : s === "Processing"
          ? "pack"
          : s === "Ready to ship"
            ? o.fulfilment === "Pickup"
              ? "collect"
              : isAppt(o)
                ? o.appointment
                  ? null
                  : "appt"
                : "book"
            : s === "Shipped" && isAppt(o)
              ? "deliver"
              : null);
    if (!kind) {
      editOrder(o.id, { status: "Shipped" }, ev("Out for delivery with the Zelliny team"));
      toast(`${o.id} is out for delivery`);
      return;
    }
    const c = checklist(kind, o);
    setTicks(c ? c.items.map((i) => !!i.done) : []);
    setReason(kind === "cancel" ? "Customer request" : kind === "back" ? "Clicked by mistake" : "");
    setStep({ order: o, kind });
  };

  const finish = () => {
    if (!step) return;
    const o = step.order;
    if (step.kind === "book") {
      const awb = newAwb();
      editOrder(o.id, { awb }, ev(`Courier pickup booked · AWB ${awb}`));
      toast(`Pickup booked · ${awb}`);
    } else if (step.kind === "appt") {
      const slot = "26 Sep · 12:00 – 14:00 · Ahmed";
      editOrder(o.id, { appointment: slot }, ev(`Delivery appointment booked · ${slot}`));
      toast("Appointment booked");
    } else if (step.kind === "cancel") {
      const refund = o.payStatus.label === "Paid";
      editOrder(
        o.id,
        { status: "Cancelled", ...(refund && { pay: "Refunded" }) },
        ev(`Cancelled · ${reason}${refund ? " · refunded" : ""}`),
      );
      toast(`${o.id} cancelled`);
    } else if (step.kind === "back") {
      const prev = prevStage(o)!;
      editOrder(
        o.id,
        { status: prev, ...(o.awb && o.status.label === "Ready to ship" && { awb: null }) },
        ev(`Moved back to ${prev} · ${reason}`),
      );
      toast(`${o.id} moved back to ${prev}`);
    } else {
      const to = {
        confirm: "Processing",
        pack: "Ready to ship",
        collect: "Delivered",
        deliver: "Delivered",
      }[step.kind];
      const line = {
        confirm: "Confirmed · started preparing",
        pack: "Packing checklist completed · Ready to ship",
        collect: "Collected by customer at the office · signature taken",
        deliver: "Delivered in person · signature taken",
      }[step.kind];
      const markPaid =
        step.kind !== "pack" &&
        o.payStatus.label !== "Paid" &&
        (step.kind !== "confirm" || !isCOD(o));
      editOrder(o.id, { status: to, ...(markPaid && { pay: "Paid" }) }, ev(line));
      toast(`${o.id} → ${to}`);
    }
    setStep(null);
  };

  const o = step?.order;
  const c = step && o ? checklist(step.kind, o) : null;
  const open = ticks.filter((t) => !t).length;
  const sel = "h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px]";

  const dialog = (
    <Dialog open={!!step} onOpenChange={(v) => !v && setStep(null)}>
      <DialogContent className="max-w-[520px]">
        {o && c && (
          <>
            <Title>{c.title}</Title>
            <p className="text-[13.5px]">
              Tick each step as it's done. The order can only move on when everything is ticked.
            </p>
            <div className="flex flex-col gap-1">
              {c.items.map((it, i) => (
                <label
                  key={it.label}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13px]",
                    ticks[i] ? "border-primary bg-hover" : "border-border",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[#0a0a0a]"
                    checked={!!ticks[i]}
                    disabled={it.done}
                    onChange={() => setTicks((t) => t.map((v, j) => (j === i ? !v : v)))}
                  />
                  <div>
                    {it.label}
                    {it.hint && (
                      <span className="block text-[11.5px] text-muted-foreground">{it.hint}</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <p className={cn("text-[12.5px]", open ? "text-muted-foreground" : "text-good")}>
              {open
                ? `${open} step${open > 1 ? "s" : ""} still to tick`
                : "All done — ready to move on"}
            </p>
            <DialogFooter>
              <Button onClick={() => setStep(null)}>Cancel</Button>
              <Ok disabled={open > 0} onClick={finish}>
                {c.ok}
              </Ok>
            </DialogFooter>
          </>
        )}
        {o && step?.kind === "book" && (
          <>
            <Title>Book courier for {o.id}</Title>
            <Kv
              rows={[
                ["Courier", "Bosta"],
                ["Pickup", "Today · before 18:00"],
                ["Deliver to", `${o.customer} · ${o.zone}`],
                ["Cash to collect", isCOD(o) ? formatMoney(o.total) : "None — already paid"],
              ]}
            />
            <p className="text-[12px] text-muted-foreground">
              Booking creates the AWB and shipping label. The order moves to Shipped by itself when
              Bosta scans the parcel at pickup.
            </p>
            <DialogFooter>
              <Button onClick={() => setStep(null)}>Cancel</Button>
              <Ok onClick={finish}>Book pickup</Ok>
            </DialogFooter>
          </>
        )}
        {o && step?.kind === "appt" && (
          <>
            <Title>Book delivery appointment · {o.id}</Title>
            <p className="text-[13px] text-muted-foreground">
              Watches and fine jewellery are delivered by our own team, in person.
            </p>
            <Kv
              rows={[
                ["Slot", "26 Sep 2026 · 12:00 – 14:00"],
                ["Delivered by", "Ahmed"],
              ]}
            />
            <DialogFooter>
              <Button onClick={() => setStep(null)}>Cancel</Button>
              <Ok onClick={finish}>Book appointment</Ok>
            </DialogFooter>
          </>
        )}
        {o && step?.kind === "cancel" && (
          <>
            <Title>Cancel {o.id}</Title>
            <p className="text-[13.5px]">
              Cancelling releases the stock
              {o.payStatus.label === "Paid" ? (
                <>
                  {" "}
                  and refunds <b className="font-semibold">{formatMoney(o.total)}</b> to the
                  customer's {o.payment}
                </>
              ) : null}
              .
            </p>
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
              Reason
              <select value={reason} onChange={(e) => setReason(e.target.value)} className={sel}>
                {[
                  "Customer request",
                  "Out of stock",
                  "Customer unreachable",
                  "Suspected fraud",
                  "Other",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <DialogFooter>
              <Button onClick={() => setStep(null)}>Keep order</Button>
              <Ok danger onClick={finish}>
                Cancel order
              </Ok>
            </DialogFooter>
          </>
        )}
        {o && step?.kind === "back" && (
          <>
            <Title>
              Move {o.id} back to {prevStage(o)}?
            </Title>
            <p className="text-[13px] text-muted-foreground">
              Use this only to fix a mistake. It is recorded under your name.
            </p>
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
              Reason
              <select value={reason} onChange={(e) => setReason(e.target.value)} className={sel}>
                {[
                  "Clicked by mistake",
                  "Item damaged — repacking",
                  "Customer changed the order",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <DialogFooter>
              <Button onClick={() => setStep(null)}>Cancel</Button>
              <Ok onClick={finish}>Move back</Ok>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  return { run, dialog, who };
}
