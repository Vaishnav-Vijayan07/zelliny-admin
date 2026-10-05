import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { orderQuery, returnsQuery } from "@/lib/api/sections.functions";
import { useReturns } from "@/components/admin/ReturnFlow";
import type { OrderDetail, OrderEvent } from "@/lib/api/section-types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Chip, Panel, StatusBadge } from "@/components/admin/primitives";
import { Button, PageHeader } from "@/components/admin/page";
import { applyEdit, isAppt, isCOD, isTeamStage, nextLabel, prevStage, useCreatedOrders, useOrderActions, useOrderEdits } from "@/components/admin/OrderFlow";
import { soon } from "@/hooks/use-toast-lite";

const STAGE_TEXT: Record<string, string> = {
  Pending: "New — check payment and stock, then start preparing",
  Processing: "Your team is picking, checking and gift-wrapping",
  "Ready to ship": "Packed and waiting to leave",
  Shipped: "With the courier · updates come in from Bosta automatically",
};

function Kv({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
      {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>)}
    </dl>
  );
}

const Own = ({ kind, children }: { kind: "team" | "courier" | "closed"; children: ReactNode }) => (
  <span className={cn("rounded-full px-2.5 py-0.5 text-[10.5px] normal-case tracking-[.08em]", kind === "team" ? "bg-primary text-primary-foreground" : kind === "courier" ? "bg-info-bg text-info" : "bg-hover text-muted-foreground")}>{children}</span>
);

/** The "what happens next" card at the top of the order. */
function NextCard({ o, onNext, onBack, returnId }: { o: OrderDetail; onNext: () => void; onBack: () => void; returnId: string | null }) {
  const s = o.status.label;
  const wrap = (border: boolean, label: ReactNode, title: string, text: ReactNode, acts?: ReactNode) => (
    <div className={cn("mb-5 grid items-center gap-5 rounded-[10px] border bg-surface px-6 py-5 md:grid-cols-[1fr_auto]", border ? "border-primary" : "border-border")}>
      <div>
        <small className="mb-2 flex items-center gap-2 text-[10.5px] uppercase tracking-[.2em] text-muted-foreground">{label}</small>
        <h2 className="mb-1 font-head text-[24px] font-normal">{title}</h2>
        <div className="text-[13.5px] text-muted-foreground">{text}</div>
      </div>
      {acts && <div className="flex min-w-[240px] flex-col items-stretch gap-2">{acts}</div>}
    </div>
  );
  if (s === "Cancelled" || s === "Returned") return wrap(false, <>Status <Own kind="closed">Closed</Own></>, s,
    s === "Cancelled" ? `This order was cancelled. Stock was released${o.payStatus.label === "Refunded" ? " and the customer refunded." : "."}` : "This order was returned and refunded — see Returns & refunds.",
    s === "Returned" && returnId ? <Link to="/returns/$returnId" params={{ returnId }} className="rounded-lg border border-border px-4 py-2 text-center text-[13px] hover:bg-hover">Open {returnId} →</Link> : undefined);
  if (s === "Return open") return wrap(false, <>Status <Own kind="closed">Return in progress</Own></>, "Return open",
    "This order has a return in progress. It is handled on the Returns & refunds page.",
    returnId ? <Link to="/returns/$returnId" params={{ returnId }} className="rounded-lg border border-primary bg-primary px-4 py-2 text-center text-[13px] text-primary-foreground hover:opacity-90">Open {returnId} →</Link> : undefined);
  if (s === "Delivered") return wrap(false, <>Status <Own kind="closed">Complete</Own></>, "Delivered",
    isCOD(o) ? `Cash collected by ${isAppt(o) ? "our team" : "Bosta"} — shows in Payments once transferred.` : "Nothing left to do. The customer can request a return within 14 days.",
    <><Link to="/returns" search={{ log: o.id }} className="rounded-lg border border-border px-4 py-2 text-center text-[13px] hover:bg-hover">Log a return</Link><Button onClick={soon("Print invoice")}>Print invoice</Button></>);
  if (s === "Shipped" && !isAppt(o)) return wrap(false, <>Now with <Own kind="courier">Courier · Bosta</Own></>, "Shipped",
    <>{STAGE_TEXT["Shipped"]} · AWB <b className="font-semibold text-foreground">{o.awb ?? "—"}</b>. Your team's part is done.</>,
    <Button onClick={soon("Bosta tracking")}>Track on Bosta</Button>);
  const nb = nextLabel(o);
  return wrap(true, <>Next step <Own kind="team">{s === "Shipped" ? "Your team · in person" : "Your team"}</Own></>,
    s === "Shipped" ? "Out for delivery" : s === "Ready to ship" && o.fulfilment === "Pickup" ? "Ready for collection" : s,
    <>
      {s === "Shipped" ? "Our team is on the way to the customer." : s === "Ready to ship" && o.fulfilment === "Pickup" ? "Packed · tell the customer it is ready at the office" : STAGE_TEXT[s]}
      {s === "Ready to ship" && o.awb && <p className="mt-1.5">Pickup booked · AWB <b className="font-semibold text-foreground">{o.awb}</b> · waiting for Bosta to collect. It moves to Shipped by itself when Bosta scans the parcel.</p>}
      {o.appointment && <p className="mt-1.5">Appointment: <b className="font-semibold text-foreground">{o.appointment}</b></p>}
    </>,
    <>
      {nb && <button type="button" onClick={onNext} className="h-[46px] rounded-lg border border-primary bg-primary px-4 text-[13px] text-primary-foreground hover:opacity-90">{nb} →</button>}
      {prevStage(o) && <button type="button" onClick={onBack} className="text-center text-[12px] text-muted-foreground underline underline-offset-[3px]">Move back a step</button>}
    </>);
}

/** Two-part progress: what your team does, then what the courier (or our own delivery) does. */
function Flow({ o }: { o: OrderDetail }) {
  const idx = ["Pending", "Processing", "Ready to ship", "Shipped", "Delivered"].indexOf(["Return open", "Returned"].includes(o.status.label) ? "Delivered" : o.status.label);
  const at = (prefix: string) => o.history.filter((h) => h.text.startsWith(prefix)).pop()?.when ?? "";
  const step = (label: string, i: number, when: string) => (
    <div key={label} className={cn("relative flex flex-1 flex-col gap-1.5 text-[12.5px] text-muted-foreground after:absolute after:left-3.5 after:right-0 after:top-1.5 after:h-0.5 after:bg-border last:after:hidden", idx > i && "text-foreground after:bg-primary", idx === i && "font-medium text-foreground")}>
      <i className={cn("z-[1] size-3.5 rounded-full border-2 border-line2 bg-surface", idx > i && "border-primary bg-primary", idx === i && "border-primary shadow-[0_0_0_4px_rgba(0,0,0,.08)]")} />
      <span>{label}</span>
      <span className="text-[11px] font-normal text-muted-foreground">{idx >= i ? when : ""}</span>
    </div>
  );
  const closed = o.status.label === "Cancelled";
  const last = o.history[o.history.length - 1];
  return (
    <div className="mb-5 overflow-hidden rounded-[10px] border border-border bg-surface md:grid md:grid-cols-[3fr_2fr]">
      <div className="px-5 pb-[18px] pt-3.5">
        <h5 className="mb-3.5 text-[10.5px] font-normal uppercase tracking-[.2em] text-muted-foreground">Your team</h5>
        <div className="flex">{step("New order", 0, at("Order placed"))}{step("Preparing", 1, at("Confirmed"))}{step("Ready to ship", 2, at("Packing"))}</div>
      </div>
      <div className="border-t border-dashed border-line2 bg-hover px-5 pb-[18px] pt-3.5 md:border-l md:border-t-0">
        <h5 className="mb-3.5 text-[10.5px] font-normal uppercase tracking-[.2em] text-muted-foreground">
          {isAppt(o) ? "Delivery · our team in person" : o.fulfilment === "Pickup" ? "Collection · Zelliny office" : "Courier · Bosta"}
        </h5>
        <div className="flex">
          {o.fulfilment === "Pickup"
            ? step("Collected by customer", 4, at("Collected by customer"))
            : <>{step(isAppt(o) ? "Out for delivery" : "Shipped", 3, at(isAppt(o) ? "Out for delivery" : "Collected"))}{step("Delivered", 4, at("Delivered"))}</>}
        </div>
      </div>
      {closed && last && <div className="col-span-full border-t border-border bg-bad-bg px-5 py-3 text-[13px] text-bad">{o.status.label} — {last.text} · {last.who}</div>}
    </div>
  );
}

function History({ events, onNote }: { events: OrderEvent[]; onNote: (t: string) => void }) {
  const [note, setNote] = useState("");
  const add = () => { if (!note.trim()) return; onNote(note.trim()); setNote(""); };
  return (
    <>
      <ol className="flex flex-col">
        {events.slice().reverse().map((t, i) => (
          <li key={`${t.text}-${i}`} className="flex gap-3 py-2">
            <i className={cn("mt-[5px] size-[9px] flex-none rounded-full", t.who === "Bosta" ? "bg-info" : "bg-primary")} />
            <div>
              <b className="block text-[13px] font-normal">{t.text}</b>
              <span className="text-[12px] text-muted-foreground">{t.when}<small className="ml-1.5 rounded-full bg-hover px-[7px] py-px text-[10.5px]">{t.who}</small></span>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add an internal note (not visible to customer)…"
          className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-[13px] outline-none focus:border-primary" />
        <Button onClick={add}>Add</Button>
      </div>
    </>
  );
}

export default function OrderDetailPage({ orderId }: { orderId: string }) {
  const { data: fromApi } = useSuspenseQuery(orderQuery(orderId));
  const { data: returnsData } = useSuspenseQuery(returnsQuery());
  const returns = useReturns(returnsData.rows);
  const data = useCreatedOrders().find((x) => x.id === orderId) ?? fromApi;
  const edits = useOrderEdits();
  const actions = useOrderActions();
  const [notes, setNotes] = useState<OrderEvent[]>([]);

  if (!data) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-[28px]">Order not found</h1>
        <p className="mt-2 text-muted-foreground">There is no order {orderId}. <Link to="/$section" params={{ section: "orders" }} className="underline">Back to Orders</Link></p>
      </div>
    );
  }
  const e = edits[data.id];
  const o: OrderDetail = { ...applyEdit(data, e), history: [...data.history, ...(e?.events ?? []), ...notes] };
  const c = o.customerInfo;
  const team = isTeamStage(o);
  const bosta = o.history.filter((h) => h.who === "Bosta");

  return (
    <>
      <div className="mb-2 text-[12px] text-muted-foreground">
        <Link to="/$section" params={{ section: "orders" }} className="underline underline-offset-[3px]">Orders</Link> / {o.id}
      </div>
      <PageHeader
        title={`Order ${o.id}`}
        subtitle={<span className="flex flex-wrap items-center gap-2">{o.manual && <Chip>Manual order</Chip>}{o.date} · <StatusBadge tone={o.status.tone}>{o.status.label}</StatusBadge> <StatusBadge tone={o.payStatus.tone}>{o.payStatus.label}</StatusBadge></span>}
        actions={<>
          <Button onClick={soon("Print invoice")}>Print invoice</Button>
          <Button onClick={() => toast("Confirmation email re-sent")}>Resend confirmation</Button>
          {team && <Button onClick={() => actions.run(o, "cancel")}>Cancel order</Button>}
        </>}
      />

      <NextCard o={o} returnId={returns.filter((x) => x.order === o.id).pop()?.id ?? null} onNext={() => actions.run(o)} onBack={() => actions.run(o, "back")} />
      <Flow o={o} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Items">
            {o.lines.map((l) => (
              <div key={l.sku || l.name} className="flex items-center gap-3.5 border-b border-line-soft py-3 text-[13px] last:border-0">
                <div className="grow"><b className="font-medium">{l.name}</b><div className="text-[12px] text-muted-foreground">{l.sku}</div></div>
                <div>× {l.qty}</div>
                <div className="w-28 text-right"><b className="font-medium">{formatMoney(l.price * l.qty)}</b></div>
              </div>
            ))}
            <div className="mt-3.5 border-t border-border pt-3.5">
              <Kv rows={[
                ["Subtotal", formatMoney(o.subtotal)],
                ["Discount", o.discount ? `− ${formatMoney(o.discount)}` : "—"],
                ["Gift wrapping", "Complimentary ribbon"],
                ["Delivery", o.delivery ? formatMoney(o.delivery) : "Free"],
                [/* label */ "Total", <b key="t" className="font-semibold">{formatMoney(o.total)}</b>],
              ]} />
            </div>
          </Panel>
          <Panel title="History · who did what">
            <History events={o.history} onNote={(t) => { setNotes((n) => [...n, { text: `Note: ${t}`, when: "Just now", who: actions.who }]); toast("Note added to history"); }} />
          </Panel>
          <Panel title="Payment">
            <Kv rows={[
              ["Method", o.payment],
              ["Status", <StatusBadge key="s" tone={o.payStatus.tone}>{o.payStatus.label}</StatusBadge>],
              ["Transaction ID", o.transactionId ?? "—"],
              ["Captured", isCOD(o) ? "On delivery" : o.payStatus.label === "Paid" ? o.date : "—"],
            ]} />
            {o.payStatus.label === "Paid" && !team && <div className="mt-3.5"><Button onClick={soon("Refund · sent for approval")}>Refund</Button></div>}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Customer">
            <Link to="/customers/$customerId" params={{ customerId: c.id }} className="mb-3 flex items-center gap-3 hover:underline">
              <span className="grid size-[34px] place-items-center rounded-full bg-hover text-[12px] font-semibold">{c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
              <div><b className="font-medium">{c.name}</b><span className="block text-[12px] text-muted-foreground">{c.orders} orders · {formatMoney(c.spent)}</span></div>
            </Link>
            <Kv rows={[["Email", c.email], ["Phone", c.phone]]} />
          </Panel>
          <Panel title="Delivery">
            <Kv rows={[
              ["Method", isAppt(o) ? "By appointment · our team" : o.fulfilment === "Pickup" ? "Collect from Zelliny office" : "Courier"],
              ["Zone", o.fulfilment === "Pickup" ? "—" : o.zone],
              ["Address", o.fulfilment === "Pickup" ? "12 Dr. Zakaria El Bardisi St., El Nozha El Gedida" : o.address],
              ["Appointment", isAppt(o) ? o.appointment ?? "Not booked yet" : "—"],
            ]} />
          </Panel>
          {o.fulfilment === "Courier" && (
            <Panel title="Courier · Bosta">
              {o.awb ? (
                <>
                  <div className="mb-3">
                    <div className="text-[11px] uppercase tracking-[.14em] text-muted-foreground">Airway bill (AWB)</div>
                    <span className="font-head text-[20px]">{o.awb}</span>
                    <span className="ml-1.5 rounded-full bg-info-bg px-2 py-0.5 text-[10.5px] text-info">From Bosta · automatic</span>
                  </div>
                  <Kv rows={[
                    ["Tracking link", <button key="l" type="button" onClick={soon("Bosta tracking")} className="underline">bosta.co/track/{o.awb.replace("BST-", "")}</button>],
                    ["Cash to collect", isCOD(o) ? formatMoney(o.total) : "None — prepaid"],
                  ]} />
                  <div className="mt-2.5 border-t border-line-soft pt-2.5">
                    {bosta.length ? bosta.slice().reverse().map((x, i) => (
                      <div key={i} className="flex gap-2.5 py-1 text-[12.5px]"><i className="mt-1.5 size-[7px] flex-none rounded-full bg-info" />{x.text}<span className="ml-auto whitespace-nowrap text-[11.5px] text-muted-foreground">{x.when}</span></div>
                    )) : <div className="text-[12.5px] text-muted-foreground">No updates from Bosta yet.</div>}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-line2 p-3.5 text-center text-[13px] text-muted-foreground">No tracking number yet.<br />It arrives from Bosta when the pickup is booked.</div>
              )}
              <p className="mt-2.5 text-[12px] text-muted-foreground">Filled in automatically by the Bosta connection.</p>
            </Panel>
          )}
          <Panel title="Gift options">
            <Kv rows={[["Gift wrap", o.gift.wrap], ["Gift message", `"${o.gift.message}"`], ["Hide prices on invoice", o.gift.hidePrices ? "Yes" : "No"]]} />
          </Panel>
        </div>
      </div>

      {actions.dialog}
    </>
  );
}
