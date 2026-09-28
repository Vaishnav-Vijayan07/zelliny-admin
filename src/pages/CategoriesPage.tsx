import { useSuspenseQuery } from "@tanstack/react-query";
import { categoriesQuery } from "@/lib/api/sections.functions";
import type { CategoryRow } from "@/lib/api/section-types";
import { StatusBadge } from "@/components/admin/primitives";
import { Button, Card, DataTable, PageHeader, type Column } from "@/components/admin/page";
import { soon } from "@/hooks/use-toast-lite";

const columns: Column<CategoryRow>[] = [
  { header: "#", cell: (c) => <span className="text-muted-foreground">{c.order}</span> },
  { header: "Category", cell: (c) => <b className="font-medium">{c.name}</b> },
  { header: "Arabic", cell: (c) => <span dir="rtl">{c.nameAr}</span> },
  { header: "Selling mode", cell: (c) => c.mode },
  { header: "Products", align: "right", cell: (c) => c.count },
  { header: "Status", cell: (c) => <StatusBadge tone={c.status.tone}>{c.status.label}</StatusBadge> },
];

export default function CategoriesPage() {
  const { data } = useSuspenseQuery(categoriesQuery());
  return (
    <>
      <PageHeader title="Categories" subtitle="The top-level sections of the store, in the order shoppers see them." actions={<Button primary onClick={soon("Add category")}>Add category</Button>} />
      <Card><DataTable columns={columns} rows={data} rowKey={(c) => c.id} /></Card>
    </>
  );
}
