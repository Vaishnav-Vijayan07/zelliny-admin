import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/admin/page";
import { rangeLabel, type DateFilter } from "@/components/admin/DateRangeFilter";
import { cn } from "@/lib/utils";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "ytd", label: "YTD" },
] as const;

/** Asks which period to export before downloading. `count` shows how many rows that period holds. */
export function ExportRangeDialog({
  open,
  onClose,
  onExport,
  count,
  noun = "rows",
}: {
  open: boolean;
  onClose: () => void;
  onExport: (f: DateFilter) => void;
  count: (f: DateFilter) => number;
  noun?: string;
}) {
  const [filter, setFilter] = useState<DateFilter>({ key: "30d" });
  const [draft, setDraft] = useState<DateRange | undefined>();
  const custom = filter.key === "custom";
  const ready = !custom || !!filter.from;
  const n = ready ? count(filter) : 0;
  const tab = "rounded-lg px-3.5 py-1.5 text-[13px] transition-colors";
  const on = "bg-primary text-primary-foreground";
  const off = "text-muted-foreground hover:text-foreground";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Export — choose a date range</DialogTitle>
        <DialogDescription>
          Everyone in the period is downloaded, not just the rows on screen.
        </DialogDescription>
        <div className="flex flex-wrap rounded-[10px] border border-border bg-surface p-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setFilter({ key: p.key })}
              className={cn(tab, filter.key === p.key ? on : off)}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilter({ key: "custom", from: draft?.from, to: draft?.to })}
            className={cn(tab, custom ? on : off)}
          >
            {custom && filter.from ? rangeLabel(filter) : "Custom"}
          </button>
        </div>
        {custom && (
          <div className="flex justify-center rounded-lg border border-border">
            <Calendar
              mode="range"
              numberOfMonths={1}
              selected={draft}
              onSelect={(r) => {
                setDraft(r);
                setFilter({ key: "custom", from: r?.from, to: r?.to });
              }}
              disabled={{ after: new Date() }}
            />
          </div>
        )}
        <p className="text-[13px] text-muted-foreground">
          {ready ? (
            <>
              <b className="font-medium text-foreground">{n}</b> {n === 1 ? noun.replace(/s$/, "") : noun}{" "}
              in this period
            </>
          ) : (
            "Pick a start date (and an end date) on the calendar."
          )}
        </p>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            primary
            onClick={() => {
              if (!ready) return;
              onExport(filter);
              onClose();
            }}
          >
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
