import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { enquiriesQuery } from "@/lib/api/sections.functions";
import type { EnquiryRow } from "@/lib/api/section-types";
import { StatusBadge } from "@/components/admin/primitives";
import { Card, DataTable, FilterBar, Muted, PageHeader, SearchInput, TileRow, type Column } from "@/components/admin/page";

const columns: Column<EnquiryRow>[] = [
  { header: "Enquiry", cell: (e) => <><b className="font-medium">{e.id}</b><Muted>{e.date}</Muted></> },
  { header: "Company", cell: (e) => <>{e.company}<Muted>{e.contact} · {e.email}</Muted></> },
  { header: "Request", cell: (e) => <>{e.items} × {e.qty}<Muted>{e.branding} · {e.pillar}</Muted></> },
  { header: "Source", cell: (e) => <span className="text-muted-foreground">{e.source}</span> },
  { header: "Owner", cell: (e) => e.owner },
  { header: "Stage", cell: (e) => <StatusBadge tone={e.stage.tone}>{e.stage.label}</StatusBadge> },
];

export default function EnquiriesPage() {
  const { data } = useSuspenseQuery(enquiriesQuery());
  const [tile, setTile] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const rows = data.rows.filter((e) => (!tile || e.stage.label === tile) && (!q || `${e.id} ${e.company} ${e.contact}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHeader title="Corporate enquiries" subtitle="Bulk and branded gifting requests. Contact new enquiries within a working day." />
      <TileRow tiles={data.tiles} active={tile} onSelect={setTile} />
      <Card>
        <FilterBar><SearchInput value={q} onChange={setQ} placeholder="Company, contact or enquiry number" /></FilterBar>
        <DataTable columns={columns} rows={rows} rowKey={(e) => e.id} />
      </Card>
    </>
  );
}
