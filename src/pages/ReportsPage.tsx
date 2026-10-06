import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { productsQuery, returnsQuery } from "@/lib/api/sections.functions";
import type { ProductRow } from "@/lib/api/section-types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusBadge, Thumb } from "@/components/admin/primitives";
import { BarList, Button, Card, PageHeader } from "@/components/admin/page";
import { LineChart } from "@/components/admin/LineChart";

const RANGES = ["Today", "7d", "30d", "90d", "YTD"] as const;
type Range = (typeof RANGES)[number];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const seeded = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const REV = [
  18200, 22400, 15800, 27600, 31200, 24900, 19400, 21700, 28900, 33400, 26100, 22800, 30600, 36200,
  29400, 24300, 27100, 34800, 39600, 31900, 26700, 29800, 35400, 41200, 37800, 30100, 33900, 42600,
  38700, 44850,
];
const ORD = [
  3, 4, 3, 5, 5, 4, 3, 4, 5, 6, 4, 4, 5, 6, 5, 4, 5, 6, 7, 5, 4, 5, 6, 7, 6, 5, 6, 7, 6, 7,
];
const DAYS = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 7, 26 + i);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
});
const FULL_YEAR_REVENUE = 907350;

interface Period {
  label: string;
  vs: string;
  labels: string[];
  rev: number[];
  ord: number[];
  orders: number;
  conv: number;
  visitors: number;
  refunds: number;
  refundN: number;
  returns: number;
  d: string[];
  mix: number[];
  status: [string, number][];
  newCust: number;
}
function period(r: Range): Period {
  if (r === "Today") {
    const w = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.7, 1.1, 1.6, 1.2, 0.9, 1.3, 1.8, 1.2, 1.5, 2.2, 2.6, 1.9,
      ],
      tw = sum(w);
    const rev = w.map((x) => Math.round((44850 * x) / tw / 50) * 50);
    rev[21]! += 44850 - sum(rev);
    return {
      label: "today",
      vs: "vs same time yesterday",
      labels: w.map((_, i) => `${String(i).padStart(2, "0")}:00`),
      rev,
      ord: w.map((x) => Math.round(((x * 7) / tw) * 10) / 10),
      orders: 7,
      conv: 2.4,
      visitors: 1180,
      refunds: 0,
      refundN: 0,
      returns: 0,
      d: ["+12.6%", "+16.7%", "−3.5%", "+0.2 pt"],
      mix: [57, 14, 29],
      status: [
        ["Delivered", 0],
        ["Shipped", 0],
        ["Processing", 4],
        ["Cancelled", 0],
        ["Returned", 0],
      ],
      newCust: 3,
    };
  }
  if (r === "7d")
    return {
      label: "last 7 days",
      vs: "vs previous 7 days",
      labels: DAYS.slice(-7),
      rev: REV.slice(-7),
      ord: ORD.slice(-7),
      orders: sum(ORD.slice(-7)),
      conv: 2.3,
      visitors: 7420,
      refunds: 8400,
      refundN: 1,
      returns: 3,
      d: ["+22.1%", "+15.4%", "+5.8%", "+0.4 pt"],
      mix: [60, 18, 22],
      status: [
        ["Delivered", 17],
        ["Shipped", 9],
        ["Processing", 8],
        ["Cancelled", 1],
        ["Returned", 1],
      ],
      newCust: 22,
    };
  if (r === "30d")
    return {
      label: "last 30 days",
      vs: "vs previous 30 days",
      labels: DAYS,
      rev: REV,
      ord: ORD,
      orders: sum(ORD),
      conv: 2.1,
      visitors: 28410,
      refunds: 14500,
      refundN: 2,
      returns: 5,
      d: ["+18.4%", "+12.1%", "+5.6%", "+0.3 pt"],
      mix: [61, 17, 22],
      status: [
        ["Delivered", 118],
        ["Shipped", 14],
        ["Processing", 9],
        ["Cancelled", 6],
        ["Returned", 7],
      ],
      newCust: 94,
    };
  if (r === "90d") {
    const rnd = seeded(41),
      labels: string[] = [],
      rev: number[] = [],
      ord: number[] = [];
    for (let i = 0; i < 90; i++) {
      const d = new Date(2026, 5, 27 + i);
      labels.push(`${d.getDate()} ${MON[d.getMonth()]}`);
      const v =
        Math.round((17000 + i * 210 + (d.getDay() === 5 ? 6000 : 0) + rnd() * 9000) / 50) * 50;
      rev.push(v);
      ord.push(Math.max(2, Math.round(v / 5900)));
    }
    for (let i = 0; i < 30; i++) {
      rev[60 + i] = REV[i]!;
      ord[60 + i] = ORD[i]!;
    }
    return {
      label: "last 90 days",
      vs: "vs previous 90 days",
      labels,
      rev,
      ord,
      orders: sum(ord),
      conv: 1.9,
      visitors: 79650,
      refunds: 38950,
      refundN: 6,
      returns: 13,
      d: ["+31.2%", "+26.8%", "+3.5%", "+0.2 pt"],
      mix: [62, 16, 22],
      status: [
        ["Delivered", 371],
        ["Shipped", 14],
        ["Processing", 9],
        ["Cancelled", 17],
        ["Returned", 13],
      ],
      newCust: 260,
    };
  }
  const rev = [312400, 288900, 401200, 356700, 378300, 449100, 612800, 803600, 907350],
    ord = rev.map((v) => Math.round(v / 6100));
  return {
    label: "year to date",
    vs: "vs same period last year",
    labels: MON.slice(0, 9).map((m) => `${m} 2026`),
    rev,
    ord,
    orders: sum(ord),
    conv: 1.8,
    visitors: 402300,
    refunds: 121300,
    refundN: 19,
    returns: 41,
    d: ["+64.0%", "+58.3%", "+3.6%", "+0.5 pt"],
    mix: [59, 15, 26],
    status: [
      ["Delivered", 720],
      ["Shipped", 14],
      ["Processing", 9],
      ["Cancelled", 48],
      ["Returned", 41],
    ],
    newCust: 880,
  };
}

const unit = (p: ProductRow) => p.offer ?? p.price ?? 0;
const tone = (s: string): "ok" | "info" | "warn" | "bad" | "mute" =>
  (
    ({
      Delivered: "ok",
      Shipped: "info",
      Processing: "info",
      Cancelled: "mute",
      Returned: "mute",
    }) as const
  )[s as "Delivered"] ?? "mute";

function Rank({ rows, unitLabel }: { rows: { p: ProductRow; n: number }[]; unitLabel: string }) {
  return (
    <div className="flex flex-col">
      {rows.map((x, i) => (
        <Link
          key={x.p.id}
          to="/products/$productId"
          params={{ productId: x.p.id }}
          className="flex items-center gap-3 border-b border-line-soft py-2.5 text-[13px] last:border-0 hover:[&_b]:underline"
        >
          <span className="w-[18px] text-[12px] text-muted-foreground">{i + 1}</span>
          <Thumb color={x.p.color} className="size-9" />
          <div className="min-w-0 flex-1">
            <b className="block truncate font-medium">{x.p.name}</b>
            <span className="text-[11.5px] text-muted-foreground">{x.p.brand}</span>
          </div>
          <div className="text-right">
            <b className="block font-medium">{formatNumber(x.n)}</b>
            <span className="text-[11px] text-muted-foreground">{unitLabel}</span>
          </div>
        </Link>
      ))}
      {!rows.length && (
        <p className="py-6 text-center text-[13px] text-muted-foreground">
          Nothing in this period.
        </p>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { data: prods } = useSuspenseQuery(productsQuery());
  const { data: rets } = useSuspenseQuery(returnsQuery());
  const [range, setRange] = useState<Range>("30d");
  const d = useMemo(() => period(range), [range]);
  const total = sum(d.rev),
    f = total / FULL_YEAR_REVENUE,
    aov = Math.round(total / Math.max(d.orders, 1));

  /* sales split by category / maison — each product's sold × price, scaled so the split adds up to the revenue above */
  const split = (key: "category" | "brand") => {
    const m = new Map<string, { rev: number; enq: number }>();
    prods.rows.forEach((p) => {
      const k = p[key];
      const o = m.get(k) ?? { rev: 0, enq: 0 };
      o.rev += p.price ? p.sold * unit(p) : 0;
      o.enq += p.enquiries;
      m.set(k, o);
    });
    const raw = sum([...m.values()].map((v) => v.rev)) || 1;
    return [...m.entries()]
      .map(([name, v]) => ({
        name,
        rev: Math.round(((v.rev / raw) * total) / 50) * 50,
        enq: Math.max(0, Math.round(v.enq * Math.max(f, 0.14))),
      }))
      .sort((a, b) => b.rev - a.rev || b.enq - a.enq);
  };
  const byCat = split("category"),
    byBrand = split("brand").slice(0, 8);
  const bar = (r: { name: string; rev: number; enq: number }) => ({
    label: r.name,
    value: r.rev || 0,
  });

  const best = prods.rows
    .filter((p) => p.price && p.sold)
    .map((p) => ({ p, n: Math.max(1, Math.round(p.sold * Math.max(f, 0.05))) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);
  const enq = prods.rows
    .filter((p) => p.enquiries)
    .map((p) => ({ p, n: Math.max(1, Math.round(p.enquiries * Math.max(f, 0.14))) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);
  const retRows = range === "Today" ? [] : rets.rows.slice(0, range === "7d" ? 3 : 4);

  const kpis: [string, string, string][] = [
    ["Revenue", `${formatNumber(total)} EGP`, d.d[0]!],
    ["Orders", formatNumber(d.orders), d.d[1]!],
    ["Average order", `${formatNumber(aov)} EGP`, d.d[2]!],
    ["Conversion", `${d.conv}%`, d.d[3]!],
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={
          <>
            Sales, products, customers and enquiries ·{" "}
            <b className="font-semibold text-foreground">{d.label}</b>.
          </>
        }
        actions={
          <>
            <div className="inline-flex rounded-lg border border-border bg-surface p-[3px]">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded-md px-3 py-1 text-[12.5px]",
                    r === range ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <Button primary onClick={() => toast(`Report for ${d.label} downloaded · Excel`)}>
              Download Excel
            </Button>
          </>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([l, v, delta = ""]) => (
          <div key={l} className="rounded-[10px] border border-border bg-surface px-4 py-3">
            <div className="text-[12px] text-muted-foreground">{l}</div>
            <div className="mt-1 font-head text-[22px]">{v}</div>
            <div className={cn("text-[12px]", delta.startsWith("−") ? "text-bad" : "text-good")}>
              {delta} <span className="text-muted-foreground">{d.vs}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-[15px]">Revenue</h3>
          <LineChart values={d.rev} labels={d.labels} />
        </Card>
        <Card>
          <h3 className="mb-3 text-[15px]">Orders</h3>
          <LineChart values={d.ord} labels={d.labels} unit="orders" />
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-[15px]">Sales by category</h3>
          <BarList items={byCat.filter((r) => r.rev).map(bar)} />
          {byCat.some((r) => !r.rev) && (
            <p className="mt-3 text-[12px] text-muted-foreground">
              {byCat
                .filter((r) => !r.rev)
                .map((r) => r.name)
                .join(", ")}{" "}
              sell by enquiry — see Most enquired.
            </p>
          )}
        </Card>
        <Card>
          <h3 className="mb-3 text-[15px]">Sales by maison</h3>
          <BarList items={byBrand.filter((r) => r.rev).map(bar)} />
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-[15px]">Customers</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
            {[
              ["New customers", formatNumber(d.newCust)],
              ["Returning rate", "31%"],
              ["Top city", "New Cairo"],
              ["Visitors", formatNumber(d.visitors)],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <h3 className="mb-3 text-[15px]">Payment mix · {d.label}</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
            {[
              ["Paymob · Card", d.mix[0]],
              ["Paymob · Wallet", d.mix[1]],
              ["Cash on Delivery", d.mix[2]],
            ].map(([k, v]) => (
              <div key={k as string} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right">{v}%</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2 text-[15px]">Best sellers · {d.label}</h3>
          <Rank rows={best} unitLabel="sold" />
        </Card>
        <Card>
          <h3 className="mb-2 text-[15px]">Most enquired · {d.label}</h3>
          <Rank rows={enq} unitLabel="enquiries" />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-[15px]">Returns & refunds · {d.label}</h3>
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border text-center">
            {[
              [d.returns, "returns"],
              [formatNumber(d.refunds), "EGP refunded"],
              [`${d.orders ? ((d.returns / d.orders) * 100).toFixed(1) : "0.0"}%`, "return rate"],
            ].map(([v, l], i) => (
              <div key={l as string} className={cn("px-2 py-2.5", i && "border-l border-border")}>
                <b className="block font-head text-[20px] font-normal">{v}</b>
                <span className="text-[11px] text-muted-foreground">{l}</span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            {retRows.map((r) => (
              <Link
                key={r.id}
                to="/returns/$returnId"
                params={{ returnId: r.id }}
                className="flex items-center gap-3 border-b border-line-soft py-2.5 text-[13px] last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <b className="block truncate font-medium">
                    {r.id} · {r.item}
                  </b>
                  <span className="text-[11.5px] text-muted-foreground">{r.reason}</span>
                </div>
                <StatusBadge tone={r.status.tone}>{r.status.label}</StatusBadge>
              </Link>
            ))}
            {!retRows.length && (
              <p className="py-4 text-center text-[13px] text-muted-foreground">
                No returns in this period.
              </p>
            )}
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-[15px]">Order status · {d.label}</h3>
          <div className="flex flex-col gap-2.5 text-[13px]">
            {d.status.map(([s, n]) => (
              <div key={s} className="flex items-center justify-between">
                <StatusBadge tone={tone(s)}>{s}</StatusBadge>
                <b className="font-medium">{formatNumber(n)}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
