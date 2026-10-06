import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import type { ProductRow } from "@/lib/api/section-types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ModeSwitch, Toggle } from "@/components/admin/primitives";
import { Button, Card, DataTable, FilterBar, FilterSelect, PageHeader, Pager, SearchInput, type Column } from "@/components/admin/page";
import { bulkMode, isCart, useCatalogue } from "@/components/admin/CatalogueFlow";
import { MixBar, useBulkMode, useVisibility } from "@/components/admin/CatalogueUi";
import { editProduct, editProducts, type ProductEdit } from "@/components/admin/ProductFlow";

const TABS = ["By maison", "By category", "By product"] as const;
type Tab = (typeof TABS)[number];
const RULES: [string, string][] = [
  ["Out of stock → switch to Enquiry automatically", "Instead of showing “Out of stock”, the product stays live and collects enquiries"],
  ["Back in stock → switch back to Add to Cart", ""],
  ["Products without a price can only be Enquiry", ""],
  ["Hide a maison automatically when all its products are hidden", ""],
  ["Email me a daily summary of automatic switches", ""],
];

function Mini({ children, onClick }: { children: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="whitespace-nowrap rounded-full border border-border px-2.5 py-1 text-[11.5px] hover:border-primary">{children}</button>;
}

export default function SellingPage() {
  const { data: cats } = useSuspenseQuery(categoriesQuery());
  const { data: brands } = useSuspenseQuery(brandsQuery());
  const { data: prods } = useSuspenseQuery(productsQuery());
  const live = useCatalogue(cats, brands, prods.rows);
  const vis = useVisibility();
  const bulk = useBulkMode();
  const [tab, setTab] = useState<Tab>("By maison");
  const [f, setF] = useState({ q: "", cat: "", brand: "", mode: "", vis: "" });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rules, setRules] = useState(RULES.map((_, i) => i !== 3));

  const setFilter = (k: keyof typeof f) => (v: string) => { setF((x) => ({ ...x, [k]: v })); setPage(1); };
  const onSite = (p: ProductRow) => p.visible && !p.hiddenBy;

  const setMode = (p: ProductRow, m: "cart" | "enq") => {
    if (m === "cart" && !p.price) { toast(`${p.name} has no price yet — set one in the product first`); return; }
    editProduct(p.id, { mode: m === "cart" ? "Add to Cart" : "Enquiry only" });
    toast(`${p.name} → ${m === "cart" ? "Add to Cart" : "Enquiry"}`);
  };
  const toggleVisible = (p: ProductRow) => { editProduct(p.id, { visible: !p.visible }); toast(`${p.name} ${!p.visible ? "is on the site" : "is hidden from the site"}`); };

  const q = f.q.toLowerCase();
  const rows = live.products.filter((p) =>
    (!q || `${p.name}${p.sku}${p.nameAr}`.toLowerCase().includes(q)) &&
    (!f.cat || p.category === f.cat) && (!f.brand || p.brand === f.brand) &&
    (!f.mode || (f.mode === "Add to Cart" ? isCart(p) : !isCart(p))) &&
    (!f.vis || (f.vis === "On site" ? onSite(p) : !onSite(p))),
  );
  const cur = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const shown = rows.slice((cur - 1) * pageSize, cur * pageSize);
  const allOn = rows.length > 0 && rows.every((p) => sel.has(p.id));
  const toggleAll = () => setSel((s) => { const n = new Set(s); rows.forEach((p) => (allOn ? n.delete(p.id) : n.add(p.id))); return n; });
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const doSel = (d: "cart" | "enq" | "hide" | "show") => {
    const list = live.products.filter((p) => sel.has(p.id));
    if (d === "cart" || d === "enq") {
      const { n, skipped } = bulkMode(list, d);
      toast(`${n} products updated${skipped ? ` · ${skipped} without price stayed Enquiry` : ""}`);
    } else {
      const next: Record<string, ProductEdit> = {};
      list.forEach((p) => { next[p.id] = { visible: d === "show" }; });
      editProducts(next);
      toast(`${list.length} products updated`);
    }
    setSel(new Set());
  };

  const groupColumns = (kind: "maison" | "category"): Column<(typeof live.brands)[number] | (typeof live.categories)[number]>[] => [
    { header: kind === "maison" ? "Maison" : "Category", cell: (o) => (kind === "maison" ? <Link to="/brands/$brandId" params={{ brandId: o.id }} className="font-medium">{o.name}</Link> : <Link to="/categories/$categoryId" params={{ categoryId: o.id }} className="font-medium">{o.name}</Link>) },
    { header: "Products", align: "right", cell: (o) => o.count },
    { header: "Current mix", cell: (o) => <MixBar list={live.products.filter((p) => (kind === "maison" ? p.brand : p.category) === o.name)} total={o.count} /> },
    { header: "Switch all", cell: (o) => {
      const list = live.products.filter((p) => (kind === "maison" ? p.brand : p.category) === o.name);
      return (
        <div className="flex flex-wrap gap-1.5">
          <Mini onClick={() => bulk.ask(o.name, list, "cart")}>All → Cart</Mini>
          <Mini onClick={() => bulk.ask(o.name, list, "enq")}>All → Enquiry</Mini>
          <Mini onClick={() => { setF({ q: "", cat: kind === "category" ? o.name : "", brand: kind === "maison" ? o.name : "", mode: "", vis: "" }); setPage(1); setTab("By product"); }}>Pick one by one →</Mini>
        </div>
      );
    } },
    { header: "On site", cell: (o) => vis.toggle(kind === "maison" ? { kind: "maison", row: o as (typeof live.brands)[number] } : { kind: "category", row: o as (typeof live.categories)[number] }) },
  ];

  const productColumns: Column<ProductRow>[] = [
    { header: "select", headerNode: <input type="checkbox" aria-label="Select all" checked={allOn} onChange={toggleAll} className="size-4 cursor-pointer accent-[#0a0a0a]" />, cell: (p) => <input type="checkbox" aria-label={`Select ${p.name}`} checked={sel.has(p.id)} onChange={() => toggleSel(p.id)} className="size-4 cursor-pointer accent-[#0a0a0a]" /> },
    { header: "Product", cell: (p) => <div><b className="font-semibold">{p.name}</b><div className="text-[12px] text-muted-foreground">{p.sku}</div></div> },
    { header: "Maison", cell: (p) => p.brand },
    { header: "Category", cell: (p) => p.category },
    { header: "Sell as", cell: (p) => <ModeSwitch<"cart" | "enq"> value={isCart(p) ? "cart" : "enq"} onChange={(m) => setMode(p, m)} options={[{ value: "cart", label: "Add to Cart" }, { value: "enq", label: "Enquiry" }]} /> },
    { header: "Price", align: "right", cell: (p) => (p.price ? `${formatNumber(p.offer ?? p.price)} EGP` : <span className="text-muted-foreground">No price</span>) },
    { header: "On site", cell: (p) => (
      <>
        <Toggle on={p.visible} onChange={() => toggleVisible(p)} label={p.visible ? "On site — click to hide" : "Hidden — click to show"} />
        {p.hiddenBy && <div className="mt-[5px] max-w-[160px] text-[11.5px] leading-snug text-warn">Not on site — {p.hiddenBy}</div>}
      </>
    ) },
  ];

  const how = [
    ["1 · Add to Cart or Enquiry", "Switch a whole maison or category in one click, or pick product by product."],
    ["2 · On site or hidden", "Hide a product, a maison or a category. Hiding a maison or category takes all its products off the site — search included."],
    ["3 · Nothing is deleted", "Switch anything back on and it returns exactly as it was."],
  ];

  return (
    <>
      <PageHeader title="Selling control" subtitle="The one place to decide what is on the site, and whether it sells by Add to Cart or by Enquiry — for a whole maison, a whole category, or product by product." actions={<Link to="/products"><Button>Open product list</Button></Link>} />
      <div className="mb-[18px] grid gap-[18px] lg:grid-cols-3">
        {how.map(([t, d]) => <div key={t} className="rounded-[10px] border border-border bg-surface px-[18px] py-4"><b className="mb-1 block font-head text-[16px] font-normal">{t}</b><span className="text-[12.5px] text-muted-foreground">{d}</span></div>)}
      </div>
      <div className="mb-[18px] flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => <button key={t} type="button" onClick={() => { setTab(t); setPage(1); }} className={cn("-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px]", t === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground")}>{t}</button>)}
      </div>

      {tab === "By maison" && <Card><DataTable columns={groupColumns("maison")} rows={live.brands} rowKey={(o) => o.id} /></Card>}
      {tab === "By category" && <Card><DataTable columns={groupColumns("category")} rows={live.categories} rowKey={(o) => o.id} /></Card>}
      {tab === "By product" && (
        <Card>
          <FilterBar>
            <SearchInput value={f.q} onChange={setFilter("q")} placeholder="Product name or SKU" />
            <FilterSelect value={f.cat} onChange={setFilter("cat")} all="All categories" options={prods.categories} />
            <FilterSelect value={f.brand} onChange={setFilter("brand")} all="All maisons" options={prods.brands} />
            <FilterSelect value={f.mode} onChange={setFilter("mode")} all="Cart & Enquiry" options={["Add to Cart", "Enquiry only"]} />
            <FilterSelect value={f.vis} onChange={setFilter("vis")} all="On site & hidden" options={["On site", "Not on site"]} />
          </FilterBar>
          <div className={cn("mb-2.5 flex min-h-[46px] flex-wrap items-center gap-2 rounded-lg px-3 py-2.5 text-[13px]", sel.size ? "bg-primary text-primary-foreground" : "bg-hover")}>
            {sel.size ? (
              <>
                <b className="font-semibold">{sel.size} selected</b>
                {([["cart", "→ Add to Cart"], ["enq", "→ Enquiry"], ["hide", "Hide from site"], ["show", "Show on site"]] as const).map(([d, l]) => (
                  <button key={d} type="button" onClick={() => doSel(d)} className="h-[30px] rounded-lg border border-white/35 px-3.5 text-[12px] text-white hover:border-white">{l}</button>
                ))}
                <button type="button" onClick={() => setSel(new Set())} className="text-white/70 underline">Clear</button>
              </>
            ) : <span>Tick products to switch many at once — or use the switches on each row.</span>}
          </div>
          <DataTable columns={productColumns} rows={shown} rowKey={(p) => p.id} empty="No product matches these filters." />
          <Pager page={cur} pageSize={pageSize} total={rows.length} noun="products" onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
        </Card>
      )}
      {tab === "Automatic rules" && (
        <Card>
          {RULES.map(([l, h], i) => (
            <div key={l} className="flex items-center justify-between gap-3.5 border-b border-line-soft py-2.5 last:border-b-0">
              <div><div className="text-[13.5px]">{l}</div>{h && <div className="mt-0.5 text-[12px] text-muted-foreground">{h}</div>}</div>
              <Toggle on={rules[i] ?? false} onChange={() => setRules((r) => r.map((x, k) => (k === i ? !x : x)))} label={l} />
            </div>
          ))}
        </Card>
      )}
      {vis.dialog}
      {bulk.dialog}
    </>
  );
}
