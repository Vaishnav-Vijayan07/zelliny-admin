import { Link } from "@tanstack/react-router";
import type { NeedsNowItem } from "@/lib/api/types";

export function NeedsNow({ items }: { items: NeedsNowItem[] }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-[13px] text-muted-foreground">Needs you now</p>
      <div className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-border bg-surface sm:grid-cols-3 lg:grid-cols-5">
        {items.map((i) => (
          <Link
            key={i.key}
            to="/$section"
            params={{ section: i.target }}
            className="border-b border-r border-border px-5 py-4 transition-colors last:border-r-0 hover:bg-hover lg:border-b-0"
          >
            <b className="block font-head text-[32px] font-normal leading-tight">{i.count}</b>
            <span className="mt-1 block text-[13.5px] font-medium">{i.label}</span>
            <em className="text-[12px] not-italic text-muted-foreground">{i.hint}</em>
          </Link>
        ))}
      </div>
    </div>
  );
}
