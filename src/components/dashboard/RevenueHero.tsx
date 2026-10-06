import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { RevenueSummary } from "@/lib/api/types";
import { formatMoney, formatNumber } from "@/lib/format";

function Sparkline({ series }: { series: RevenueSummary["series"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const { points, max } = useMemo(() => {
    const max = Math.max(...series.map((s) => s.value)) * 1.15;
    const step = 1000 / Math.max(series.length - 1, 1);
    return { max, points: series.map((s, i) => [i * step, 80 - (s.value / max) * 80] as const) };
  }, [series]);
  const line = points
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const active = hover ?? series.length - 1;
  const [ax, ay] = points[active] ?? [0, 0];
  const ticks = [0, 7, 15, 22, series.length - 1].filter((i) => i < series.length);

  return (
    <div>
      <div
        className="relative mt-5 h-20"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.round(((e.clientX - r.left) / r.width) * (series.length - 1)));
        }}
      >
        <svg viewBox="0 0 1000 80" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="rev-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--gold)" stopOpacity=".28" />
              <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L1000 80 L0 80 Z`} fill="url(#rev-g)" />
          <path
            d={line}
            fill="none"
            stroke="var(--gold)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold ring-4 ring-gold/20"
          style={{ left: `${ax / 10}%`, top: `${(ay / 80) * 100}%` }}
        />
        {hover != null && (
          <div
            className="pointer-events-none absolute -top-9 -translate-x-1/2 whitespace-nowrap rounded-md bg-surface px-2 py-1 text-[11px] text-foreground"
            style={{ left: `${ax / 10}%` }}
          >
            {series[active]?.label} · {formatNumber(series[active]?.value ?? 0)} EGP
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-hero-muted">
        {ticks.map((i) => (
          <span key={i}>{series[i]?.label}</span>
        ))}
      </div>
      <span className="sr-only">Peak {formatNumber(Math.round(max))}</span>
    </div>
  );
}

export function RevenueHero({ data }: { data: RevenueSummary }) {
  return (
    <section className="mb-5 rounded-[10px] bg-hero px-6 py-5 text-hero-foreground">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="text-[12px] text-hero-muted">{data.label}</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <b className="font-head text-[34px] font-normal">
              {formatNumber(data.total)}
              <small className="ml-1.5 text-sm text-hero-muted">{data.currency}</small>
            </b>
            <span className="text-[12.5px] text-gold">
              {data.delta} <span className="text-hero-muted">{data.comparison}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-0">
          {data.metrics.map((m) => (
            <div key={m.label} className="border-l border-hero-foreground/15 px-5">
              <span className="block text-[11.5px] text-hero-muted">{m.label}</span>
              <b className="font-head text-lg font-normal">{m.value}</b>
              <em className="ml-1.5 text-[11px] not-italic text-gold">{m.delta}</em>
            </div>
          ))}
          <Link
            to="/$section"
            params={{ section: "reports" }}
            className="ml-4 rounded-full border border-hero-foreground/25 px-4 py-2 text-[12.5px] hover:border-hero-foreground"
          >
            Full reports
          </Link>
        </div>
      </div>
      <Sparkline series={data.series} />
      <span className="sr-only">{formatMoney(data.total, data.currency)}</span>
    </section>
  );
}
