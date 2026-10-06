import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ordersQuery } from "@/lib/api/sections.functions";
import type { OrderRow, Tile } from "@/lib/api/section-types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Chip, StatusBadge } from "@/components/admin/primitives";
import {
  Button,
  Card,
  DataTable,
  FilterBar,
  FilterSelect,
  Muted,
  PageHeader,
  Pager,
  SearchInput,
  type Column,
} from "@/components/admin/page";
import {
  ORDER_STAGES,
  applyEdit,
  bulkKey,
  editOrder,
  isAppt,
  newAwb,
  nextLabel,
  removeDraft,
  useCreatedOrders,
  useLocalDrafts,
  useOrderActions,
  useOrderEdits,
} from "@/components/admin/OrderFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { soon } from "@/hooks/use-toast-lite";

const BULK_LABEL: Record<string, (n: number) => string> = {
  Pending: (n) => `Start preparing ${n} order${n > 1 ? "s" : ""}`,
  Processing: (n) => `Mark ${n} Ready to ship`,
  "Ready to ship": (n) => `Book Bosta pickup for ${n}`,
};

function Check({
  checked,
  onChange,
  label,
  disabled,
  title,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      title={title}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="size-4 cursor-pointer accent-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

function BulkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-[30px] rounded-lg border border-white/35 px-3.5 text-[12px] text-white hover:border-white"
    >
      {children}
    </button>
  );
}

/** Stage tiles grouped by who owns them: your team, the courier, and drafts not yet placed. */
function StageTiles({
  tiles,
  drafts,
  active,
  onSelect,
}: {
  tiles: Tile[];
  drafts: number;
  active: string;
  onSelect: (k: string) => void;
}) {
  const all = [
    ...tiles,
    {
      key: "Drafts",
      label: "Drafts",
      count: drafts,
      hint: "Manual orders not placed",
      group: "Not placed",
    },
  ];
  const groups = [...new Set(all.map((t) => t.group ?? ""))];
  const span = (g: string) => all.filter((t) => t.group === g).length;
  return (
    <>
      <div
        className="mb-2 hidden gap-[18px] xl:grid"
        style={{ gridTemplateColumns: groups.map((g) => `${span(g)}fr`).join(" ") }}
      >
        {groups.map((g) => (
          <div
            key={g}
            className="flex items-center gap-2.5 text-[10.5px] uppercase tracking-[.2em] text-muted-foreground after:h-px after:flex-1 after:bg-border"
          >
            {g}
          </div>
        ))}
      </div>
      <div className="mb-[18px] grid grid-cols-2 gap-[18px] md:grid-cols-3 xl:grid-cols-6">
        {all.map((t) => {
          const on = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onSelect(on ? "" : t.key)}
              className={cn(
                "rounded-[10px] border px-4 py-3 text-left transition-colors hover:border-primary",
                t.group === "Courier"
                  ? "bg-hover"
                  : t.group === "Not placed"
                    ? "border-dashed bg-transparent"
                    : "bg-surface",
                on ? "border-solid border-primary ring-1 ring-primary" : "border-border",
              )}
            >
              <b className="block font-head text-[22px] font-normal">{t.count}</b>
              <span className="text-[12px] text-muted-foreground">{t.label}</span>
              {t.hint && (
                <em className="mt-1.5 block text-[11.5px] not-italic leading-snug text-muted-foreground">
                  {t.hint}
                </em>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

type Bulk = { orders: OrderRow[]; key: string };

export default function OrdersPage() {
  const { data } = useSuspenseQuery(ordersQuery());
  const navigate = useNavigate();
  const edits = useOrderEdits();
  const created = useCreatedOrders();
  const localDrafts = useLocalDrafts();
  const drafts = [
    ...localDrafts,
    ...data.drafts.filter((d) => !localDrafts.some((l) => l.id === d.id)),
  ];
  const newOrder = (draft?: string) =>
    navigate({ to: "/orders/new", search: draft ? { draft } : {} });
  const actions = useOrderActions();
  const [f, setF] = useState({ stage: "", q: "", status: "", pay: "", ful: "" });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [bulk, setBulk] = useState<Bulk | null>(null);

  const orders = useMemo(
    () => [...created, ...data.rows].map((o) => applyEdit(o, edits[o.id])),
    [created, data.rows, edits],
  );
  const tiles = data.tiles.map((t) => ({
    ...t,
    count: orders.filter((o) => o.status.label === t.key).length,
  }));
  const setFilter = (k: keyof typeof f) => (v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setPage(1);
    if (k === "stage") setSel(new Set());
  };

  const q = f.q.toLowerCase();
  const rows = orders.filter(
    (o) =>
      (!f.stage || o.status.label === f.stage) &&
      (!f.status || o.status.label === f.status) &&
      (!f.pay || o.payment === f.pay) &&
      (!f.ful || o.fulfilment === f.ful) &&
      (!q || `${o.id} ${o.customer}`.toLowerCase().includes(q)),
  );
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * pageSize, cur * pageSize);

  /* Safe selection: only orders at the same stage can be ticked together. */
  const selected = orders.filter((o) => sel.has(o.id));
  const key = selected.length ? bulkKey(selected[0]!) : null;
  const eligible = rows.filter((o) => bulkKey(o) && (!key || bulkKey(o) === key));
  const allOn = eligible.length > 0 && eligible.every((o) => sel.has(o.id));
  const canAll = !!key || !!(f.stage && BULK_LABEL[f.stage]);
  const toggleSel = (o: OrderRow) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(o.id)) n.delete(o.id);
      else if (bulkKey(o) && (!key || bulkKey(o) === key)) n.add(o.id);
      else toast("Only orders at the same stage can be moved together");
      return n;
    });
  const toggleAll = () =>
    setSel((s) => {
      const n = new Set(s);
      eligible.forEach((o) => (allOn ? n.delete(o.id) : n.add(o.id)));
      return n;
    });

  const runBulk = () => {
    if (!bulk) return;
    const ev = (text: string) => ({ text, when: "Just now", who: actions.who });
    bulk.orders.forEach((o) => {
      if (bulk.key === "Pending")
        editOrder(o.id, { status: "Processing" }, ev("Confirmed · started preparing"));
      else if (bulk.key === "Processing")
        editOrder(
          o.id,
          { status: "Ready to ship" },
          ev("Packing checklist completed · Ready to ship"),
        );
      else {
        const awb = newAwb();
        editOrder(o.id, { awb }, ev(`Courier pickup booked · AWB ${awb}`));
      }
    });
    toast(`${bulk.orders.length} orders moved to the next stage`);
    setBulk(null);
    setSel(new Set());
  };

  const columns: Column<OrderRow>[] = [
    {
      header: "select",
      headerNode: (
        <Check
          checked={allOn}
          onChange={toggleAll}
          label="Tick all"
          disabled={!canAll || !eligible.length}
          title={canAll ? "Tick all" : "Click a stage tile first to tick all"}
        />
      ),
      cell: (o) => {
        const bk = bulkKey(o),
          ok = !!bk && (!key || bk === key);
        const why = !bk
          ? "Nothing to move in bulk at this stage"
          : !ok
            ? `You have ${key} orders selected — this one is ${o.status.label}`
            : "";
        return (
          <Check
            checked={sel.has(o.id)}
            onChange={() => toggleSel(o)}
            label={`Select ${o.id}`}
            disabled={!bk || (!ok && !sel.has(o.id))}
            title={why}
          />
        );
      },
    },
    {
      header: "Order",
      cell: (o) => (
        <>
          <b className="font-medium">{o.id}</b>
          {o.manual && (
            <span className="ml-1.5">
              <Chip dark>Manual</Chip>
            </span>
          )}
          <Muted>
            {o.itemCount} item{o.itemCount > 1 ? "s" : ""}
          </Muted>
        </>
      ),
    },
    { header: "Date", className: "whitespace-nowrap", cell: (o) => o.date },
    { header: "Customer", cell: (o) => o.customer },
    {
      header: "Payment",
      cell: (o) => (
        <>
          {o.payment}
          <div className="mt-1">
            <StatusBadge tone={o.payStatus.tone}>{o.payStatus.label}</StatusBadge>
          </div>
        </>
      ),
    },
    {
      header: "Fulfilment",
      cell: (o) =>
        isAppt(o) ? (
          <Chip>By appointment</Chip>
        ) : o.fulfilment === "Pickup" ? (
          <Chip>Office pickup</Chip>
        ) : (
          "Courier"
        ),
    },
    {
      header: "Status",
      cell: (o) => <StatusBadge tone={o.status.tone}>{o.status.label}</StatusBadge>,
    },
    {
      header: "Total",
      align: "right",
      cell: (o) => <b className="whitespace-nowrap font-medium">{formatMoney(o.total)}</b>,
    },
    {
      header: "Next step",
      cell: (o) => {
        const nb = nextLabel(o);
        if (nb)
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                actions.run(o);
              }}
              className={cn(
                "h-[30px] whitespace-nowrap rounded-lg border px-3 text-[12px]",
                o.status.label === "Pending"
                  ? "border-primary bg-primary text-primary-foreground hover:opacity-90"
                  : "border-border bg-surface hover:border-primary",
              )}
            >
              {nb}
            </button>
          );
        if (o.status.label === "Return open")
          return (
            <Link
              to="/$section"
              params={{ section: "returns" }}
              onClick={(e) => e.stopPropagation()}
              className="whitespace-nowrap text-[12px] text-muted-foreground"
            >
              <b className="block font-medium text-foreground">Return open</b>Returns & refunds →
            </Link>
          );
        const info =
          o.status.label === "Ready to ship" && o.awb
            ? ["Pickup booked", o.awb]
            : o.status.label === "Shipped" && !isAppt(o)
              ? ["With Bosta", o.awb ?? "—"]
              : null;
        return info ? (
          <span className="whitespace-nowrap text-[12px] text-muted-foreground">
            <b className="block font-medium text-foreground">{info[0]}</b>
            {info[1]}
          </span>
        ) : (
          <span className="text-[12px] text-muted-foreground">—</span>
        );
      },
    },
  ];

  const draftsView = f.stage === "Drafts";
  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Every order, website and manual. Open an order and press the one button to move it on — or tick several at the same stage and move them together."
        actions={
          <>
            <Button onClick={soon("Export")}>Export</Button>
            <Button primary onClick={() => newOrder()}>
              Create manual order
            </Button>
          </>
        }
      />
      <StageTiles
        tiles={tiles}
        drafts={drafts.length}
        active={f.stage}
        onSelect={setFilter("stage")}
      />

      <Card>
        {f.stage && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-primary px-3.5 py-2.5 text-[13px]">
            <span>
              {draftsView ? (
                <>
                  Showing{" "}
                  <b className="font-semibold">
                    {drafts.length} draft{drafts.length === 1 ? "" : "s"}
                  </b>{" "}
                  · manual orders saved but not placed. They don't count in orders or revenue.
                </>
              ) : (
                <>
                  Showing{" "}
                  <b className="font-semibold">
                    {rows.length} {f.stage}
                  </b>{" "}
                  order{rows.length === 1 ? "" : "s"} · {tiles.find((t) => t.key === f.stage)?.hint}
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => setFilter("stage")("")}
              className="underline underline-offset-[3px]"
            >
              Show all orders
            </button>
          </div>
        )}

        {draftsView ? (
          <DataTable
            rowKey={(d) => d.id}
            rows={drafts}
            empty='No drafts. Use "Save as draft" on a manual order to keep it here.'
            columns={[
              {
                header: "Draft",
                cell: (d) => (
                  <>
                    <b className="font-medium">{d.id}</b>
                    <span className="ml-1.5">
                      <Chip dark>Manual</Chip>
                    </span>
                    {d.note && <Muted>{d.note}</Muted>}
                  </>
                ),
              },
              {
                header: "Saved",
                cell: (d) => (
                  <>
                    {d.saved}
                    <Muted>by {d.by}</Muted>
                  </>
                ),
              },
              { header: "Customer", cell: (d) => d.customer },
              {
                header: "Items",
                cell: (d) =>
                  d.lines.map((l) => (
                    <div key={l.sku}>
                      {l.name}
                      {l.qty > 1 ? ` ×${l.qty}` : ""}
                    </div>
                  )),
              },
              { header: "Came from", cell: (d) => d.source },
              {
                header: "Total",
                align: "right",
                cell: (d) => (
                  <b className="whitespace-nowrap font-medium">{formatMoney(d.total)}</b>
                ),
              },
              {
                header: "actions",
                headerNode: "",
                align: "right",
                cell: (d) => (
                  <div className="flex justify-end gap-2">
                    <Button primary onClick={() => newOrder(d.id)}>
                      Continue
                    </Button>
                    <Button
                      onClick={() => {
                        if (localDrafts.some((l) => l.id === d.id)) {
                          removeDraft(d.id);
                          toast(`Draft ${d.id} deleted`);
                        } else soon("Delete draft")();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <>
            <FilterBar>
              <SearchInput
                value={f.q}
                onChange={setFilter("q")}
                placeholder="Order number or customer"
              />
              <FilterSelect
                value={f.status}
                onChange={setFilter("status")}
                all="All statuses"
                options={[...ORDER_STAGES, "Cancelled", "Returned"]}
              />
              <FilterSelect
                value={f.pay}
                onChange={setFilter("pay")}
                all="All payment methods"
                options={[...new Set(data.rows.map((r) => r.payment))]}
              />
              <FilterSelect
                value={f.ful}
                onChange={setFilter("ful")}
                all="All fulfilment"
                options={["Courier", "Appointment", "Pickup"]}
              />
            </FilterBar>
            <div
              className={cn(
                "mb-2.5 flex min-h-[46px] flex-wrap items-center gap-2 rounded-lg px-3 py-2.5 text-[13px]",
                sel.size ? "bg-primary text-primary-foreground" : "bg-hover",
              )}
            >
              {sel.size && key ? (
                <>
                  <span>
                    <b className="font-semibold">{sel.size} selected</b>
                    <span className="ml-1.5 rounded-full border border-white/35 px-2.5 py-0.5 text-[12px]">
                      {key}
                    </span>
                  </span>
                  <BulkButton onClick={() => setBulk({ orders: selected, key })}>
                    {BULK_LABEL[key]!(sel.size)}
                  </BulkButton>
                  <span className="text-[12.5px] opacity-75">
                    Only {key} orders can be added — others are greyed out
                  </span>
                  <button
                    type="button"
                    onClick={() => setSel(new Set())}
                    className="text-white/70 underline"
                  >
                    Clear
                  </button>
                </>
              ) : (
                <span>
                  Tick orders to move several at once. <b className="font-semibold">Tip:</b> click a
                  stage tile above first — then "tick all" selects every order in it.
                </span>
              )}
            </div>
            <DataTable
              columns={columns}
              rows={shown}
              rowKey={(o) => o.id}
              empty="No orders match these filters"
              onRowClick={(o) => navigate({ to: "/orders/$orderId", params: { orderId: o.id } })}
            />
            <Pager
              page={cur}
              pageSize={pageSize}
              total={rows.length}
              noun="orders"
              onPage={setPage}
              onPageSize={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </>
        )}
      </Card>

      {actions.dialog}

      {/* Move several at once */}
      <Dialog open={!!bulk} onOpenChange={(o) => !o && setBulk(null)}>
        <DialogContent className="max-w-[520px]">
          {bulk && (
            <>
              <DialogHeader>
                <DialogTitle className="font-head text-[18px] font-normal">
                  {BULK_LABEL[bulk.key]!(bulk.orders.length)}
                </DialogTitle>
              </DialogHeader>
              <p className="text-[13.5px]">
                {bulk.key === "Pending"
                  ? "They move to Processing and appear on the packing list."
                  : bulk.key === "Processing"
                    ? "Confirm each order has been packed with its checklist completed."
                    : "One Bosta pickup is booked for all of them, with one AWB per order."}
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
                {bulk.orders.map((o) => (
                  <Fragment key={o.id}>
                    <dt className="font-medium">{o.id}</dt>
                    <dd className="text-right text-muted-foreground">
                      {o.customer} · {formatMoney(o.total)}
                    </dd>
                  </Fragment>
                ))}
              </dl>
              <DialogFooter>
                <Button onClick={() => setBulk(null)}>Cancel</Button>
                <Button primary onClick={runBulk}>
                  Confirm
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
