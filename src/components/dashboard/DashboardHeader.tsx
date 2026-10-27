import { RangeTabs, type DateFilter } from "@/components/admin/DateRangeFilter";

interface Props {
  name: string;
  dateLabel: string;
  liveVisitors: number;
  filter: DateFilter;
  onFilterChange: (f: DateFilter) => void;
}

export function DashboardHeader({ name, dateLabel, liveVisitors, filter, onFilterChange }: Props) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[36px] leading-tight">Good morning, {name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-4 text-muted-foreground">
          <span>{dateLabel}</span>
          {/* <span className="flex items-center gap-2 text-foreground">
            <i className="size-2 animate-pulse rounded-full bg-good" />
            {liveVisitors} people on the site now
          </span> */}
        </p>
      </div>
      <RangeTabs value={filter} onChange={onFilterChange} />
    </div>
  );
}
