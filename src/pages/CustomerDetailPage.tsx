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
import { Button, DataTable, PageHeader, Pager } from "@/components/admin/page";
import type { ProductRow } from "@/lib/api/section-types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  ADDRESS_LABELS,
  CITIES,
  deleteAddress,
  downloadCsv,
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
        title="Addresses"
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

/** Wishlist isn't in the API yet — a stable pick of live products per customer. */
function wishlistFor(customerId: string, products: ProductRow[]) {
  const live = products.filter((p) => p.visible && !p.isDraft);
  if (!live.length) return [];
  const n = Number(customerId.replace(/\D/g, "")) || 0;
  const count = Math.min(live.length, 3 + (n % 8));
  return Array.from({ length: count }, (_, i) => live[(n * 3 + i * 2) % live.length]!).filter(
    (p, i, a) => a.findIndex((x) => x.id === p.id) === i,
  );
}

const linkBtn =
  "text-[12.5px] text-muted-foreground underline underline-offset-[3px] hover:text-foreground";

type SidePanel = { kind: "order"; id: string } | { kind: "product"; id: string } | null;

export default function CustomerDetailPage({
  customerId,
  showOrders = false,
}: {
  customerId: string;
  showOrders?: boolean;
}) {
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
  const [editNotes, setEditNotes] = useState(false);
  const [panel, setPanel] = useState<SidePanel>(null);
  const [wPage, setWPage] = useState(1);
  const [oPage, setOPage] = useState(1);
  const [oSize, setOSize] = useState(10);

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
  // Orders placed in this session (manual orders) on top of the stored totals.
  const placed = created.filter((o) => o.customer === c.name);
  const orderCount = c.orders + placed.length;
  const spent = c.spent + placed.reduce((s, o) => s + o.total, 0);
  const rets = returns.filter((r) => r.customer === c.name);
  const first = c.name.split(" ")[0] ?? c.name;
  const newOrder = () => navigate({ to: "/orders/new", search: { customer: c.id } });
  const openOrder = (id: string) => navigate({ to: "/orders/$orderId", params: { orderId: id } });
  const toOrders = (view: boolean) =>
    navigate({
      to: "/customers/$customerId",
      params: { customerId: c.id },
      search: view ? { view: "orders" } : {},
    });
  const mailOrToast = () =>
    c.email ? act.send([c], "Email") : toast("No email on file — add one with Edit");
  const wish = wishlistFor(c.id, productsData.rows);
  const wPages = Math.max(1, Math.ceil(wish.length / 8));
  const wCur = Math.min(wPage, wPages);
  const addr = c.addresses.find((a) => a.isDefault) ?? c.addresses[0];

  const crumb = (last: ReactNode) => (
    <div className="mb-2 text-[12px] text-muted-foreground">
      <Link
        to="/$section"
        params={{ section: "customers" }}
        className="underline underline-offset-[3px]"
      >
        Customers
      </Link>{" "}
      /{" "}
      {last === "Orders" ? (
        <>
          <button
            type="button"
            onClick={() => toOrders(false)}
            className="underline underline-offset-[3px]"
          >
            {c.name}
          </button>{" "}
          / Orders
        </>
      ) : (
        last
      )}
    </div>
  );

  /* ---------- side panels (order / wishlist product) ---------- */
  const sidePanels = () => {
    const o = panel?.kind === "order" ? orders.find((x) => x.id === panel.id) : undefined;
    const p =
      panel?.kind === "product" ? productsData.rows.find((x) => x.id === panel.id) : undefined;
    const out = !!p && p.stock <= 0;
    const eyebrow = "text-[11px] uppercase tracking-[.18em] text-muted-foreground";
    const sec = "border-b border-border py-4 last:border-0";
    return (
      <Sheet open={!!panel} onOpenChange={(v) => !v && setPanel(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[560px]">
          {o && (
            <>
              <SheetHeader>
                <p className={eyebrow}>Order</p>
                <SheetTitle className="font-head text-[26px] font-normal">{o.id}</SheetTitle>
                <div className="flex items-center gap-2 text-[13.5px] text-muted-foreground">
                  <StatusBadge tone={o.status.tone}>{o.status.label}</StatusBadge>
                  {o.date}
                </div>
              </SheetHeader>
              <section className={sec}>
                <h5 className={cn(eyebrow, "mb-2")}>Items</h5>
                {o.lines.map((l) => (
                  <div key={l.sku} className="flex justify-between gap-3 py-1.5 text-[13.5px]">
                    <span>
                      {l.name}
                      <em className="block text-[12px] not-italic text-muted-foreground">
                        {l.sku}
                      </em>
                    </span>
                    <span className="whitespace-nowrap">× {l.qty}</span>
                  </div>
                ))}
              </section>
              <section className={sec}>
                <h5 className={cn(eyebrow, "mb-2")}>Summary</h5>
                <Kv
                  rows={[
                    ["Payment", o.payment],
                    ["Fulfilment", o.fulfilment],
                    ["Total", <b key="t">{formatMoney(o.total)}</b>],
                  ]}
                />
              </section>
              <section className={sec}>
                <h5 className={cn(eyebrow, "mb-2")}>Deliver to</h5>
                <p className="text-[13.5px]">{addr ? `${addr.address}, ${addr.city}` : "—"}</p>
                <p className="text-[12.5px] text-muted-foreground">{c.phone}</p>
              </section>
              <div className="flex flex-wrap gap-2 pt-4">
                <Button primary onClick={() => openOrder(o.id)}>
                  Open full order →
                </Button>
                <Button
                  onClick={() => {
                    setPanel(null);
                    act.send([c], "WhatsApp", { tpl: "order", order: o.id });
                  }}
                >
                  Send order update
                </Button>
              </div>
            </>
          )}
          {p && (
            <>
              <SheetHeader>
                <p className={eyebrow}>Product · {p.sku}</p>
                <SheetTitle className="font-head text-[26px] font-normal">{p.name}</SheetTitle>
                <p className="text-[13.5px] text-muted-foreground">
                  {p.brand} · {p.category}
                </p>
              </SheetHeader>
              <section className={sec}>
                <Thumb color={p.color} className="aspect-[16/10] h-auto w-full rounded-[14px]" />
              </section>
              <section className={sec}>
                <Kv
                  rows={[
                    ["Price", p.price ? formatMoney(p.offer ?? p.price) : "On request"],
                    ["Stock", out ? "Out of stock" : p.stock <= 5 ? "Low stock" : "In stock"],
                  ]}
                />
              </section>
              <div className="flex flex-wrap gap-2 pt-4">
                <Button
                  primary
                  onClick={() =>
                    navigate({ to: "/products/$productId", params: { productId: p.id } })
                  }
                >
                  Open product →
                </Button>
                <Button
                  onClick={() => {
                    setPanel(null);
                    act.send([c], "WhatsApp", { tpl: out ? "back" : "wish", product: p.name });
                  }}
                >
                  {out ? `Tell ${first} when back in stock` : `Send ${first} an offer`}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    );
  };

  /* ---------- all orders of this customer ---------- */
  if (showOrders) {
    const pages = Math.max(1, Math.ceil(orders.length / oSize));
    const cur = Math.min(oPage, pages);
    return (
      <>
        {crumb("Orders")}
        <PageHeader
          title={`Orders · ${c.name}`}
          subtitle={`${orders.length} order${orders.length === 1 ? "" : "s"} · ${formatMoney(orders.reduce((s, o) => s + o.total, 0))}`}
          actions={
            <>
              <Button onClick={() => toOrders(false)}>← Back to customer</Button>
              <Button
                onClick={() => {
                  downloadCsv(
                    `zelliny-orders-${c.id}.csv`,
                    ["Order", "Date", "Payment", "Status", "Total (EGP)"],
                    orders.map((o) => [o.id, o.date, o.payment, o.status.label, o.total]),
                  );
                  toast.success(`Excel downloaded · ${orders.length} orders`);
                }}
              >
                Export
              </Button>
            </>
          }
        />
        <Panel title="All orders">
          <DataTable
            rows={orders.slice((cur - 1) * oSize, cur * oSize)}
            rowKey={(o) => o.id}
            empty="No orders yet."
            onRowClick={(o) => setPanel({ kind: "order", id: o.id })}
            columns={[
              { header: "Order", cell: (o) => <b className="font-medium">{o.id}</b> },
              { header: "Date", className: "whitespace-nowrap", cell: (o) => o.date },
              {
                header: "Items",
                cell: (o) => `${o.itemCount} item${o.itemCount === 1 ? "" : "s"}`,
              },
              { header: "Payment", cell: (o) => o.payment },
              {
                header: "Status",
                cell: (o) => <StatusBadge tone={o.status.tone}>{o.status.label}</StatusBadge>,
              },
              { header: "Total", align: "right", cell: (o) => formatMoney(o.total) },
            ]}
          />
          <Pager
            page={cur}
            pageSize={oSize}
            total={orders.length}
            noun="orders"
            onPage={setOPage}
            onPageSize={(n) => {
              setOSize(n);
              setOPage(1);
            }}
          />
        </Panel>
        {sidePanels()}
        {act.dialog}
      </>
    );
  }

  return (
    <>
      {crumb(c.name)}
      <PageHeader
        title={c.name}
        subtitle={`Customer since ${c.since}`}
        actions={
          <>
            <Button onClick={() => act.send([c], "WhatsApp")}>WhatsApp</Button>
            <Button onClick={mailOrToast}>Email</Button>
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
            ["Total spent", formatMoney(spent)],
            ["Orders", orderCount],
            ["Average order", orderCount ? formatMoney(Math.round(spent / orderCount)) : "—"],
            ["Returns", rets.length],
          ] as [string, ReactNode][]
        ).map(([k, v]) => (
          <div key={k} className="rounded-[10px] border border-border bg-surface px-[18px] py-3.5">
            <span className="block text-[12px] text-muted-foreground">{k}</span>
            <b className="font-head text-[20px] font-medium">{v}</b>
          </div>
        ))}
      </div>

      {/* Orders = Contact + Important dates (bottoms line up); Addresses = Private notes. */}
      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:[grid-template-areas:'orders_contact''orders_dates''addr_notes']">
        <Panel
          title="Orders"
          className="lg:[grid-area:orders]"
          action={
            orders.length ? (
              <button type="button" onClick={() => toOrders(true)} className={linkBtn}>
                View all
              </button>
            ) : undefined
          }
        >
          {orders.length ? (
            <DataTable
              rows={orders.slice(0, 6)}
              rowKey={(o) => o.id}
              onRowClick={(o) => setPanel({ kind: "order", id: o.id })}
              columns={[
                { header: "Order", cell: (o) => <b className="font-medium">{o.id}</b> },
                { header: "Date", className: "whitespace-nowrap", cell: (o) => o.date },
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
              <Button onClick={newOrder}>+ Create an order for {first}</Button>
            </>
          )}
        </Panel>

        <Panel
          title="Contact"
          className="lg:[grid-area:contact]"
          action={
            <button type="button" onClick={() => act.form(c)} className={linkBtn}>
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
                  <button
                    key="e"
                    type="button"
                    onClick={() => act.send([c], "Email")}
                    className="underline underline-offset-[3px]"
                  >
                    {c.email}
                  </button>
                ) : (
                  <button key="e" type="button" onClick={() => act.form(c)} className="underline">
                    Add email
                  </button>
                ),
              ],
              [
                "Mobile",
                <button
                  key="m"
                  type="button"
                  onClick={() => act.send([c], "WhatsApp")}
                  className="underline underline-offset-[3px]"
                >
                  {c.phone}
                </button>,
              ],
              ["City", c.city],
              ["Language", c.language],
            ]}
          />
        </Panel>

        <Panel title="Important dates" className="lg:[grid-area:dates]">
          <Kv rows={[["Birthday", c.birthday || "—"]]} />
          <p className="mt-2.5 text-[12px] text-muted-foreground">
            Used for gifting reminders & offers.
          </p>
        </Panel>

        <div className="min-w-0 lg:[grid-area:addr] [&>section]:h-full">
          <AddressesPanel c={c} />
        </div>

        <Panel
          title="Private notes"
          className="lg:[grid-area:notes]"
          action={
            editNotes ? undefined : (
              <button
                type="button"
                onClick={() => {
                  setNotes(c.notes);
                  setEditNotes(true);
                }}
                className={linkBtn}
              >
                Edit
              </button>
            )
          }
        >
          {editNotes ? (
            <>
              <textarea
                autoFocus
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={7}
                placeholder="Team only"
                className="mb-2.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <Button
                  primary
                  onClick={() => {
                    editCustomer(c.id, { notes: notes.trim() });
                    setEditNotes(false);
                    toast("Notes saved");
                  }}
                >
                  Save notes
                </Button>
                <Button onClick={() => setEditNotes(false)}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
              <div className="min-h-[160px] whitespace-pre-wrap rounded-lg border border-border bg-hover px-3.5 py-3 text-[13.5px] leading-relaxed">
                {c.notes || (
                  <span className="text-muted-foreground">
                    No notes yet — click Edit to add one.
                  </span>
                )}
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">
                Team only · not visible to the customer
              </p>
            </>
          )}
        </Panel>
      </div>

      {!c.isNew && (
        <Panel
          className="mt-5"
          title={
            <>
              Wishlist{" "}
              <span className="ml-1 text-[12.5px] text-muted-foreground">
                {wish.length} item{wish.length === 1 ? "" : "s"}
              </span>
            </>
          }
        >
          {wish.length ? (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
                {wish.slice((wCur - 1) * 8, wCur * 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPanel({ kind: "product", id: p.id })}
                    className="group flex min-w-0 flex-col gap-1.5 text-left"
                  >
                    <Thumb color={p.color} className="aspect-[4/3] h-auto w-full" />
                    <span className="text-[13px] group-hover:underline">{p.name}</span>
                    <span className="text-[12px] text-muted-foreground">
                      {p.brand}
                      {p.price ? ` · ${formatMoney(p.offer ?? p.price)}` : ""}
                    </span>
                  </button>
                ))}
              </div>
              <Pager
                page={wCur}
                pageSize={8}
                total={wish.length}
                noun="items"
                onPage={setWPage}
                onPageSize={() => {}}
                sizes={[8]}
              />
            </>
          ) : (
            <p className="text-[13.5px] text-muted-foreground">Nothing on the wishlist.</p>
          )}
        </Panel>
      )}
      {sidePanels()}
      {act.dialog}
    </>
  );
}
