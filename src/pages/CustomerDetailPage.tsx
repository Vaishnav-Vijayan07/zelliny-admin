import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  customersQuery,
  ordersQuery,
  productsQuery,
  returnsQuery,
} from "@/lib/api/sections.functions";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar, Chip, Panel, StatusBadge, Thumb } from "@/components/admin/primitives";
import { Button, DataTable, PageHeader } from "@/components/admin/page";
import {
  ADDRESS_LABELS,
  CITIES,
  deleteAddress,
  editCustomer,
  makeDefaultAddress,
  saveAddress,
  useCustomerActions,
  useCustomers,
  type LiveCustomer,
} from "@/components/admin/CustomerFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { applyEdit, useCreatedOrders, useOrderEdits } from "@/components/admin/OrderFlow";
import { useReturns } from "@/components/admin/ReturnFlow";

function Kv({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
type AddrForm = {
  id: string | null;
  label: string;
  address: string;
  city: string;
  isDefault: boolean;
};

/** Saved delivery addresses as a list of cards, with add / edit / delete / make default. */
function AddressesPanel({ c }: { c: LiveCustomer }) {
  const [form, setForm] = useState<AddrForm | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const link =
    "text-[12.5px] text-muted-foreground underline underline-offset-[3px] hover:text-foreground";
  const open = (a?: LiveCustomer["addresses"][number]) => {
    setErr("");
    setForm(
      a
        ? { id: a.id, label: a.label, address: a.address, city: a.city, isDefault: a.isDefault }
        : {
            id: null,
            label: c.addresses.length ? "Work" : "Home",
            address: "",
            city: c.city || CITIES[0]!,
            isDefault: !c.addresses.length,
          },
    );
  };
  const save = () => {
    if (!form) return;
    if (!form.address.trim()) {
      setErr("Enter the address.");
      return;
    }
    saveAddress(c, { ...form, address: form.address.trim() });
    setForm(null);
    toast(form.id ? "Address saved" : "Address added");
  };
  const target = c.addresses.find((a) => a.id === del);
  return (
    <>
      <Panel
        title={`Addresses · ${c.addresses.length}`}
        action={
          <button type="button" onClick={() => open()} className={link}>
            + Add address
          </button>
        }
      >
        {c.addresses.length ? (
          <ul className="flex flex-col gap-2.5">
            {c.addresses.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "rounded-lg border px-3.5 py-3 text-[13px]",
                  a.isDefault ? "border-primary" : "border-border",
                )}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <Chip>{a.label}</Chip>
                  {a.isDefault && <StatusBadge tone="ok">Default</StatusBadge>}
                </div>
                <p>{a.address}</p>
                <p className="text-muted-foreground">{a.city}</p>
                <div className="mt-2.5 flex flex-wrap gap-3.5">
                  <button type="button" onClick={() => open(a)} className={link}>
                    Edit
                  </button>
                  {!a.isDefault && (
                    <button
                      type="button"
                      onClick={() => {
                        makeDefaultAddress(c, a.id);
                        toast("Default address changed");
                      }}
                      className={link}
                    >
                      Make default
                    </button>
                  )}
                  <button type="button" onClick={() => setDel(a.id)} className={link}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            No address yet — add one, or it is saved with their first order.
          </p>
        )}
      </Panel>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              {form?.id ? "Edit address" : "Add address"}
            </DialogTitle>
          </DialogHeader>
          {form && (
            <div className="flex flex-col gap-3.5 text-[12px] text-muted-foreground">
              <label className="flex flex-col gap-1.5">
                Label
                <select
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className={inputCls}
                >
                  {ADDRESS_LABELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                Address <em className="not-italic text-bad">*</em>
                <input
                  autoFocus
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Building, street, floor, apartment"
                  className={inputCls}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                City / area
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={inputCls}
                >
                  {[...new Set([...CITIES, form.city])].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-[13px] text-foreground">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                />
                Use as the default delivery address
              </label>
              {err && <p className="text-[12.5px] text-bad">{err}</p>}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setForm(null)}>Cancel</Button>
            <Button primary onClick={save}>
              {form?.id ? "Save changes" : "Add address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!target} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">Delete address?</DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            {target?.label} · {target?.address}, {target?.city}
          </p>
          <DialogFooter>
            <Button onClick={() => setDel(null)}>Cancel</Button>
            <Button
              primary
              onClick={() => {
                if (target) deleteAddress(c, target.id);
                setDel(null);
                toast("Address deleted");
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function CustomerDetailPage({ customerId }: { customerId: string }) {
  const { data } = useSuspenseQuery(customersQuery());
  const { data: ordersData } = useSuspenseQuery(ordersQuery());
  const { data: returnsData } = useSuspenseQuery(returnsQuery());
  const { data: productsData } = useSuspenseQuery(productsQuery());
  const navigate = useNavigate();
  const all = useCustomers(data.rows);
  const created = useCreatedOrders();
  const oEdits = useOrderEdits();
  const returns = useReturns(returnsData.rows);
  const act = useCustomerActions(all, (id) =>
    navigate({ to: "/customers/$customerId", params: { customerId: id } }),
  );
  const c = all.find((x) => x.id === customerId);
  const [notes, setNotes] = useState(c?.notes ?? "");

  if (!c) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-[28px]">Customer not found</h1>
        <p className="mt-2 text-muted-foreground">
          There is no customer {customerId}.{" "}
          <Link to="/$section" params={{ section: "customers" }} className="underline">
            Back to Customers
          </Link>
        </p>
      </div>
    );
  }
  const orders = [...created, ...ordersData.rows]
    .filter((o) => o.customer === c.name)
    .map((o) => applyEdit(o, oEdits[o.id]));
  const rets = returns.filter((r) => r.customer === c.name);
  const newOrder = () => navigate({ to: "/orders/new", search: { customer: c.id } });
  const yes = (on: boolean, l: string) => (
    <span key={l} className={cn("block", on ? "text-good" : "text-bad")}>
      {on ? "✓" : "✕"} {l}
    </span>
  );

  return (
    <>
      <div className="mb-2 text-[12px] text-muted-foreground">
        <Link
          to="/$section"
          params={{ section: "customers" }}
          className="underline underline-offset-[3px]"
        >
          Customers
        </Link>{" "}
        / {c.name}
      </div>
      <PageHeader
        title={c.name}
        subtitle={`Customer since ${c.since}`}
        actions={
          <>
            <Button onClick={() => act.form(c)}>Edit</Button>
            <Button primary onClick={newOrder}>
              + New order
            </Button>
          </>
        }
      />
      {c.isNew && !orders.length && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary bg-surface px-4 py-3 text-[13px]">
          <span>
            <b className="font-semibold">New customer saved.</b> Next: create their first order, or
            send them a welcome message.
          </span>
          <Button primary onClick={newOrder}>
            Create first order
          </Button>
        </div>
      )}
      <div className="mb-5 grid grid-cols-2 gap-[18px] md:grid-cols-4">
        {(
          [
            ["Total spent", formatMoney(c.spent)],
            ["Orders", c.orders],
            ["Average order", c.orders ? formatMoney(Math.round(c.spent / c.orders)) : "—"],
            ["Returns", rets.length],
          ] as [string, ReactNode][]
        ).map(([k, v]) => (
          <div key={k} className="rounded-[10px] border border-border bg-surface px-[18px] py-3.5">
            <span className="block text-[12px] text-muted-foreground">{k}</span>
            <b className="font-head text-[20px] font-medium">{v}</b>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Orders">
            {orders.length ? (
              <DataTable
                rows={orders}
                rowKey={(o) => o.id}
                onRowClick={(o) => navigate({ to: "/orders/$orderId", params: { orderId: o.id } })}
                columns={[
                  { header: "Order", cell: (o) => <b className="font-medium">{o.id}</b> },
                  { header: "Date", cell: (o) => o.date },
                  {
                    header: "Status",
                    cell: (o) => <StatusBadge tone={o.status.tone}>{o.status.label}</StatusBadge>,
                  },
                  { header: "Total", align: "right", cell: (o) => formatMoney(o.total) },
                ]}
              />
            ) : (
              <>
                <p className="pb-3.5 text-[13.5px] text-muted-foreground">No orders yet.</p>
                <Button onClick={newOrder}>+ Create an order for {c.name.split(" ")[0]}</Button>
              </>
            )}
          </Panel>
          <Panel title="Messages sent">
            {c.messages.length ? (
              <ol className="flex flex-col">
                {c.messages
                  .slice()
                  .reverse()
                  .map((m, i) => (
                    <li key={i} className="flex gap-3 py-2">
                      <i className="mt-[5px] size-[9px] flex-none rounded-full bg-primary" />
                      <div>
                        <b className="block text-[13px] font-normal">{m.text}</b>
                        <span className="text-[12px] text-muted-foreground">
                          {m.when} · {m.who}
                        </span>
                      </div>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="text-[13.5px] text-muted-foreground">
                Nothing sent yet. Emails, WhatsApp and SMS sent from the panel are listed here.
              </p>
            )}
          </Panel>
          <AddressesPanel c={c} />
          {!c.isNew && (
            <Panel title="Wishlist">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {productsData.rows
                  .filter((p) => p.visible && !p.isDraft)
                  .slice(0, 4)
                  .map((p) => (
                    <Link
                      key={p.id}
                      to="/products/$productId"
                      params={{ productId: p.id }}
                      className="flex flex-col gap-1.5 text-[12px] hover:underline"
                    >
                      <Thumb color={p.color} className="aspect-square h-auto w-full" />
                      <span>{p.name}</span>
                    </Link>
                  ))}
              </div>
            </Panel>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel
            title="Contact"
            action={
              <button
                type="button"
                onClick={() => act.form(c)}
                className="text-[12.5px] text-muted-foreground underline underline-offset-[3px]"
              >
                Edit
              </button>
            }
          >
            <div className="mb-3 flex items-center gap-3">
              <Avatar name={c.name} className="size-[34px] text-[12px]" />
              <b className="font-medium">{c.name}</b>
            </div>
            <Kv
              rows={[
                [
                  "Email",
                  c.email ? (
                    <a
                      key="e"
                      href={`mailto:${c.email}`}
                      className="underline underline-offset-[3px]"
                    >
                      {c.email}
                    </a>
                  ) : (
                    <button key="e" type="button" onClick={() => act.form(c)} className="underline">
                      Add email
                    </button>
                  ),
                ],
                [
                  "Mobile",
                  <a
                    key="m"
                    href={`tel:${c.phone.replace(/\s/g, "")}`}
                    className="underline underline-offset-[3px]"
                  >
                    {c.phone}
                  </a>,
                ],
                ["Language", c.language],
                // [
                //   "Agreed to offers by",
                //   <>
                //     {yes(c.marketing.email && !!c.email, "Email")}
                //     {yes(c.marketing.sms, "SMS")}
                //     {yes(c.marketing.whatsapp, "WhatsApp")}
                //   </>,
                // ],
              ]}
            />
          </Panel>
          <Panel title="Important dates">
            <Kv rows={[["Birthday", c.birthday || "—"]]} />
            <p className="mt-2.5 text-[12px] text-muted-foreground">
              Used for gifting reminders & offers.
            </p>
          </Panel>
          <Panel title="Private notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Team only"
              className="mb-2.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary"
            />
            <Button
              onClick={() => {
                editCustomer(c.id, { notes: notes.trim() });
                toast("Notes saved");
              }}
            >
              Save notes
            </Button>
          </Panel>
        </div>
      </div>
      {act.dialog}
    </>
  );
}
