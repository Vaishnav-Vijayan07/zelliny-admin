import { useSuspenseQuery } from "@tanstack/react-query";
import { brandsQuery } from "@/lib/api/sections.functions";
import type { BrandRow } from "@/lib/api/section-types";
import { StatusBadge } from "@/components/admin/primitives";
import { Button, Card, DataTable, PageHeader, type Column } from "@/components/admin/page";
import { soon } from "@/hooks/use-toast-lite";

const columns: Column<BrandRow>[] = [
  { header: "Maison", cell: (b) => <b className="font-medium">{b.name}</b> },
  { header: "Arabic", cell: (b) => <span dir="rtl">{b.nameAr}</span> },
  { header: "Categories", cell: (b) => b.categories },
  { header: "Selling mode", cell: (b) => b.mode },
  { header: "Featured", cell: (b) => (b.featured ? "★ Homepage" : <span className="text-muted-foreground">—</span>) },
  { header: "Products", align: "right", cell: (b) => b.count },
  { header: "Status", cell: (b) => <StatusBadge tone={b.status.tone}>{b.status.label}</StatusBadge> },
];

export default function BrandsPage() {
  const { data } = useSuspenseQuery(brandsQuery());
  return (
    <>
      <PageHeader title="Maisons" subtitle="Brands in the store. Featured maisons appear on the homepage." actions={<Button primary onClick={soon("Add maison")}>Add maison</Button>} />
      <Card><DataTable columns={columns} rows={data} rowKey={(b) => b.id} /></Card>
    </>
  );
}
