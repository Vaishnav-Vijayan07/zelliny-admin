import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { paymentsQuery } from "@/lib/api/sections.functions";
import type { PaymentRow } from "@/lib/api/section-types";
import { formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/admin/primitives";
import {
  Card,
  DataTable,
  FilterBar,
  FilterSelect,
  PageHeader,
  SearchInput,
  type Column,
} from "@/components/admin/page";

const columns: Column<PaymentRow>[] = [
  { header: "Transaction", cell: (p) => <b className="font-medium">{p.id}</b> },
  { header: "Order", cell: (p) => p.order },
  { header: "Date", cell: (p) => p.date },
  { header: "Customer", cell: (p) => p.customer },
  { header: "Method", cell: (p) => p.method },
  {
    header: "Status",
    cell: (p) => <StatusBadge tone={p.status.tone}>{p.status.label}</StatusBadge>,
  },
  {
    header: "Amount",
    align: "right",
    cell: (p) => <b className="font-medium">{formatMoney(p.amount)}</b>,
  },
];

export default function PaymentsPage() {
  const { data } = useSuspenseQuery(paymentsQuery());
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const rows = data.rows.filter(
    (p) =>
      (!st || p.status.label === st) &&
      (!q || `${p.id} ${p.order} ${p.customer}`.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Every payment and refund. Card and wallet payments settle through Paymob."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.summary.map((s) => (
          <div key={s.label} className="rounded-[10px] border border-border bg-surface px-4 py-3">
            <div className="text-[12px] text-muted-foreground">{s.label}</div>
            <div className="mt-1 font-head text-[20px]">{s.value}</div>
          </div>
        ))}
      </div>
      <Card>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Transaction, order or customer" />
          <FilterSelect
            value={st}
            onChange={setSt}
            all="All statuses"
            options={["Paid", "Unpaid", "Refunded"]}
          />
        </FilterBar>
        <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} />
      </Card>
    </>
  );
}
