import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { paymentsQuery } from "@/lib/api/sections.functions";
import type { PaymentRow } from "@/lib/api/section-types";
import type { Tagged } from "@/lib/api/section-types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/primitives";
import { downloadCsv } from "@/components/admin/CustomerFlow";
import {
  RangeTabs,
  inDateFilter,
  rangeLabel,
  type DateFilter,
} from "@/components/admin/DateRangeFilter";
import {
  Button,
  Card,
  DataTable,
  FilterBar,
  FilterSelect,
  PageHeader,
  Pager,
  SearchInput,
  type Column,
} from "@/components/admin/page";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const isCod = (p: PaymentRow) => p.method === "Cash on Delivery";

/** "24 Sep 2026, 21:42" + hours → same format. Falls back to the original text. */
function plusHours(date: string, h: number): string {
  const m = /^(\d{1,2} [A-Za-z]{3,9} \d{4}),? ?(\d{1,2}):(\d{2})/.exec(date);
  if (!m) return date;
  const d = new Date(`${m[1]} ${m[2]}:${m[3]}`);
  if (isNaN(d.getTime())) return date;
  d.setMinutes(d.getMinutes() + h * 60);
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${day}, ${d.toTimeString().slice(0, 5)}`;
}

/** Fee and net for a payment: Paymob 2.75% on card/wallet, flat courier fee on cash on delivery. */
function money(p: PaymentRow) {
  const fee = isCod(p) ? 25 : Math.round(p.amount * 0.0275);
  return { fee, net: p.amount - fee };
}

function history(p: PaymentRow): { text: string; when: string; done: boolean }[] {
  const s = p.status.label;
  if (s === "Refunded")
    return [
      { text: "Payment captured", when: p.date, done: true },
      { text: "Return approved", when: plusHours(p.date, 50), done: true },
      {
        text: `Refunded to ${p.method.includes("Wallet") ? "wallet" : isCod(p) ? "customer" : "card"}`,
        when: plusHours(p.date, 80),
        done: true,
      },
    ];
  if (isCod(p))
    return s === "Paid"
      ? [
          { text: "Order placed · cash on delivery", when: p.date, done: true },
          { text: "Cash collected by courier · Bosta", when: plusHours(p.date, 40), done: true },
          { text: "Cash received from Bosta", when: plusHours(p.date, 96), done: true },
        ]
      : [
          { text: "Order placed · cash on delivery", when: p.date, done: true },
          { text: "Courier to collect on delivery · Bosta", when: "Waiting", done: false },
          { text: "Cash received from Bosta", when: "—", done: false },
        ];
  return [
    { text: "Payment authorised", when: p.date, done: true },
    { text: "Captured by Paymob", when: plusHours(p.date, 0.1), done: true },
    { text: "Settled in Paymob payout", when: plusHours(p.date, 72), done: true },
  ];
}

const Kv = ({ k, children }: { k: string; children: ReactNode }) => (
  <div className="flex justify-between gap-4 py-1.5 text-[13.5px] text-muted-foreground">
    {k}
    <b className="text-right font-normal text-foreground">{children}</b>
  </div>
);

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="border-b border-border py-4 last:border-0">
    <h5 className="mb-2.5 text-[11px] font-normal uppercase tracking-[.18em] text-muted-foreground">
      {title}
    </h5>
    {children}
  </section>
);

const linkCls = "cursor-pointer underline-offset-[3px] hover:underline";

type View = { kind: "tx"; id: string } | { kind: "customer"; id: string } | null;

export default function PaymentsPage() {
  const { data } = useSuspenseQuery(paymentsQuery());
  const navigate = useNavigate();
  const [range, setRange] = useState<DateFilter>({ key: "30d" });
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [view, setView] = useState<View>(null);
  const [collected, setCollected] = useState<Set<string>>(new Set());

  const all = useMemo<PaymentRow[]>(() => {
    const paid: Tagged = data.rows.find((r) => r.status.label === "Paid")?.status ?? {
      label: "Paid",
      tone: "ok",
    };
    return data.rows.map((p) => (collected.has(p.id) ? { ...p, status: paid } : p));
  }, [data.rows, collected]);

  // Top boxes follow the date range only — never the status filter or search.
  const inPeriod = all.filter((p) => inDateFilter(p.date, range));
  const total = (f: (p: PaymentRow) => boolean) =>
    `${formatMoney(inPeriod.filter(f).reduce((a, p) => a + p.amount, 0))}`;
  const summary = [
    { label: "Collected", value: total((p) => p.status.label === "Paid") },
    {
      label: "Cash on delivery due",
      value: total((p) => isCod(p) && p.status.label === "Unpaid"),
    },
    { label: "Refunded", value: total((p) => p.status.label === "Refunded") },
    ...data.summary,
  ];

  const rows = inPeriod.filter(
    (p) =>
      (!st || p.status.label === st) &&
      (!q || `${p.id} ${p.order} ${p.customer}`.toLowerCase().includes(q.toLowerCase())),
  );
  const cur = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const shown = rows.slice((cur - 1) * pageSize, cur * pageSize);

  const exportRows = () => {
    downloadCsv(
      `zelliny-payments-${rows.length}.csv`,
      ["Transaction", "Order", "Date", "Customer", "Method", "Status", "Amount (EGP)"],
      rows.map((p) => [p.id, p.order, p.date, p.customer, p.method, p.status.label, p.amount]),
    );
    toast.success(
      `Excel downloaded · ${rows.length} transaction${rows.length === 1 ? "" : "s"} · ${rangeLabel(range)}`,
    );
  };

  const openOrder = (id: string) => navigate({ to: "/orders/$orderId", params: { orderId: id } });
  const stop = (fn: () => void) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    fn();
  };

  const columns: Column<PaymentRow>[] = [
    { header: "Transaction", cell: (p) => <b className="font-medium">{p.id}</b> },
    {
      header: "Order",
      cell: (p) => (
        <span className={linkCls} onClick={stop(() => openOrder(p.order))}>
          {p.order}
        </span>
      ),
    },
    { header: "Date", cell: (p) => p.date },
    {
      header: "Customer",
      cell: (p) => (
        <span
          className={linkCls}
          onClick={stop(() => setView({ kind: "customer", id: p.customerId }))}
        >
          {p.customer}
        </span>
      ),
    },
    { header: "Method", cell: (p) => p.method },
    {
      header: "Status",
      cell: (p) => <StatusBadge tone={p.status.tone}>{p.status.label}</StatusBadge>,
    },
    {
      header: "Amount",
      align: "right",
      cell: (p) => <b className="font-medium">{formatMoney(p.amount)}</b>,
    },
  ];

  const tx = view?.kind === "tx" ? all.find((p) => p.id === view.id) : undefined;
  const custPays = view?.kind === "customer" ? all.filter((p) => p.customerId === view.id) : [];

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Every payment and refund. Card and wallet payments settle through Paymob."
        actions={
          <>
            <RangeTabs
              value={range}
              onChange={(v) => {
                setRange(v);
                setPage(1);
              }}
            />
            <Button onClick={exportRows}>Export</Button>
          </>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-[10px] border border-border bg-surface px-4 py-3">
            <div className="text-[12px] text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-head text-[20px]">
              {s.value.split(" – ")[0]}
              {s.value.includes(" – ") && (
                <span className="ml-1.5 font-body text-[13px] text-muted-foreground">
                  – {s.value.split(" – ")[1]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <Card>
        <FilterBar>
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Transaction, order or customer"
          />
          <FilterSelect
            value={st}
            onChange={(v) => {
              setSt(v);
              setPage(1);
            }}
            all="All statuses"
            options={["Paid", "Unpaid", "Refunded"]}
          />
        </FilterBar>
        <DataTable
          columns={columns}
          rows={shown}
          rowKey={(p) => p.id}
          empty="No payments in this period."
          onRowClick={(p) => setView({ kind: "tx", id: p.id })}
        />
        <Pager
          page={cur}
          pageSize={pageSize}
          total={rows.length}
          noun="transactions"
          onPage={setPage}
          onPageSize={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </Card>

      <Sheet open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[560px]">
          {tx && (
            <>
              <SheetHeader>
                <p className="text-[11px] uppercase tracking-[.18em] text-muted-foreground">
                  Transaction
                </p>
                <SheetTitle className="font-head text-[26px] font-normal">{tx.id}</SheetTitle>
                <div className="flex items-center gap-2 text-[13.5px] text-muted-foreground">
                  <StatusBadge tone={tx.status.tone}>{tx.status.label}</StatusBadge>
                  {tx.method}
                </div>
              </SheetHeader>
              <Section title="Amount">
                <span className="font-head text-[30px]">{formatMoney(tx.amount)}</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tx.status.label === "Unpaid" && isCod(tx) && (
                    <Button
                      primary
                      onClick={() => {
                        setCollected((s) => new Set(s).add(tx.id));
                        toast.success(`${tx.id} marked as collected`);
                      }}
                    >
                      Mark as collected
                    </Button>
                  )}
                  {tx.status.label === "Paid" && (
                    <Button onClick={() => toast.success("Receipt downloaded")}>
                      Download receipt
                    </Button>
                  )}
                  {tx.status.label === "Refunded" && (
                    <Button
                      onClick={() =>
                        tx.returnId
                          ? navigate({
                              to: "/returns/$returnId",
                              params: { returnId: tx.returnId },
                            })
                          : navigate({ to: "/$section", params: { section: "returns" } })
                      }
                    >
                      View return
                    </Button>
                  )}
                </div>
              </Section>
              <Section title="Details">
                <Kv k="Order">
                  <span className={linkCls} onClick={() => openOrder(tx.order)}>
                    {tx.order}
                  </span>
                </Kv>
                <Kv k="Customer">
                  <span
                    className={linkCls}
                    onClick={() => setView({ kind: "customer", id: tx.customerId })}
                  >
                    {tx.customer}
                  </span>
                </Kv>
                <Kv k="Date">{tx.date}</Kv>
                <Kv k="Method">{tx.method}</Kv>
                {isCod(tx) ? (
                  <Kv k="Courier">Bosta</Kv>
                ) : (
                  <Kv k="Paymob reference">PMB-{4410000 + Number(tx.id.replace(/\D/g, ""))}</Kv>
                )}
              </Section>
              <Section title="Money">
                <Kv k="Amount">{formatMoney(tx.amount)}</Kv>
                <Kv k={isCod(tx) ? "Courier COD fee" : "Paymob fee"}>
                  {formatMoney(money(tx).fee)}
                </Kv>
                <Kv k={tx.status.label === "Refunded" ? "Refunded" : "Net to Zelliny"}>
                  {formatMoney(tx.status.label === "Refunded" ? tx.amount : money(tx).net)}
                </Kv>
              </Section>
              <Section title="History">
                <ol>
                  {history(tx).map((h, i, a) => (
                    <li key={h.text} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < a.length - 1 && (
                        <span className="absolute bottom-0 left-[7px] top-[18px] w-px bg-border" />
                      )}
                      <span
                        className={cn(
                          "mt-0.5 size-4 flex-none rounded-full border-2",
                          h.done ? "border-primary bg-primary" : "border-border bg-background",
                        )}
                      />
                      <div>
                        <b className="block text-[13.5px] font-medium">{h.text}</b>
                        <small className="text-[12.5px] text-muted-foreground">{h.when}</small>
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>
            </>
          )}
          {view?.kind === "customer" && (
            <>
              <SheetHeader>
                <p className="text-[11px] uppercase tracking-[.18em] text-muted-foreground">
                  Customer
                </p>
                <SheetTitle className="font-head text-[26px] font-normal">
                  {custPays[0]?.customer ?? "Customer"}
                </SheetTitle>
                <p className="text-[13.5px] text-muted-foreground">
                  {custPays.length} payment{custPays.length === 1 ? "" : "s"} ·{" "}
                  {formatMoney(
                    custPays
                      .filter((p) => p.status.label === "Paid")
                      .reduce((a, p) => a + p.amount, 0),
                  )}{" "}
                  paid
                </p>
              </SheetHeader>
              <Section title="Payments">
                <table className="w-full text-[13.5px]">
                  <tbody>
                    {custPays.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => setView({ kind: "tx", id: p.id })}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-hover"
                      >
                        <td className="py-2.5 pr-2">{p.id}</td>
                        <td className="py-2.5 pr-2 text-muted-foreground">{p.date}</td>
                        <td className="py-2.5 pr-2">
                          <StatusBadge tone={p.status.tone}>{p.status.label}</StatusBadge>
                        </td>
                        <td className="py-2.5 text-right">{formatMoney(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
              <Section title="Profile">
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: view.id }}
                  className="text-[13.5px] underline underline-offset-[3px]"
                >
                  Open customer profile →
                </Link>
              </Section>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
