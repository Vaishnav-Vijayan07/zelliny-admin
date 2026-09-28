import type { RankedList } from "@/lib/api/types";
import { Panel, PanelFooter, SectionLink, StatusBadge, Thumb } from "@/components/admin/primitives";

export function RankedListCard({ list, to }: { list: RankedList; to: string }) {
  return (
    <Panel title={list.title} action={<SectionLink to={to}>View all {list.total}</SectionLink>}>
      <ul>
        {list.items.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 border-b border-line-soft py-2.5">
            {list.numbered && <span className="w-4 text-[12px] text-muted-foreground">{i + 1}</span>}
            <Thumb color={p.color} />
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[13.5px] font-medium">{p.name}</b>
              <span className="text-[12px] text-muted-foreground">{p.subtitle}</span>
            </div>
            {p.badge && <StatusBadge tone={p.badge.tone} dot={false}>{p.badge.label}</StatusBadge>}
            <div className="text-right leading-tight">
              <b className="block text-[13.5px] font-medium">{p.value}</b>
              {p.unit && <span className="text-[11.5px] text-muted-foreground">{p.unit}</span>}
            </div>
          </li>
        ))}
      </ul>
      <PanelFooter count={list.more} label={list.moreLabel} to={to} />
    </Panel>
  );
}
