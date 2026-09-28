import { useSuspenseQuery } from "@tanstack/react-query";
import { discountsQuery } from "@/lib/api/sections.functions";
import type { DiscountRow } from "@/lib/api/section-types";
import { StatusBadge } from "@/components/admin/primitives";
import { Button, Card, DataTable, Muted, PageHeader, type Column } from "@/components/admin/page";
import { soon } from "@/hooks/use-toast-lite";

const columns: Column<DiscountRow>[] = [
  { header: "Code", cell: (d) => <><b className="font-medium tracking-wider">{d.code}</b><Muted>{d.type}</Muted></> },
  { header: "Value", cell: (d) => d.value },
  { header: "Applies to", cell: (d) => <>{d.scope}<Muted>Min. {d.min}</Muted></> },
  { header: "Dates", cell: (d) => d.dates },
  { header: "Uses", align: "right", cell: (d) => d.uses },
  { header: "Status", cell: (d) => <StatusBadge tone={d.status.tone}>{d.status.label}</StatusBadge> },
];

export default function DiscountsPage() {
  const { data } = useSuspenseQuery(discountsQuery());
  return (
    <>
      <PageHeader title="Discounts & offers" subtitle="Promo codes and automatic offers. Enquiry-only products are always excluded." actions={<Button primary onClick={soon("Create discount")}>+ Create discount</Button>} />
      <Card><DataTable columns={columns} rows={data} rowKey={(d) => d.code} /></Card>
    </>
  );
}
