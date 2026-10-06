import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { discountsQuery } from "@/lib/api/sections.functions";
import { StatusBadge } from "@/components/admin/primitives";
import { Button, Card, DataTable, FilterBar, FilterSelect, PageHeader, SearchInput, type Column } from "@/components/admin/page";
import { PROMOTION_TYPES, appliesTo, benefit, datesLabel, statusOf, typeMeta, usePromotions, type Promotion } from "@/components/admin/DiscountFlow";

const STATUS_FILTERS = ["Active", "Scheduled", "Expired", "Inactive"];

export default function DiscountsPage() {
  const { data } = useSuspenseQuery(discountsQuery());
  const list = usePromotions(data);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const rows = list
    .filter((p) => (!q || `${p.name} ${p.code}`.toLowerCase().includes(q.toLowerCase())) && (!type || typeMeta(p.type).label === type) && (!status || statusOf(p).label === status))
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));

  const columns: Column<Promotion>[] = [
    { header: "Promotion", cell: (p) => <div><div>{p.name}</div>{p.description && <div className="max-w-[260px] truncate text-[12px] text-muted-foreground">{p.description}</div>}</div> },
    { header: "Type & code", cell: (p) => (
      <div className="flex flex-col items-start gap-1">
        <span className={`rounded px-2 py-0.5 text-[11.5px] ${typeMeta(p.type).badge}`}>{typeMeta(p.type).label}</span>
        {p.type === "coupon" && p.code && <span className="rounded border border-dashed border-[#c9c9c9] px-2 py-[2px] font-mono text-[12px]">{p.code}</span>}
      </div>
    ) },
    { header: "Benefit", cell: (p) => benefit(p) },
    { header: "Applies to", cell: (p) => <span className="line-clamp-2 max-w-[200px]">{appliesTo(p)}</span> },
    { header: "Used", cell: (p) => (p.type === "coupon" ? `${p.used} / ${p.usageLimit || "∞"}` : "—") },
    { header: "Schedule", cell: (p) => datesLabel(p.starts, p.ends) },
    { header: "Status", cell: (p) => { const s = statusOf(p); return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>; } },
  ];

  return (
    <>
      <PageHeader title="Discounts & offers" subtitle="Coupon codes, catalogue offers (including buy X get Y) and automatic cart discounts. Enquiry-only products are always excluded." actions={<Link to="/discounts/new"><Button primary>+ Create promotion</Button></Link>} />
      <Card>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search by name or code" />
          <FilterSelect value={type} onChange={setType} all="All types" options={PROMOTION_TYPES.map((t) => t.label)} />
          <FilterSelect value={status} onChange={setStatus} all="All statuses" options={STATUS_FILTERS} />
        </FilterBar>
        <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} empty="No promotion matches" onRowClick={(p) => navigate({ to: "/discounts/$code", params: { code: p.id } })} />
      </Card>
    </>
  );
}
