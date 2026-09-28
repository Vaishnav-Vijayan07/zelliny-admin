import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { inventoryQuery } from "@/lib/api/sections.functions";
import type { InventoryRow } from "@/lib/api/section-types";
import { StatusBadge, Thumb } from "@/components/admin/primitives";
import { Card, DataTable, FilterBar, Muted, PageHeader, SearchInput, TileRow, type Column } from "@/components/admin/page";

const columns: Column<InventoryRow>[] = [
  { header: "Product", cell: (p) => <div className="flex items-center gap-3"><Thumb color={p.color} /><div><b className="font-medium">{p.name}</b><Muted>{p.sku} · {p.brand}</Muted></div></div> },
  { header: "State", cell: (p) => <StatusBadge tone={p.state.tone}>{p.state.label}</StatusBadge> },
  { header: "Sold · 30d", align: "right", cell: (p) => p.sold },
  { header: "In stock", align: "right", cell: (p) => <b className="font-medium">{p.stock}</b> },
];

export default function InventoryPage() {
  const { data } = useSuspenseQuery(inventoryQuery());
  const [tile, setTile] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const rows = data.rows.filter((r) => (!tile || tile === "all" || r.state.label === tile) && (!q || `${r.name} ${r.sku}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHeader title="Inventory" subtitle="What's on the shelf. Products at 10 units or fewer are flagged as low." />
      <TileRow tiles={data.tiles} active={tile} onSelect={setTile} />
      <Card>
        <FilterBar><SearchInput value={q} onChange={setQ} placeholder="Product name or SKU" /></FilterBar>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
      </Card>
    </>
  );
}
