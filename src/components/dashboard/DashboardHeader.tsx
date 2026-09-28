import { cn } from "@/lib/utils";
import type { DateRange } from "@/lib/api/types";

const RANGES: DateRange[] = ["Today", "7d", "30d", "90d", "YTD"];

interface Props {
  name: string;
  dateLabel: string;
  liveVisitors: number;
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}

export function DashboardHeader({ name, dateLabel, liveVisitors, range, onRangeChange }: Props) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[36px] leading-tight">Good morning, {name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-4 text-muted-foreground">
          <span>{dateLabel}</span>
          <span className="flex items-center gap-2 text-foreground">
            <i className="size-2 animate-pulse rounded-full bg-good" />
            {liveVisitors} people on the site now
          </span>
        </p>
      </div>
      <div className="flex rounded-[10px] border border-border bg-surface p-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => onRangeChange(r)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground",
              r === range && "bg-primary text-primary-foreground hover:text-primary-foreground",
            )}
          >
            {r}
          </button>
        ))}
        <button className="rounded-lg px-3.5 py-1.5 text-[13px] text-muted-foreground hover:text-foreground">Custom</button>
      </div>
    </div>
  );
}
