import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { returnsQuery } from "@/lib/api/sections.functions";
import type { ReturnRow } from "@/lib/api/section-types";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/admin/primitives";
import { Card, DataTable, FilterBar, Muted, PageHeader, SearchInput, TileRow, type Column } from "@/components/admin/page";

const columns: Column<ReturnRow>[] = [
  { header: "Return", cell: (r) => <><b className="font-medium">{r.id}</b><Muted>{r.order}</Muted></> },
  { header: "Date", cell: (r) => r.date },
  { header: "Customer", cell: (r) => r.customer },
  { header: "Item", cell: (r) => r.item },
  { header: "Reason", cell: (r) => <>{r.reason}<Muted>{r.rule}</Muted></> },
  { header: "Status", cell: (r) => <StatusBadge tone={r.status.tone}>{r.status.label}</StatusBadge> },
  { header: "Amount", align: "right", cell: (r) => <b className="font-medium">{formatMoney(r.amount)}</b> },
];

export default function ReturnsPage() {
  const { data } = useSuspenseQuery(returnsQuery());
  const [tile, setTile] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const rows = data.rows.filter((r) => (!tile || r.status.label === tile) && (!q || `${r.id} ${r.order} ${r.customer}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHeader title="Returns & refunds" subtitle="Requests come in from customers. Inspect the item, then approve and refund to the original payment method." />
      <TileRow tiles={data.tiles} active={tile} onSelect={setTile} />
      <Card>
        <FilterBar><SearchInput value={q} onChange={setQ} placeholder="Return, order or customer" /></FilterBar>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} empty="No returns match" />
      </Card>
    </>
  );
}
