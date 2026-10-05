import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { customersQuery, ordersQuery, returnsQuery } from "@/lib/api/sections.functions";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar, Panel, StatusBadge } from "@/components/admin/primitives";
import { Button, DataTable, PageHeader } from "@/components/admin/page";
import { editCustomer, useCustomerActions, useCustomers } from "@/components/admin/CustomerFlow";
import { applyEdit, useCreatedOrders, useOrderEdits } from "@/components/admin/OrderFlow";
import { useReturns } from "@/components/admin/ReturnFlow";

function Kv({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
      {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>)}
    </dl>
  );
}

export default function CustomerDetailPage({ customerId }: { customerId: string }) {
  const { data } = useSuspenseQuery(customersQuery());
  const { data: ordersData } = useSuspenseQuery(ordersQuery());
  const { data: returnsData } = useSuspenseQuery(returnsQuery());
  const navigate = useNavigate();
  const all = useCustomers(data.rows);
  const created = useCreatedOrders();
  const oEdits = useOrderEdits();
  const returns = useReturns(returnsData.rows);
  const act = useCustomerActions(all, (id) => navigate({ to: "/customers/$customerId", params: { customerId: id } }));
  const c = all.find((x) => x.id === customerId);
  const [notes, setNotes] = useState(c?.notes ?? "");

  if (!c) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-[28px]">Customer not found</h1>
        <p className="mt-2 text-muted-foreground">There is no customer {customerId}. <Link to="/$section" params={{ section: "customers" }} className="underline">Back to Customers</Link></p>
      </div>
    );
  }
  const orders = [...created, ...ordersData.rows].filter((o) => o.customer === c.name).map((o) => applyEdit(o, oEdits[o.id]));
  const rets = returns.filter((r) => r.customer === c.name);
  const newOrder = () => navigate({ to: "/orders/new", search: { customer: c.id } });
  const yes = (on: boolean, l: string) => <span key={l} className={cn("block", on ? "text-good" : "text-bad")}>{on ? "✓" : "✕"} {l}</span>;

  return (
    <>
      <div className="mb-2 text-[12px] text-muted-foreground">
        <Link to="/$section" params={{ section: "customers" }} className="underline underline-offset-[3px]">Customers</Link> / {c.name}
      </div>
      <PageHeader
        title={c.name}
        subtitle={`Customer since ${c.since} · ${c.city}${c.source ? ` · came to us by ${c.source.toLowerCase()}` : ""}`}
        actions={<>
          <Button onClick={() => act.email([c])}>Send email</Button>
          <Button onClick={() => act.message([c])}>WhatsApp / SMS</Button>
          <Button onClick={() => act.form(c)}>Edit</Button>
          <Button primary onClick={newOrder}>+ New order</Button>
        </>}
      />
      {c.isNew && !orders.length && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary bg-surface px-4 py-3 text-[13px]">
          <span><b className="font-semibold">New customer saved.</b> Next: create their first order, or send them a welcome message.</span>
          <Button primary onClick={newOrder}>Create first order</Button>
        </div>
      )}
      <div className="mb-5 grid grid-cols-2 gap-[18px] md:grid-cols-4">
        {([["Total spent", formatMoney(c.spent)], ["Orders", c.orders], ["Average order", c.orders ? formatMoney(Math.round(c.spent / c.orders)) : "—"], ["Returns", rets.length]] as [string, ReactNode][]).map(([k, v]) => (
          <div key={k} className="rounded-[10px] border border-border bg-surface px-[18px] py-3.5"><span className="block text-[12px] text-muted-foreground">{k}</span><b className="font-head text-[20px] font-medium">{v}</b></div>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Orders">
            {orders.length ? (
              <DataTable rows={orders} rowKey={(o) => o.id} onRowClick={(o) => navigate({ to: "/orders/$orderId", params: { orderId: o.id } })}
                columns={[
                  { header: "Order", cell: (o) => <b className="font-medium">{o.id}</b> },
                  { header: "Date", cell: (o) => o.date },
                  { header: "Status", cell: (o) => <StatusBadge tone={o.status.tone}>{o.status.label}</StatusBadge> },
                  { header: "Total", align: "right", cell: (o) => formatMoney(o.total) },
                ]} />
            ) : (
              <><p className="pb-3.5 text-[13.5px] text-muted-foreground">No orders yet.</p><Button onClick={newOrder}>+ Create an order for {c.name.split(" ")[0]}</Button></>
            )}
          </Panel>
          <Panel title="Messages sent">
            {c.messages.length ? (
              <ol className="flex flex-col">
                {c.messages.slice().reverse().map((m, i) => (
                  <li key={i} className="flex gap-3 py-2">
                    <i className="mt-[5px] size-[9px] flex-none rounded-full bg-primary" />
                    <div><b className="block text-[13px] font-normal">{m.text}</b><span className="text-[12px] text-muted-foreground">{m.when} · {m.who}</span></div>
                  </li>
                ))}
              </ol>
            ) : <p className="text-[13.5px] text-muted-foreground">Nothing sent yet. Emails, WhatsApp and SMS sent from the panel are listed here.</p>}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Contact" action={<button type="button" onClick={() => act.form(c)} className="text-[12.5px] text-muted-foreground underline underline-offset-[3px]">Edit</button>}>
            <div className="mb-3 flex items-center gap-3"><Avatar name={c.name} className="size-[34px] text-[12px]" /><b className="font-medium">{c.name}</b></div>
            <Kv rows={[
              ["Email", c.email ? <a key="e" href={`mailto:${c.email}`} className="underline underline-offset-[3px]">{c.email}</a> : <button key="e" type="button" onClick={() => act.form(c)} className="underline">Add email</button>],
              ["Mobile", <a key="m" href={`tel:${c.phone.replace(/\s/g, "")}`} className="underline underline-offset-[3px]">{c.phone}</a>],
              ["Language", c.language],
              ["Agreed to offers by", <>{yes(c.marketing.email && !!c.email, "Email")}{yes(c.marketing.sms, "SMS")}{yes(c.marketing.whatsapp, "WhatsApp")}</>],
            ]} />
          </Panel>
          <Panel title="Address">
            {c.address ? <p className="text-[13px]">{c.address}<br />{c.city}</p> : <p className="text-[13px] text-muted-foreground">No address yet — it is added with their first order.</p>}
          </Panel>
          <Panel title="Important dates">
            <Kv rows={[["Birthday", c.birthday || "—"], ["Anniversary", "—"]]} />
            <p className="mt-2.5 text-[12px] text-muted-foreground">Used for gifting reminders & offers.</p>
          </Panel>
          <Panel title="Private notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Team only" className="mb-2.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary" />
            <Button onClick={() => { editCustomer(c.id, { notes: notes.trim() }); toast("Notes saved"); }}>Save notes</Button>
          </Panel>
        </div>
      </div>
      {act.dialog}
    </>
  );
}
