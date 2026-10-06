import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { Button, Card, DataTable, FilterBar, PageHeader, Pager, SearchInput, type Column } from "@/components/admin/page";
import { useCatalogue, type LiveBrand } from "@/components/admin/CatalogueFlow";
import { MixBar, useVisibility } from "@/components/admin/CatalogueUi";

export default function BrandsPage() {
  const { data: cats } = useSuspenseQuery(categoriesQuery());
  const { data: brands } = useSuspenseQuery(brandsQuery());
  const { data: prods } = useSuspenseQuery(productsQuery());
  const live = useCatalogue(cats, brands, prods.rows);
  const vis = useVisibility();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rows = live.brands.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.nameAr.includes(q));
  const cur = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const shown = rows.slice((cur - 1) * pageSize, cur * pageSize);

  const columns: Column<LiveBrand>[] = [
    { header: "Maison", cell: (b) => <Link to="/brands/$brandId" params={{ brandId: b.id }} className="font-medium">{b.name}</Link> },
    { header: "Arabic", cell: (b) => <span dir="rtl">{b.nameAr}</span> },
    { header: "Categories", cell: (b) => b.categories },
    { header: "Products", align: "right", cell: (b) => b.count },
    { header: "Selling mix", cell: (b) => <MixBar list={live.products.filter((p) => p.brand === b.name)} total={b.count} /> },
    { header: "On site", cell: (b) => vis.toggle({ kind: "maison", row: b }) },
  ];

  return (
    <>
      <PageHeader
        title="Maisons"
        subtitle={`${brands.length} maisons. Show or hide a maison — hiding it removes its page and all its products from the site.`}
        actions={<><Link to="/selling"><Button>Selling control</Button></Link><Link to="/brands/new"><Button primary>+ Add maison</Button></Link></>}
      />
      <Card>
        <FilterBar><SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search maisons" /></FilterBar>
        <DataTable columns={columns} rows={shown} rowKey={(b) => b.id} empty="No maison matches" />
        <Pager page={cur} pageSize={pageSize} total={rows.length} noun="maisons" onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      </Card>
      {vis.dialog}
    </>
  );
}
