import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ordersQuery } from "@/lib/api/sections.functions";
import type { OrderRow } from "@/lib/api/section-types";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/admin/primitives";
import { Button, Card, DataTable, FilterBar, FilterSelect, Muted, PageHeader, SearchInput, TileRow, type Column } from "@/components/admin/page";
import { soon } from "@/hooks/use-toast-lite";

const columns: Column<OrderRow>[] = [
  { header: "Order", cell: (o) => <><b className="font-medium">{o.id}</b><Muted>{o.itemCount} item{o.itemCount > 1 ? "s" : ""}</Muted></> },
  { header: "Date", cell: (o) => o.date },
  { header: "Customer", cell: (o) => <>{o.customer}<Muted>{o.zone}</Muted></> },
  { header: "Payment", cell: (o) => <>{o.payment}<div className="mt-1"><StatusBadge tone={o.payStatus.tone}>{o.payStatus.label}</StatusBadge></div></> },
  { header: "Fulfilment", cell: (o) => (o.fulfilment === "Appointment" ? "By appointment" : o.fulfilment) },
  { header: "Status", cell: (o) => <StatusBadge tone={o.status.tone}>{o.status.label}</StatusBadge> },
  { header: "Total", align: "right", cell: (o) => <b className="font-medium">{formatMoney(o.total)}</b> },
];

export default function OrdersPage() {
  const { data } = useSuspenseQuery(ordersQuery());
  const [tile, setTile] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pay, setPay] = useState("");
  const rows = data.rows.filter(
    (o) => (!tile || o.status.label === tile) && (!pay || o.payment === pay) && (!q || `${o.id} ${o.customer}`.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Every order, website and manual. Open an order to move it on, or filter by stage."
        actions={<><Button onClick={soon("Export")}>Export</Button><Button primary onClick={soon("Manual order")}>Create manual order</Button></>}
      />
      <TileRow tiles={data.tiles} active={tile} onSelect={setTile} />
      <Card>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Order number or customer" />
          <FilterSelect value={pay} onChange={setPay} all="All payment methods" options={[...new Set(data.rows.map((r) => r.payment))]} />
        </FilterBar>
        <DataTable columns={columns} rows={rows} rowKey={(o) => o.id} empty="No orders match these filters" />
      </Card>
    </>
  );
}
