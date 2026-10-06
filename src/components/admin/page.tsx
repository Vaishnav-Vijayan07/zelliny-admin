// Reusable building blocks for every admin list/settings screen.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tile, SettingsGroup } from "@/lib/api/section-types";
import { StatusBadge, Panel } from "./primitives";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-[28px] leading-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[13.5px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Button({
  primary,
  children,
  onClick,
}: {
  primary?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-4 py-2 text-[13px] transition-colors",
        primary
          ? "border-primary bg-primary text-primary-foreground hover:opacity-90"
          : "border-border bg-surface hover:bg-hover",
      )}
    >
      {children}
    </button>
  );
}

export function TileRow({
  tiles,
  active,
  onSelect,
}: {
  tiles: Tile[];
  active?: string | null;
  onSelect?: (key: string | null) => void;
}) {
  return (
    <div
      className="mb-5 grid gap-3"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))` }}
    >
      {tiles.map((t) => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onSelect?.(on ? null : t.key)}
            className={cn(
              "rounded-[10px] border bg-surface px-4 py-3 text-left transition-colors hover:bg-hover",
              on ? "border-primary ring-1 ring-primary" : "border-border",
            )}
          >
            <b className="block font-head text-[24px] font-normal">{t.count}</b>
            <span className="text-[13px]">{t.label}</span>
            {t.hint && (
              <em className="block text-[11.5px] not-italic text-muted-foreground">{t.hint}</em>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 min-w-[220px] flex-1 rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary"
    />
  );
}

export function FilterSelect({
  value,
  onChange,
  all,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  all: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-border bg-background px-3 text-[13px]"
    >
      <option value="">{all}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>;
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: "right";
  className?: string;
  /** Rendered instead of the header text (e.g. a select-all checkbox). */ headerNode?: ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = "Nothing to show",
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (r: T) => string;
  empty?: string;
  onRowClick?: (r: T) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-[.12em] text-muted-foreground">
            {columns.map((c) => (
              <th
                key={c.header}
                className={cn("px-3 py-2.5 font-normal", c.align === "right" && "text-right")}
              >
                {c.headerNode ?? c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={cn(
                  "border-b border-line-soft last:border-0 hover:bg-hover",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.header}
                    className={cn(
                      "px-3 py-3 align-top",
                      c.align === "right" && "text-right",
                      c.className,
                    )}
                  >
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn("mb-5 min-w-0 rounded-[10px] border border-border bg-surface p-4", className)}
    >
      {children}
    </section>
  );
}

export const Muted = ({ children }: { children: ReactNode }) => (
  <div className="text-[12px] text-muted-foreground">{children}</div>
);

export function SettingsGroups({ groups }: { groups: SettingsGroup[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {groups.map((g) => (
        <Panel key={g.title} title={g.title}>
          {g.description && (
            <p className="mb-3 text-[12.5px] text-muted-foreground">{g.description}</p>
          )}
          <dl className="divide-y divide-line-soft">
            {g.rows.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between gap-4 py-2.5 text-[13px]"
              >
                <dt>{r.label}</dt>
                <dd className="text-right">
                  {r.tone ? (
                    <StatusBadge tone={r.tone}>{r.value}</StatusBadge>
                  ) : (
                    <span className="text-muted-foreground">{r.value}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      ))}
    </div>
  );
}

export function BarList({
  items,
  unit = "EGP",
}: {
  items: { label: string; value: number }[];
  unit?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.label} className="text-[13px]">
          <div className="mb-1 flex justify-between">
            <span>{i.label}</span>
            <span className="text-muted-foreground">
              {i.value.toLocaleString("en-US")} {unit}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(i.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Numbered pages under a long list (prototype `.pager`). */
export function Pager({
  page,
  pageSize,
  total,
  noun,
  onPage,
  onPageSize,
  sizes = [10, 25, 50, 100],
}: {
  page: number;
  pageSize: number;
  total: number;
  noun: string;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
  sizes?: number[];
}) {
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize;
  const nums: (number | "…")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  const btn =
    "h-9 min-w-9 rounded-lg border border-border bg-surface px-2.5 text-[13px] text-foreground enabled:hover:border-primary disabled:cursor-default disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-1 pb-0.5 pt-4 text-[13px] text-muted-foreground">
      <span>
        Showing{" "}
        <b className="font-semibold text-foreground">
          {(from + 1).toLocaleString("en-US")}–
          {Math.min(from + pageSize, total).toLocaleString("en-US")}
        </b>{" "}
        of <b className="font-semibold text-foreground">{total.toLocaleString("en-US")}</b> {noun}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={btn}
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
        >
          ‹ Previous
        </button>
        {nums.map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`}>…</span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              className={cn(btn, n === page && "border-primary bg-primary text-primary-foreground")}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          className={btn}
          disabled={page === pages}
          onClick={() => onPage(page + 1)}
        >
          Next ›
        </button>
      </div>
      <label>
        Rows per page
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="ml-1.5 h-9 rounded-lg border border-border bg-surface px-2.5 text-[13px] text-foreground"
        >
          {sizes.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
