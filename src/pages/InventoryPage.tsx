import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { inventoryQuery, productsQuery } from "@/lib/api/sections.functions";
import type { ProductRow } from "@/lib/api/section-types";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SkuChip, StatusBadge, Thumb, Toggle } from "@/components/admin/primitives";
import { Button, Card, DataTable, FilterBar, FilterSelect, PageHeader, Pager, SearchInput, type Column } from "@/components/admin/page";
import { editProducts, stockLabel, useProducts } from "@/components/admin/ProductFlow";
import { FeatureBanner, HowItWorks, editPreorder, useInventory, useNotifyDialog, usePreorderDialog } from "@/components/admin/InventoryFlow";
import { soon } from "@/hooks/use-toast-lite";

const INVENTORY_TABS = ["Stock", "Back-in-stock requests", "Pre-orders"] as const;
type Tab = (typeof INVENTORY_TABS)[number];

const Kpis = ({ items }: { items: [string, ReactNode][] }) => (
  <div className="mb-[18px] grid grid-cols-2 gap-[18px] md:grid-cols-4">
    {items.map(([k, v]) => <div key={k} className="rounded-[10px] border border-border bg-surface px-[18px] py-3.5"><span className="block text-[12px] text-muted-foreground">{k}</span><b className="font-head text-[20px] font-medium">{v}</b></div>)}
  </div>
);
const ProductCell = ({ p }: { p: ProductRow }) => <div className="flex items-center gap-3"><Thumb color={p.color} /><b className="font-medium">{p.name}</b></div>;

export default function InventoryPage({ tab: initialTab }: { tab?: string | undefined }) {
  const { data: productsData } = useSuspenseQuery(productsQuery());
  const { data } = useSuspenseQuery(inventoryQuery());
  const navigate = useNavigate();
  const products = useProducts(productsData.rows);
  const inv = useInventory(data);
  const notify = useNotifyDialog();
  const preorder = usePreorderDialog((id) => navigate({ to: "/inventory/preorders/$productId", params: { productId: id } }));
  const tab: Tab = INVENTORY_TABS.find((t) => t === initialTab) ?? "Stock";
  const goTab = (t: Tab) => navigate({ to: "/inventory", search: t === "Stock" ? {} : { tab: t } });
  const prod = (id: string) => products.find((p) => p.id === id);

  /* ---------- Stock ---------- */
  const [f, setF] = useState({ q: "", cat: "", st: "" });
  const [adjust, setAdjust] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const setFilter = (k: keyof typeof f) => (v: string) => { setF((x) => ({ ...x, [k]: v })); setPage(1); };
  const q = f.q.toLowerCase();
  const stockOf = (p: ProductRow) => adjust[p.id] ?? p.stock;
  const rows = products.filter((p) => (!q || `${p.name} ${p.sku}`.toLowerCase().includes(q)) && (!f.cat || p.category === f.cat) && (!f.st || stockLabel(p.stock) === f.st)).sort((a, b) => a.stock - b.stock);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = Math.min(page, pages);
  const changed = Object.entries(adjust).filter(([id, n]) => prod(id)?.stock !== n);
  const saveStock = () => {
    if (!changed.length) { toast("No stock changes to save"); return; }
    editProducts(Object.fromEntries(changed.map(([id, stock]) => [id, { stock }])));
    setAdjust({});
    toast(`Stock updated · ${changed.length} product${changed.length > 1 ? "s" : ""}`);
  };
  const stockCols: Column<ProductRow>[] = [
    { header: "Product", cell: (p) => <ProductCell p={p} /> },
    { header: "SKU", cell: (p) => <SkuChip>{p.sku}</SkuChip> },
    { header: "Status", cell: (p) => { const l = stockLabel(stockOf(p)); return <StatusBadge tone={l === "In stock" ? "ok" : l === "Low stock" ? "warn" : "bad"}>{l}</StatusBadge>; } },
    { header: "On hand", align: "right", cell: (p) => <b className={cn("font-medium", stockOf(p) !== p.stock && "text-info")}>{stockOf(p)}</b> },
    { header: "Sold · 30 days", align: "right", cell: (p) => p.sold || 0 },
    { header: "Adjust", align: "right", cell: (p) => (
      <div className="inline-flex h-8 overflow-hidden rounded-lg border border-border" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="w-7" onClick={() => setAdjust((a) => ({ ...a, [p.id]: Math.max(0, stockOf(p) - 1) }))}>−</button>
        <input value={stockOf(p)} onChange={(e) => setAdjust((a) => ({ ...a, [p.id]: Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0) }))} className="w-[46px] border-x border-border bg-surface text-center" />
        <button type="button" className="w-7" onClick={() => setAdjust((a) => ({ ...a, [p.id]: stockOf(p) + 1 }))}>+</button>
      </div>
    ) },
  ];
  const lowN = products.filter((p) => p.stock > 0 && p.stock <= 2).length, outN = products.filter((p) => p.stock === 0).length;

  /* ---------- Back-in-stock ---------- */
  const waitN = inv.waitlists.reduce((a, w) => a + w.customers.filter((c) => !c.notified).length, 0);
  type WRow = (typeof inv.waitlists)[number] & { p: ProductRow };
  const waitRows: WRow[] = inv.waitlists.flatMap((w) => { const p = prod(w.productId); return p ? [{ ...w, p }] : []; });
  const waitCols: Column<WRow>[] = [
    { header: "Product", cell: (w) => <ProductCell p={w.p} /> },
    { header: "SKU", cell: (w) => <SkuChip>{w.p.sku}</SkuChip> },
    { header: "Stock now", align: "right", cell: (w) => <b className={cn("font-medium", !w.p.stock ? "text-bad" : w.p.stock <= 2 && "text-warn")}>{w.p.stock}</b> },
    { header: "Waiting", align: "right", cell: (w) => <b className="font-medium">{w.customers.filter((c) => !c.notified).length}</b> },
    { header: "Oldest request", cell: (w) => w.customers.find((c) => !c.notified)?.date ?? "—" },
    { header: "Notified", cell: (w) => { const n = w.customers.filter((c) => c.notified).length; return n ? `${n} sent` : "—"; } },
    { header: "action", headerNode: "", align: "right", cell: (w) => {
      const left = w.customers.filter((c) => !c.notified).length;
      if (!left) return <span className="text-good">All notified ✓</span>;
      if (!w.p.stock) return <span className="text-muted-foreground" title="Unlocks when stock is added">Waiting for stock</span>;
      return <span onClick={(e) => e.stopPropagation()}><Button primary onClick={() => notify.show(w.p, w)}>Notify customers</Button></span>;
    } },
  ];

  /* ---------- Pre-orders ---------- */
  type PRow = (typeof inv.preorders)[number] & { p: ProductRow };
  const preRows: PRow[] = inv.preorders.flatMap((r) => { const p = prod(r.productId); return p ? [{ ...r, p }] : []; });
  const preCols: Column<PRow>[] = [
    { header: "Product", cell: (r) => <ProductCell p={r.p} /> },
    { header: "SKU", cell: (r) => <SkuChip>{r.p.sku}</SkuChip> },
    { header: "Stock now", align: "right", cell: (r) => <b className={cn("font-medium", !r.p.stock && "text-bad")}>{r.p.stock}</b> },
    { header: "Expected arrival", cell: (r) => r.expected },
    { header: "Pre-orders", cell: (r) => { const n = r.customers.length; return (
      <span className="flex items-center gap-2 whitespace-nowrap"><span className="inline-block h-1.5 w-[110px] overflow-hidden rounded bg-hover"><i className="block h-full bg-primary" style={{ width: `${Math.round((n / r.limit) * 100)}%` }} /></span>{n} of {r.limit}{n >= r.limit && <span className="text-muted-foreground">· full</span>}</span>
    ); } },
    { header: "Payment", cell: (r) => r.payment },
    { header: "Open", align: "right", cell: (r) => {
      const full = r.customers.length >= r.limit;
      return (
        <span onClick={(e) => e.stopPropagation()}>
          <Toggle on={r.open && !full} label={`Pre-orders open on ${r.p.name}`}
            onChange={() => { if (full) { toast("This product has reached its maximum — raise the maximum to reopen"); return; } editPreorder(r.productId, { open: !r.open }); toast(`Pre-orders ${!r.open ? "opened" : "closed"} · ${r.p.name}`); }} />
        </span>
      );
    } },
  ];
  const preTaken = preRows.reduce((a, r) => a + r.customers.length, 0);
  const preValue = preRows.reduce((a, r) => a + r.customers.length * (r.p.offer || r.p.price || 0), 0);
  const preCandidates = products.filter((p) => p.stock <= 2 && !inv.preorders.some((r) => r.productId === p.id));

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Stock on hand for every product, and the customers waiting for sold-out items."
        actions={tab === "Pre-orders"
          ? <Button primary onClick={() => preorder.show(preCandidates)}>+ Open pre-orders on a product</Button>
          : <><Button onClick={soon("Stock count (Excel)")}>Stock count (Excel)</Button><Button primary onClick={saveStock}>Save stock changes{changed.length ? ` · ${changed.length}` : ""}</Button></>}
      />
      <div className="mb-[18px] flex gap-1 overflow-x-auto border-b border-border">
        {INVENTORY_TABS.map((t) => (
          <button key={t} type="button" onClick={() => goTab(t)} className={cn("-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px]", t === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground")}>{t}</button>
        ))}
      </div>

      {tab === "Stock" && (
        <>
          <Kpis items={[["Total units", formatNumber(products.reduce((a, p) => a + p.stock, 0))], ["Stock value (retail)", formatMoney(products.reduce((a, p) => a + (p.price ?? 0) * p.stock, 0))], ["Low stock", lowN], ["Out of stock", outN]]} />
          <div className="-mt-1 mb-3.5 flex flex-wrap gap-7 text-[13px] text-muted-foreground">
            <span><b className="font-medium text-foreground">Low stock</b> = 2 pieces or fewer</span>
            <span><b className="font-medium text-foreground">Out of stock</b> = 0 — the product switches to Enquiry automatically</span>
          </div>
          <Card>
            <FilterBar>
              <SearchInput value={f.q} onChange={setFilter("q")} placeholder="Product or SKU" />
              <FilterSelect value={f.cat} onChange={setFilter("cat")} all="All categories" options={productsData.categories} />
              <FilterSelect value={f.st} onChange={setFilter("st")} all="Any stock status" options={["In stock", "Low stock", "Out of stock"]} />
            </FilterBar>
            <DataTable columns={stockCols} rows={rows.slice((cur - 1) * pageSize, cur * pageSize)} rowKey={(p) => p.id} empty="No product matches these filters."
              onRowClick={(p) => navigate({ to: "/products/$productId", params: { productId: p.id } })} />
            <Pager page={cur} pageSize={pageSize} total={rows.length} noun="products" onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
          </Card>
        </>
      )}

      {tab === "Back-in-stock requests" && (
        <>
          <FeatureBanner k="backInStock" live={inv.features.backInStock} />
          <HowItWorks steps={[
            ["On the site", "When a product is sold out, customers see “Make an enquiry” and “Notify me when it's back”. Notify me only asks for their email."],
            ["Here", "Each product shows who is waiting. Open it to see every name, email and the date they asked."],
            ["When stock arrives", "Press Notify, tick everyone or only some, check the message, and send. Each person is marked Notified."],
          ]} />
          <Card>
            <h3 className="mb-3 text-[15px]">Customers waiting · {waitN}</h3>
            <DataTable columns={waitCols} rows={waitRows} rowKey={(w) => w.productId} empty="Nobody is waiting for a product."
              onRowClick={(w) => navigate({ to: "/inventory/waiting/$productId", params: { productId: w.productId } })} />
            <p className="mt-3 text-[12px] text-muted-foreground">Click a row to open its waiting list. Notify unlocks as soon as the product has stock again. Many requests on one product is also a clear signal to reorder it first.</p>
          </Card>
        </>
      )}

      {tab === "Pre-orders" && (
        <>
          <FeatureBanner k="preorders" live={inv.features.preorders} />
          <HowItWorks steps={[
            ["On the site", "For the products you choose here, a sold-out product shows “Pre-order · expected [date]” instead of Enquiry. Every other sold-out product still switches to Enquiry."],
            ["Here", "Choose the product, the expected date and the maximum number of pre-orders. It closes by itself when the maximum is reached."],
            ["When stock arrives", "Pre-orders go to the front of Orders with a Pre-order tag, and are packed first."],
          ]} />
          <Kpis items={[["Products open for pre-order", preRows.filter((r) => r.open && r.customers.length < r.limit).length], ["Pre-orders taken", preTaken], ["Value of pre-orders", formatMoney(preValue)], ["Next arrival", preRows[0]?.expected || "—"]]} />
          <Card>
            <h3 className="mb-3 text-[15px]">Products on pre-order</h3>
            <DataTable columns={preCols} rows={preRows} rowKey={(r) => r.productId} empty="No products on pre-order yet."
              onRowClick={(r) => navigate({ to: "/inventory/preorders/$productId", params: { productId: r.productId } })} />
            <p className="mt-3 text-[12px] text-muted-foreground">Click a row to see who pre-ordered. The switch opens or closes pre-orders on that product.</p>
          </Card>
          <Card>
            <h3 className="mb-2 text-[15px]">Rules</h3>
            {([["Close pre-orders automatically when the maximum is reached", "", true], ["Email the customer if the expected date changes", "", true], ["Pre-orders are paid in full online", "Cash on delivery is not offered for pre-orders", true], ["Allow a customer to cancel before the stock arrives", "Refund goes back to the same card", false]] as [string, string, boolean][]).map(([l, h, on]) => <RuleRow key={l} label={l} hint={h} initial={on} />)}
          </Card>
        </>
      )}
      {notify.dialog}
      {preorder.dialog}
    </>
  );
}

function RuleRow({ label, hint, initial }: { label: string; hint: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <div className="flex items-center justify-between gap-3.5 border-b border-line-soft py-2.5 last:border-0">
      <div><div className="text-[13.5px]">{label}</div>{hint && <div className="mt-0.5 text-[12px] text-muted-foreground">{hint}</div>}</div>
      <Toggle on={on} onChange={() => setOn(!on)} label={label} />
    </div>
  );
}
