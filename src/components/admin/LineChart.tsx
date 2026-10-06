import { useState } from "react";
import { formatNumber } from "@/lib/format";

/** Simple line + area chart with a hover read-out. */
export function LineChart({
  values,
  labels,
  unit = "EGP",
}: {
  values: number[];
  labels: string[];
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720,
    H = 220,
    pl = 48,
    pr = 12,
    pt = 14,
    pb = 26;
  const n = values.length,
    max = Math.max(...values, 1) * 1.12;
  const x = (i: number) => (n > 1 ? pl + ((W - pl - pr) * i) / (n - 1) : W / 2);
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / max);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const tick = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));
  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(n - 1, Math.round(((px - pl) / (W - pl - pr)) * (n - 1)))));
        }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={pl} x2={W - pr} y1={y(max * t)} y2={y(max * t)} stroke="var(--line-soft)" />
            <text
              x={pl - 8}
              y={y(max * t) + 4}
              textAnchor="end"
              fontSize="10.5"
              fill="var(--muted-foreground)"
            >
              {tick(max * t)}
            </text>
          </g>
        ))}
        <polygon
          points={`${pl},${y(0)} ${pts} ${W - pr},${y(0)}`}
          fill="var(--primary)"
          opacity=".06"
        />
        <polyline
          points={pts}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {labels.map((l, i) =>
          (i % Math.max(1, Math.round(n / 6)) === 0 && n - 1 - i >= 3) || i === n - 1 ? (
            <text
              key={i}
              x={x(i)}
              y={H - 6}
              textAnchor="middle"
              fontSize="10.5"
              fill="var(--muted-foreground)"
            >
              {l}
            </text>
          ) : null,
        )}
        {hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={pt}
              y2={H - pb}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
            />
            <circle
              cx={x(hover)}
              cy={y(values[hover]!)}
              r="5"
              fill="var(--surface)"
              stroke="var(--primary)"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-md bg-primary px-2.5 py-1.5 text-[12px] text-primary-foreground"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(values[hover]!) / H) * 100}%` }}
        >
          {labels[hover]} · {formatNumber(values[hover]!)} {unit}
        </div>
      )}
    </div>
  );
}
