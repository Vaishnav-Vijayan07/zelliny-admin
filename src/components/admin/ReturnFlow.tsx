// Returns & refunds flow shared by the Returns list and the single-return page:
// the stage rules, the step dialogs, the returns-policy check and "Log a return".
// Each change is local for now — replace editReturn/addReturn with API mutations.
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import type { OrderEvent, OrderRow, RefundRecord, ReturnRow } from "@/lib/api/section-types";
import type { Tone } from "@/lib/api/types";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/hooks/use-session";
import { Button } from "./page";
import { Thumb } from "./primitives";
import { editOrder } from "./OrderFlow";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const RETURN_STAGES = ["Requested", "Approved", "Received", "Inspected", "Refunded"];
const TONE: Record<string, Tone> = { Requested: "warn", Approved: "info", Received: "warn", Inspected: "warn", Refunded: "ok", Rejected: "mute" };
/** Stages where the next move is your team's. */
export const TEAM_STAGES = ["Requested", "Received", "Inspected"];
export const REASONS = ["Changed mind · unopened, within 14 days", "Manufacturing defect", "Wrong item sent", "Damaged on arrival", "Order cancelled", "Goodwill · refund as a gesture"];
const VIA = ["Phone call", "WhatsApp", "Email", "At the office", "Website form"];

/** Only the owner pays refunds out; everyone else sends them for approval. */
export const canPayRefunds = (role?: string | null) => role === "Owner";

/* ---------- local store ---------- */
export type ReturnEdit = { status?: string; kind?: string; awb?: string | null; inspect?: string; refund?: RefundRecord; refundAsked?: boolean; events?: OrderEvent[] };
let edits: Record<string, ReturnEdit> = {};
let created: ReturnRow[] = [];
const listeners = new Set<() => void>();
const sub = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const emit = () => listeners.forEach((l) => l());
const EMPTY: Record<string, ReturnEdit> = {};
const NONE: ReturnRow[] = [];
export const useReturnEdits = () => useSyncExternalStore(sub, () => edits, () => EMPTY);
export const useCreatedReturns = () => useSyncExternalStore(sub, () => created, () => NONE);
export function editReturn(id: string, e: Omit<ReturnEdit, "events">, event?: OrderEvent) {
  const cur = edits[id] ?? {};
  const events = event ? [...(cur.events ?? []), event] : cur.events;
  edits = { ...edits, [id]: { ...cur, ...e, ...(events && { events }) } };
  emit();
}
export function addReturn(r: ReturnRow) { created = [r, ...created]; emit(); }

/** Layers local edits over a return from the API. */
export function applyReturnEdit(r: ReturnRow, e?: ReturnEdit): ReturnRow & { refundAsked: boolean } {
  if (!e) return { ...r, refundAsked: false };
  return {
    ...r,
    status: e.status ? { label: e.status, tone: TONE[e.status] ?? "mute" } : r.status,
    kind: e.kind ?? r.kind,
    awb: e.awb !== undefined ? e.awb : r.awb,
    inspect: e.inspect ?? r.inspect,
    refund: e.refund ?? r.refund,
    refundAsked: !!e.refundAsked,
    log: [...r.log, ...(e.events ?? [])],
  };
}
export type LiveReturn = ReturnType<typeof applyReturnEdit>;
export function useReturns(rows: ReturnRow[]): LiveReturn[] {
  const e = useReturnEdits();
  const c = useCreatedReturns();
  return useMemo(() => [...c, ...rows].map((r) => applyReturnEdit(r, e[r.id])), [c, rows, e]);
}

/* ---------- rules ---------- */
/** Stage a return can be handled from together with others — or null. */
export const returnKey = (r: LiveReturn) => (["Requested", "Approved", "Received", "Inspected"].includes(r.status.label) && !r.refundAsked ? r.status.label : null);
export function nextReturnLabel(r: LiveReturn, owner: boolean) {
  const s = r.status.label;
  if (s === "Requested") return "Approve";
  if (s === "Approved") return "Mark received";
  if (s === "Received") return "Receive & inspect";
  if (s === "Inspected") return r.refundAsked ? "" : owner ? "Issue refund" : "Ask for refund";
  return "";
}
export const STAGE_HINT: Record<string, string> = {
  Requested: "Customer asked · approve or reject", Approved: "Bosta bringing it back", Received: "At the office · inspect it",
  Inspected: "Checked · refund is next", Refunded: "Money returned · closed", Rejected: "Not accepted · closed",
};

/* ---------- returns policy ---------- */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const parseDay = (s?: string | null) => { const m = s?.match(/(\d{1,2}) (\w{3})\w* (\d{4})/); return m ? new Date(+m[3]!, MONTHS.indexOf(m[2]!), +m[1]!) : null; };
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
export interface PolicyVerdict { v: "ok" | "bad" | "warn"; t: string; p: string; rule: string }
type PolicyLine = { name: string; category?: string | undefined };

/** Same rules as the policy card on the Returns page. */
export function checkPolicy(daysSince: number, lines: PolicyLine[], why: string): PolicyVerdict | null {
  const n = daysSince;
  if (!lines.length) return null;
  if (why.startsWith("Goodwill")) return { v: "warn", t: "Goodwill · outside the normal rules", p: "Only the owner can approve it.", rule: "Goodwill · owner decision" };
  if (why.startsWith("Order cancelled")) return { v: "ok", t: "Within policy", p: "Cancelled order · full refund.", rule: "Order cancelled" };
  if (/defect|Damaged|Wrong/.test(why)) return n <= 30
    ? { v: "ok", t: "Within policy", p: `Delivered ${plural(n, "day")} ago · defects and our mistakes are accepted within 30 days.`, rule: `${why.startsWith("Manufacturing") ? "Manufacturing defect" : "Our error"} · within 30 days` }
    : { v: "bad", t: "Outside policy", p: `Delivered ${plural(n, "day")} ago · defects are accepted within 30 days.`, rule: "Outside the 30-day window" };
  const wj = lines.find((l) => l.category === "watches" || l.category === "jewellery");
  if (wj) return { v: "bad", t: "Outside policy", p: `${wj.name} · watches and fine jewellery are returned for manufacturing defects only.`, rule: "Watches & jewellery · defects only" };
  if (n > 14) return { v: "bad", t: "Outside policy", p: `Delivered ${plural(n, "day")} ago · change of mind is accepted within 14 days.`, rule: "Outside the 14-day window" };
  const fb = lines.some((l) => l.category === "fragrance" || l.category === "beauty");
  return { v: "ok", t: "Within policy", p: `Delivered ${plural(n, "day")} ago · ${plural(14 - n, "day")} left.${fb ? " Fragrance and beauty must come back unopened and sealed." : " Must be unused, with all packaging."}`, rule: `Changed mind · within 14 days${fb ? " · unopened" : ""}` };
}
export const daysBetween = (from: Date, to: Date) => Math.max(0, Math.round((to.getTime() - from.getTime()) / 864e5));

/* ---------- small dialog pieces ---------- */
const Title = ({ children }: { children: ReactNode }) => <DialogHeader><DialogTitle className="font-head text-[18px] font-normal">{children}</DialogTitle></DialogHeader>;
const sel = "h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px]";
const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">{label}{children}{hint && <span className="text-[11.5px]">{hint}</span>}</label>
);
const Ok = ({ disabled, onClick, children, danger }: { disabled?: boolean; onClick: () => void; children: ReactNode; danger?: boolean }) => (
  <button type="button" disabled={disabled} onClick={onClick}
    className={cn("rounded-lg border px-4 py-2 text-[13px] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35", danger ? "border-bad bg-bad text-white" : "border-primary bg-primary text-primary-foreground")}>
    {children}
  </button>
);
function Checks({ items, ticks, setTicks }: { items: { label: string; hint?: string }[]; ticks: boolean[]; setTicks: (t: boolean[]) => void }) {
  const open = ticks.filter((t) => !t).length;
  return (
    <>
      <div className="flex flex-col gap-1">
        {items.map((it, i) => (
          <label key={it.label} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13px]", ticks[i] ? "border-primary bg-hover" : "border-border")}>
            <input type="checkbox" className="mt-0.5 size-4 accent-[#0a0a0a]" checked={!!ticks[i]} onChange={() => setTicks(ticks.map((v, j) => (j === i ? !v : v)))} />
            <div>{it.label}{it.hint && <span className="block text-[11.5px] text-muted-foreground">{it.hint}</span>}</div>
          </label>
        ))}
      </div>
      <p className={cn("text-[12.5px]", open ? "text-muted-foreground" : "text-good")}>{open ? `${open} step${open > 1 ? "s" : ""} still to tick` : "All done — ready to move on"}</p>
    </>
  );
}

type Kind = "approve" | "reject" | "receive" | "inspect" | "refund" | "bulk";
let refSeq = 40219;

/**
 * Step actions for one or more returns.
 * `run(r)` opens the next step, `run(r, "reject")` rejects, `bulk(list)` handles a same-stage selection.
 */
export function useReturnActions() {
  const user = useSessionUser();
  const who = user?.name ?? "You";
  const owner = canPayRefunds(user?.role);
  const [step, setStep] = useState<{ list: LiveReturn[]; kind: Kind } | null>(null);
  const [ticks, setTicks] = useState<boolean[]>([]);
  const [why, setWhy] = useState("");
  const [how, setHow] = useState("Bosta collects from the customer");
  const [result, setResult] = useState("Perfect — back in stock");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const ev = (text: string, by = who): OrderEvent => ({ text, when: "Just now", who: by });

  const open = (list: LiveReturn[], kind: Kind) => {
    const r = list[0]!;
    setErr(""); setNote("");
    if (kind === "approve") { setWhy(REASONS.includes(r.kind) ? r.kind : REASONS[0]!); setHow("Bosta collects from the customer"); }
    if (kind === "reject") setWhy("Opened fragrance is not returnable");
    if (kind === "receive") setTicks([false]);
    if (kind === "inspect") { setTicks([false, false, false]); setResult("Perfect — back in stock"); }
    if (kind === "refund") { setAmount(formatNumber(r.amount)); setMethod(r.payment.startsWith("Paymob") ? `${r.payment} (original)` : "Bank transfer to customer"); setRef(`PMB-RF-${refSeq}`); }
    setStep({ list, kind });
  };
  const run = (r: LiveReturn, forced?: "reject") => {
    const s = r.status.label;
    if (forced) return open([r], "reject");
    open([r], s === "Requested" ? "approve" : s === "Approved" ? "receive" : s === "Received" ? "inspect" : "refund");
  };
  const bulk = (list: LiveReturn[]) => open(list, list[0]!.status.label === "Inspected" ? "refund" : "bulk");

  /* --- what each step does --- */
  const approve = (r: LiveReturn, reason: string, route: string) => {
    if (route.startsWith("Nothing")) { editReturn(r.id, { status: "Received", kind: reason }, ev(`Approved · ${reason} · nothing to collect`)); return; }
    editReturn(r.id, { status: "Approved", kind: reason }, ev(`Approved · ${reason}`));
    if (route.startsWith("Bosta")) { const awb = `BST-8823${Math.floor(1000 + Math.random() * 8999)}`; editReturn(r.id, { awb }, ev(`Return pickup booked · AWB ${awb}`, "Bosta")); }
    else editReturn(r.id, {}, ev("Customer will drop it at the office"));
  };
  const inspect = (r: LiveReturn, res: string) => {
    if (res.startsWith("Damaged")) { editReturn(r.id, { status: "Rejected", inspect: res }, ev("Inspected · damaged by customer · refund not accepted")); editOrder(r.order, { status: "Delivered" }); return; }
    editReturn(r.id, { status: "Inspected", inspect: res }, ev(`Inspected · ${res.startsWith("Perfect") ? "perfect · back in stock" : "defect confirmed · set aside for the maison"}`));
  };
  const refund = (r: LiveReturn, rec?: Partial<RefundRecord>) => {
    if (!owner) { editReturn(r.id, { refundAsked: true }, ev(`Refund of ${formatMoney(r.amount)} sent to Ramy for approval${note ? ` · ${note}` : ""}`)); return; }
    const rf: RefundRecord = {
      ref: rec?.ref ?? `PMB-RF-${refSeq++}`, method: rec?.method ?? (r.payment.startsWith("Paymob") ? `${r.payment} (original)` : "Bank transfer to customer"),
      amount: rec?.amount ?? r.amount, by: who, when: "Today, just now",
    };
    editReturn(r.id, { status: "Refunded", refund: rf }, ev(`Refund issued · ${formatMoney(rf.amount)} to ${rf.method} · ref ${rf.ref}`));
    editOrder(r.order, { status: "Returned", pay: "Refunded" }, { text: `Refunded · ${formatMoney(rf.amount)} · return ${r.id}`, when: "Just now", who });
  };

  const finish = () => {
    if (!step) return;
    const { list, kind } = step;
    const r = list[0]!;
    if (kind === "approve") { approve(r, why, how); toast(`${r.id} approved`); }
    else if (kind === "reject") { editReturn(r.id, { status: "Rejected" }, ev(`Rejected · ${why}`)); editOrder(r.order, { status: "Delivered" }); toast(`${r.id} rejected`); }
    else if (kind === "receive") { editReturn(r.id, { status: "Received" }, ev("Received at the office")); toast(`${r.id} received`); }
    else if (kind === "inspect") { inspect(r, result); toast(result.startsWith("Damaged") ? `${r.id} closed · no refund` : "Inspection done · refund is next"); }
    else if (kind === "refund") {
      if (list.length === 1 && owner) {
        const amt = Number(amount.replace(/[^\d]/g, ""));
        if (!amt) { setErr("Enter the amount."); return; }
        if (ref.trim().length < 4) { setErr("Enter the refund reference."); return; }
        refund(r, { amount: amt, method, ref: ref.trim() }); refSeq++;
      } else list.forEach((x) => refund(x));
      toast(owner ? (list.length === 1 ? "Refund issued" : `${list.length} refunds issued`) : "Sent to Ramy for approval");
    } else if (kind === "bulk") {
      const s = r.status.label;
      list.forEach((x) => {
        if (s === "Requested") approve(x, x.kind, "Bosta collects from the customer");
        else if (s === "Approved") editReturn(x.id, { status: "Received" }, ev("Received at the office"));
        else if (s === "Received") inspect(x, "Perfect — back in stock");
      });
      toast(`${list.length} returns updated`);
    }
    setStep(null);
  };

  const list = step?.list ?? [];
  const r = list[0];
  const p = r?.lines[0];
  const sealed = !!p && (p.category === "fragrance" || p.category === "beauty");
  const total = list.reduce((a, x) => a + x.amount, 0);
  const openTicks = ticks.filter((t) => !t).length;
  const footer = (ok: string, opts: { disabled?: boolean; danger?: boolean; left?: ReactNode } = {}) => (
    <DialogFooter className="items-center">
      {opts.left && <span className="mr-auto">{opts.left}</span>}
      <Button onClick={() => setStep(null)}>Cancel</Button>
      <Ok disabled={opts.disabled ?? false} danger={opts.danger ?? false} onClick={finish}>{ok}</Ok>
    </DialogFooter>
  );
  const Kv = ({ rows }: { rows: [string, string][] }) => (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">{rows.map(([k, v]) => <div key={k} className="contents"><dt className="font-medium">{k}</dt><dd className="text-right text-muted-foreground">{v}</dd></div>)}</dl>
  );

  const dialog = (
    <Dialog open={!!step} onOpenChange={(v) => !v && setStep(null)}>
      <DialogContent className="max-w-[540px]">
        {r && step?.kind === "approve" && (
          <>
            <Title>Approve {r.id}?</Title>
            <p className="text-[13.5px]">{r.customer} · {r.item} · {formatMoney(r.amount)}</p>
            <Field label="Reason for approval"><select value={why} onChange={(e) => setWhy(e.target.value)} className={sel}>{REASONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="How it comes back"><select value={how} onChange={(e) => setHow(e.target.value)} className={sel}>{["Bosta collects from the customer", "Customer drops it at the office", "Nothing to collect (order cancelled)"].map((x) => <option key={x}>{x}</option>)}</select></Field>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" defaultChecked className="accent-[#0a0a0a]" /> Email the customer the return instructions</label>
            <p className="text-[12px] text-muted-foreground">Recorded as approved by <b className="font-semibold text-foreground">{who}</b>.</p>
            {footer("Approve return", { left: <button type="button" onClick={() => open([r], "reject")} className="rounded-lg border border-border px-4 py-2 text-[13px] text-bad hover:bg-bad-bg">Reject…</button> })}
          </>
        )}
        {r && step?.kind === "reject" && (
          <>
            <Title>Reject {r.id}</Title>
            <Field label="Reason"><select value={why} onChange={(e) => setWhy(e.target.value)} className={sel}>{["Opened fragrance is not returnable", "Outside the 14-day window", "Engraved or personalised item", "No defect found"].map((x) => <option key={x}>{x}</option>)}</select></Field>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" defaultChecked className="accent-[#0a0a0a]" /> Email the customer the reason</label>
            <p className="text-[12px] text-muted-foreground">Recorded as rejected by <b className="font-semibold text-foreground">{who}</b>.</p>
            {footer("Reject return", { danger: true })}
          </>
        )}
        {r && step?.kind === "receive" && (
          <>
            <Title>Mark {r.id} received</Title>
            <p className="text-[13px] text-muted-foreground">Normally Bosta updates this by itself when the parcel reaches the office. Use this if it arrived by hand.</p>
            <Checks items={[{ label: "Parcel received at the office", hint: r.item }]} ticks={ticks} setTicks={setTicks} />
            {footer("Mark received", { disabled: openTicks > 0 })}
          </>
        )}
        {r && step?.kind === "inspect" && (
          <>
            <Title>Receive & inspect · {r.id}</Title>
            <p className="text-[13.5px]">Reason: <b className="font-semibold">{r.kind}</b> — {r.reason}</p>
            <Checks ticks={ticks} setTicks={setTicks} items={[
              { label: `${r.item} is the item we sent`, hint: `SKU ${p?.sku ?? ""} — must match the order` },
              { label: sealed ? "Cellophane seal checked" : "All parts and packaging checked", hint: sealed ? "Opened fragrance or beauty can only be refunded for a defect" : "Box, pouch, cards and tags" },
              { label: "Photos taken of the item as received" },
            ]} />
            <Field label="Result"><select value={result} onChange={(e) => setResult(e.target.value)} className={sel}>{["Perfect — back in stock", "Defect confirmed — set aside for the maison", "Damaged by customer — refund not accepted"].map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Inspector notes"><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you found" className={cn(sel, "h-auto py-2")} /></Field>
            {footer("Inspection done", { disabled: openTicks > 0 })}
          </>
        )}
        {r && step?.kind === "refund" && (
          <>
            <Title>{owner ? (list.length === 1 ? `Issue refund · ${r.id}` : `Issue ${list.length} refunds`) : (list.length === 1 ? `Ask for refund · ${r.id}` : `Ask for ${list.length} refunds`)}</Title>
            {owner && list.length === 1 ? (
              <>
                <div className="grid gap-3.5 md:grid-cols-2">
                  <Field label="Amount (EGP)"><input value={amount} onChange={(e) => setAmount(e.target.value)} className={sel} /></Field>
                  <Field label="Refund to"><select value={method} onChange={(e) => setMethod(e.target.value)} className={sel}>{[r.payment.startsWith("Paymob") ? `${r.payment} (original)` : "Bank transfer to customer", "Store credit", "Cash at the office"].map((x) => <option key={x}>{x}</option>)}</select></Field>
                </div>
                <Field label="Refund reference" hint="Filled from Paymob automatically. For cash or bank transfer, type the receipt or transfer number."><input value={ref} onChange={(e) => setRef(e.target.value)} className={sel} /></Field>
              </>
            ) : <Kv rows={list.map((x) => [x.id, `${x.customer} · ${formatMoney(x.amount)}`])} />}
            <Field label={owner ? "Note for the record" : "Reason for Ramy"}><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={owner ? "Optional" : "e.g. Returned unopened, checked and back in stock"} className={sel} /></Field>
            {owner
              ? <><label className="flex items-center gap-2 text-[13px]"><input type="checkbox" defaultChecked className="accent-[#0a0a0a]" /> Email the customer the refund confirmation</label>
                  <p className="text-[12px] text-muted-foreground">Recorded as refunded by <b className="font-semibold text-foreground">{who}</b> · total {formatMoney(total)}.</p></>
              : <p className="rounded-lg bg-warn-bg px-3.5 py-2.5 text-[12.5px]">Nothing is paid yet. Ramy gets it by email and WhatsApp and approves with his code. You'll see the answer in <b>Approvals</b>.</p>}
            {err && <p className="text-[12.5px] text-bad">{err}</p>}
            {footer(owner ? `Refund ${formatMoney(list.length === 1 ? Number(amount.replace(/[^\d]/g, "")) || 0 : total)}` : `Send ${formatMoney(total)} for approval`)}
          </>
        )}
        {r && step?.kind === "bulk" && (
          <>
            <Title>{{ Requested: `Approve ${list.length} returns`, Approved: `Mark ${list.length} received`, Received: `Mark ${list.length} inspected` }[r.status.label]}</Title>
            <p className="text-[13.5px]">{{ Requested: "Each is approved with its own reason and a Bosta pickup is booked.", Approved: "Use when the parcels reached the office by hand.", Received: "All items checked — perfect condition and back in stock. Inspect one by one if any has a problem." }[r.status.label]}</p>
            <Kv rows={list.map((x) => [x.id, `${x.item} · ${x.kind}`])} />
            <p className="text-[12px] text-muted-foreground">Recorded under <b className="font-semibold text-foreground">{who}</b>.</p>
            {footer("Confirm")}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
  return { run, bulk, dialog, who, owner };
}

/* ---------- Log a return ---------- */
const nextId = (all: { id: string }[]) => `RMA-${Math.max(0, ...all.map((r) => Number(r.id.slice(4)) || 0)) + 1}`;

/** For a customer who called, messaged or came to the office. Website requests arrive by themselves. */
export function LogReturnDialog({ open, onClose, orders, returns, asOf, initialOrder, onCreated }: {
  open: boolean; onClose: () => void; orders: OrderRow[]; returns: LiveReturn[]; asOf: string;
  initialOrder?: string | null; onCreated: (id: string) => void;
}) {
  const user = useSessionUser();
  const today = parseDay(asOf) ?? new Date();
  const [q, setQ] = useState("");
  const start = initialOrder ? orders.find((o) => o.id === initialOrder && o.status.label === "Delivered") : undefined;
  const [orderId, setOrderId] = useState<string | null>(start?.id ?? null);
  const [sel2, setSel2] = useState<Record<string, number>>(start && start.lines.length === 1 ? { [start.lines[0]!.sku]: 1 } : {});
  const [why, setWhy] = useState(REASONS[0]!);
  const [words, setWords] = useState("");
  const [via, setVia] = useState("Phone call");
  const [photos, setPhotos] = useState(0);
  const [err, setErr] = useState("");

  const openRet = (id: string) => returns.find((r) => r.order === id && !["Refunded", "Rejected"].includes(r.status.label));
  const delivered = (o: OrderRow) => parseDay(o.deliveredOn) ?? today;
  const state = (o: OrderRow) => {
    const r = openRet(o.id);
    if (r) return { ok: false, t: `Return already open · ${r.id}` };
    if (o.status.label === "Delivered") { const n = daysBetween(delivered(o), today); return { ok: true, t: n ? `Delivered ${plural(n, "day")} ago` : "Delivered today" }; }
    if (["Returned", "Cancelled"].includes(o.status.label)) return { ok: false, t: o.status.label };
    return { ok: false, t: `Not delivered yet · ${o.status.label}` };
  };
  const matches = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return orders.filter((o) => o.status.label === "Delivered" && !openRet(o.id)).sort((a, b) => delivered(b).getTime() - delivered(a).getTime());
    return orders.filter((o) => `${o.id} ${o.customer}`.toLowerCase().includes(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, orders, returns]);

  const pickOrder = (o: OrderRow) => {
    const st = state(o);
    if (!st.ok) { toast(`${o.id} can't be returned · ${st.t}`); return; }
    setOrderId(o.id); setSel2(o.lines.length === 1 ? { [o.lines[0]!.sku]: 1 } : {}); setErr("");
  };
  const order = orderId ? orders.find((o) => o.id === orderId) ?? null : null;
  const lines = order ? order.lines.filter((l) => sel2[l.sku]).map((l) => ({ ...l, qty: sel2[l.sku]! })) : [];
  const pol = order ? checkPolicy(daysBetween(delivered(order), today), lines, why) : null;
  const amount = lines.reduce((a, l) => a + l.price * l.qty, 0);

  const save = () => {
    if (!order) { setErr("Choose the order first."); return; }
    if (!lines.length || !pol) { setErr("Tick the item coming back."); return; }
    const all = [...returns];
    const id = nextId(all);
    const who = user?.name ?? "You";
    addReturn({
      id, order: order.id, customer: order.customer, item: lines[0]!.name, reason: words.trim() || why, rule: pol.rule, kind: why, amount,
      status: { label: "Requested", tone: "warn" }, date: asOf, lines, customerInfo: { id: "", name: order.customer, phone: "" },
      payment: order.payment, awb: null, via, photos, inspect: null, refund: null,
      log: [{ text: `Return logged · came in by ${via.toLowerCase()}${photos ? ` · ${plural(photos, "photo")}` : ""} · ${pol.t.toLowerCase()}`, when: "Just now", who }],
    });
    editOrder(order.id, { status: "Return open" }, { text: `Return ${id} logged · ${lines.map((l) => l.name).join(", ")}`, when: "Just now", who });
    toast(`${id} logged · approve or reject is next`);
    onClose(); onCreated(id);
  };

  const sec = "mb-2 mt-[18px] text-[10.5px] uppercase tracking-[.2em] text-muted-foreground first:mt-0";
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-[760px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-head text-[18px] font-normal">Log a return</DialogTitle>
          <p className="text-[12.5px] text-muted-foreground">For a customer who called, messaged or came to the office. Website return requests arrive here by themselves.</p>
        </DialogHeader>
        <div>
          <div className={sec}>1 · Which order?</div>
          {!order ? (
            <>
              <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Order number or customer name" className={cn(sel, "mb-2")} />
              <div className="mb-2 text-[12px] text-muted-foreground">{q ? "Results" : "Recent delivered orders — or search above"}</div>
              <div className="max-h-[250px] overflow-auto rounded-lg border border-border">
                {matches.length ? matches.map((o) => { const st = state(o); return (
                  <button key={o.id} type="button" onClick={() => pickOrder(o)} className={cn("grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-b border-line-soft px-3 py-2.5 text-left text-[13px] last:border-0", st.ok ? "hover:bg-hover" : "cursor-not-allowed")}>
                    <b className={cn("font-medium", !st.ok && "opacity-55")}>{o.id} · {o.customer}</b>
                    <span className={cn("text-right text-[12px]", st.ok ? "text-muted-foreground" : "text-bad")}>{st.t}</span>
                    <span className={cn("text-[12px] text-muted-foreground", !st.ok && "opacity-55")}>{o.lines.map((l) => `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ""}`).join(", ")}</span>
                    <span className="text-right text-[12px] text-muted-foreground">{formatMoney(o.total)}</span>
                  </button>); })
                  : <p className="p-4 text-[13px] text-muted-foreground">No order matches “{q}”. Check the order number, or search by the customer's name.</p>}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-primary px-3.5 py-2.5 text-[13px]">
                <div><b className="font-medium">{order.id} · {order.customer}</b><span className="block text-[12px] text-muted-foreground">Delivered {order.deliveredOn ?? "—"} · {order.payment}</span></div>
                {!start && <button type="button" onClick={() => { setOrderId(null); setSel2({}); }} className="text-[12.5px] underline">Change order</button>}
              </div>

              <div className={sec}>2 · What is coming back?</div>
              {order.lines.map((l) => { const on = !!sel2[l.sku]; return (
                <div key={l.sku} className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3 border-b border-line-soft py-2.5 text-[13px]">
                  <input type="checkbox" className="size-4 accent-[#0a0a0a]" checked={on} onChange={() => setSel2((s) => { const n = { ...s }; if (n[l.sku]) delete n[l.sku]; else n[l.sku] = 1; return n; })} />
                  <Thumb color="#ddd" />
                  <div><b className="font-medium">{l.name}</b><span className="block text-[12px] text-muted-foreground">{l.sku} · ordered {l.qty}</span></div>
                  {l.qty > 1 ? (
                    <div className="flex items-center gap-1.5">
                      <button type="button" disabled={!on} onClick={() => setSel2((s) => ({ ...s, [l.sku]: Math.max(1, (s[l.sku] ?? 1) - 1) }))} className="size-[26px] rounded-md border border-border disabled:opacity-40">−</button>
                      <em className="not-italic">{on ? sel2[l.sku] : 0}</em>
                      <button type="button" disabled={!on} onClick={() => setSel2((s) => ({ ...s, [l.sku]: Math.min(l.qty, (s[l.sku] ?? 1) + 1) }))} className="size-[26px] rounded-md border border-border disabled:opacity-40">+</button>
                    </div>
                  ) : <span />}
                  <b className="font-medium">{formatMoney(l.price)}</b>
                </div>); })}

              <div className={sec}>3 · Why?</div>
              <div className="grid gap-3.5 md:grid-cols-2">
                <Field label="Reason"><select value={why} onChange={(e) => setWhy(e.target.value)} className={sel}>{REASONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Customer's own words"><input value={words} onChange={(e) => setWords(e.target.value)} placeholder="e.g. The clasp does not close" className={sel} /></Field>
              </div>
              <div className="mt-3.5 text-[12px] text-muted-foreground">How did the request reach us?</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {VIA.map((v) => <button key={v} type="button" onClick={() => setVia(v)} className={cn("h-[34px] rounded-full border px-3.5 text-[12.5px]", via === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface")}>{v}</button>)}
              </div>
              <div className="mt-3.5 flex items-center gap-3 text-[12px] text-muted-foreground">
                Photos from the customer (optional)
                <label className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[12.5px] text-foreground hover:bg-hover">
                  + Add photos<input type="file" accept="image/*" multiple hidden onChange={(e) => setPhotos(Math.min(6, photos + (e.target.files?.length ?? 0)))} />
                </label>
                {photos > 0 && <span>{plural(photos, "photo")} added</span>}
              </div>

              <div className={cn("mt-4 flex items-center justify-between gap-4 rounded-[10px] border px-4 py-3.5", pol ? { ok: "border-good bg-good-bg", bad: "border-bad bg-bad-bg", warn: "border-warn bg-warn-bg" }[pol.v] : "border-border")}>
                <div>
                  <small className="mb-1 block text-[10.5px] uppercase tracking-[.2em] text-muted-foreground">Policy check</small>
                  {pol ? <><b className={cn("text-[15px] font-medium", { ok: "text-good", bad: "text-bad", warn: "text-warn" }[pol.v])}>{pol.t}</b><p className="mt-0.5 text-[12.5px]">{pol.p}</p></> : <p className="text-[12.5px]">Tick the item or items coming back.</p>}
                </div>
                {pol && <div className="whitespace-nowrap text-right"><small className="block text-[10.5px] uppercase tracking-[.2em] text-muted-foreground">Refund if approved</small><b className="font-head text-[22px] font-normal">{formatMoney(amount)}</b></div>}
              </div>
            </>
          )}
        </div>
        <DialogFooter className="items-center">
          {err && <span className="mr-auto text-[12.5px] text-bad">{err}</span>}
          <Button onClick={onClose}>Cancel</Button>
          <Ok disabled={!order || !lines.length} onClick={save}>{pol?.v === "bad" ? "Log return · outside policy" : "Log return"}</Ok>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
