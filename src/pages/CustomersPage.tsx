import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { customersQuery } from "@/lib/api/sections.functions";
import type { CustomerRow } from "@/lib/api/section-types";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/admin/primitives";
import { Button, Card, DataTable, FilterBar, FilterSelect, Muted, PageHeader, SearchInput, type Column } from "@/components/admin/page";
import { soon } from "@/hooks/use-toast-lite";

const columns: Column<CustomerRow>[] = [
  { header: "Customer", cell: (c) => <><b className="font-medium">{c.name}</b><Muted>{c.email}</Muted></> },
  { header: "Phone", cell: (c) => c.phone },
  { header: "City", cell: (c) => c.city },
  { header: "Since", cell: (c) => c.since },
  { header: "Type", cell: (c) => <StatusBadge tone={c.tag.tone}>{c.tag.label}</StatusBadge> },
  { header: "Orders", align: "right", cell: (c) => c.orders },
  { header: "Spent", align: "right", cell: (c) => <b className="font-medium">{formatMoney(c.spent)}</b> },
];

export default function CustomersPage() {
  const { data } = useSuspenseQuery(customersQuery());
  const [q, setQ] = useState("");
  const [t, setT] = useState("");
  const rows = data.filter((c) => (!t || c.tag.label === t) && (!q || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHeader title="Customers" subtitle="Everyone who has ordered or created an account." actions={<><Button onClick={soon("Export")}>Export</Button><Button primary onClick={soon("Add customer")}>Add customer</Button></>} />
      <Card>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Name, email or phone" />
          <FilterSelect value={t} onChange={setT} all="All customers" options={["VIP", "Returning", "New"]} />
        </FilterBar>
        <DataTable columns={columns} rows={rows} rowKey={(c) => c.id} />
      </Card>
    </>
  );
}
