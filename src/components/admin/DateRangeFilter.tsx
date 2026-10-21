import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type RangeKey =
  | ""
  | "today"
  | "yesterday"
  | "week"
  | "7d"
  | "30d"
  | "90d"
  | "ytd"
  | "month"
  | "lastMonth"
  | "custom";

export interface DateFilter {
  key: RangeKey;
  from?: Date | undefined;
  to?: Date | undefined;
}

export const NO_DATE_FILTER: DateFilter = { key: "" };

const PRESETS: { key: Exclude<RangeKey, "" | "custom">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "lastMonth", label: "Last month" },
];

const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function presetRange(key: RangeKey): { from: Date; to: Date } | null {
  const today = day(new Date());
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const yd = new Date(y, m, today.getDate() - 1);
      return { from: yd, to: yd };
    }
    case "week":
      return { from: new Date(y, m, today.getDate() - ((today.getDay() + 6) % 7)), to: today };
    case "7d":
      return { from: new Date(y, m, today.getDate() - 6), to: today };
    case "30d":
      return { from: new Date(y, m, today.getDate() - 29), to: today };
    case "90d":
      return { from: new Date(y, m, today.getDate() - 89), to: today };
    case "ytd":
      return { from: new Date(y, 0, 1), to: today };
    case "month":
      return { from: new Date(y, m, 1), to: today };
    case "lastMonth":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0) };
    default:
      return null;
  }
}

/** Parses "24 Sep 2026" / "24 Sep 2026, 21:42"; relative text like "Today, just now" counts as today. */
export function parseOrderDate(s: string): Date {
  const m = /^(\d{1,2}) ([A-Za-z]{3,9}) (\d{4})/.exec(s);
  if (m) {
    const d = new Date(`${m[1]} ${m[2]} ${m[3]}`);
    if (!isNaN(d.getTime())) return day(d);
  }
  return day(new Date());
}

export function inDateFilter(dateText: string, f: DateFilter): boolean {
  if (!f.key) return true;
  const r = f.key === "custom" ? { from: f.from, to: f.to ?? f.from } : presetRange(f.key);
  if (!r?.from) return true;
  const d = parseOrderDate(dateText).getTime();
  return d >= day(r.from).getTime() && d <= day(r.to ?? r.from).getTime();
}

const EXTRA_PRESETS: { key: Exclude<RangeKey, "" | "custom">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "ytd", label: "Year to date" },
];

export function DateRangeFilter({
  value,
  onChange,
  allLabel = "All dates",
  extended,
  keys,
}: {
  /** Shows only these presets, in this order (overrides `extended`). */
  keys?: Exclude<RangeKey, "" | "custom">[];
  value: DateFilter;
  onChange: (v: DateFilter) => void;
  /** Text for "no date limit", e.g. "All time". */
  allLabel?: string;
  /** Offers this week, 90 days and year to date as well. */
  extended?: boolean;
}) {
  const presets = keys
    ? keys.map((k) => EXTRA_PRESETS.find((p) => p.key === k)!)
    : extended
      ? EXTRA_PRESETS
      : PRESETS;
  const [open, setOpen] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();

  const label = !value.key
    ? allLabel
    : value.key === "custom"
      ? value.from
        ? `${fmt(value.from)}${value.to ? ` – ${fmt(value.to)}` : ""}`
        : "Custom range"
      : (presets.find((p) => p.key === value.key)?.label ?? rangeLabel(value));

  const pick = (v: DateFilter) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setShowCal(value.key === "custom");
        if (o) setDraft(value.key === "custom" ? { from: value.from, to: value.to } : undefined);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-[13px]",
            value.key ? "border-primary" : "border-border",
          )}
        >
          <CalendarIcon className="size-3.5 text-muted-foreground" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-row flex-wrap gap-1 border-b border-border p-2 sm:w-[150px] sm:flex-col sm:border-b-0 sm:border-r">
            {[{ key: "" as const, label: allLabel }, ...presets].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => pick({ key: p.key })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-left text-[13px] hover:bg-hover",
                  value.key === p.key && "bg-hover font-medium",
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCal(true)}
              className={cn(
                "rounded-md px-3 py-1.5 text-left text-[13px] hover:bg-hover",
                (showCal || value.key === "custom") && "bg-hover font-medium",
              )}
            >
              Custom range
            </button>
          </div>
          {showCal && (
            <div>
              <Calendar
                mode="range"
                numberOfMonths={1}
                selected={draft}
                onSelect={setDraft}
                {...(draft?.from ? { defaultMonth: draft.from } : {})}
                disabled={{ after: new Date() }}
              />
              <div className="flex items-center justify-end gap-2 border-t border-border p-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 rounded-lg border border-border px-3 text-[12.5px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!draft?.from}
                  onClick={() => pick({ key: "custom", from: draft!.from, to: draft!.to })}
                  className="h-8 rounded-lg bg-primary px-3 text-[12.5px] text-primary-foreground disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const TABS: { key: "today" | "7d" | "30d" | "90d" | "ytd"; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "ytd", label: "YTD" },
];

/** Label for exports / toasts, e.g. "30d" or "3 Sep – 20 Sep". */
export function rangeLabel(f: DateFilter): string {
  if (f.key === "custom")
    return f.from ? `${fmt(f.from)}${f.to ? ` – ${fmt(f.to)}` : ""}` : "Custom";
  return TABS.find((t) => t.key === f.key)?.label ?? "All time";
}

/** Segmented Today · 7d · 30d · 90d · YTD · Custom control (same look as the Dashboard). */
export function RangeTabs({
  value,
  onChange,
  allTime,
}: {
  value: DateFilter;
  onChange: (v: DateFilter) => void;
  /** Adds an "All time" button in front (no date limit). */
  allTime?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const tab = "rounded-lg px-3.5 py-1.5 text-[13px] transition-colors";
  const off = "text-muted-foreground hover:text-foreground";
  const on = "bg-primary text-primary-foreground";
  const custom = value.key === "custom";
  return (
    <div className="flex rounded-[10px] border border-border bg-surface p-1">
      {allTime && (
        <button
          type="button"
          onClick={() => onChange(NO_DATE_FILTER)}
          className={cn(tab, "whitespace-nowrap", !value.key ? on : off)}
        >
          All time
        </button>
      )}
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange({ key: t.key })}
          className={cn(tab, value.key === t.key ? on : off)}
        >
          {t.label}
        </button>
      ))}
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setDraft(custom ? { from: value.from, to: value.to } : undefined);
        }}
      >
        <PopoverTrigger asChild>
          <button type="button" className={cn(tab, "whitespace-nowrap", custom ? on : off)}>
            {custom ? rangeLabel(value) : "Custom"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="range"
            numberOfMonths={1}
            selected={draft}
            onSelect={setDraft}
            {...(draft?.from ? { defaultMonth: draft.from } : {})}
            disabled={{ after: new Date() }}
          />
          <div className="flex items-center justify-end gap-2 border-t border-border p-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-8 rounded-lg border border-border px-3 text-[12.5px]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!draft?.from}
              onClick={() => {
                onChange({ key: "custom", from: draft!.from, to: draft!.to });
                setOpen(false);
              }}
              className="h-8 rounded-lg bg-primary px-3 text-[12.5px] text-primary-foreground disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
