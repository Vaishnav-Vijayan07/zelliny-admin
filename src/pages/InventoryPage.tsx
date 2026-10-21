import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { attributesQuery, inventoryQuery, productsQuery } from "@/lib/api/sections.functions";
import type { ProductRow } from "@/lib/api/section-types";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SkuChip, StatusBadge, Thumb, Toggle } from "@/components/admin/primitives";
import {
  Button,
  Card,
  DataTable,
  FilterBar,
  PageHeader,
  Pager,
  SearchInput,
  type Column,
} from "@/components/admin/page";
import { Dropdown } from "@/components/admin/Dropdown";
import { editProducts, stockLabel, useProducts } from "@/components/admin/ProductFlow";
import { useAttributes } from "@/components/admin/AttributeFlow";
import { SearchSelect } from "@/components/admin/SearchSelect";
import {
  editVariants,
  useVariants,
  withCurrentType,
  type Variant,
} from "@/components/admin/VariantFlow";
import {
  FeatureBanner,
  HowItWorks,
  editPreorder,
  useInventory,
  useNotifyDialog,
  usePreorderDialog,
} from "@/components/admin/InventoryFlow";
import { soon } from "@/hooks/use-toast-lite";

const INVENTORY_TABS = ["Stock", "Back-in-stock requests", "Pre-orders"] as const;
type Tab = (typeof INVENTORY_TABS)[number];

const Kpis = ({ items }: { items: [string, ReactNode][] }) => (
  <div className="mb-[18px] grid grid-cols-2 gap-[18px] md:grid-cols-4">
    {items.map(([k, v]) => (
      <div key={k} className="rounded-[10px] border border-border bg-surface px-[18px] py-3.5">
        <span className="block text-[12px] text-muted-foreground">{k}</span>
        <b className="font-head text-[20px] font-medium">{v}</b>
      </div>
    ))}
  </div>
);
const ProductCell = ({ p }: { p: ProductRow }) => (
  <div className="flex items-center gap-3">
    <Thumb color={p.color} />
    <b className="font-medium">{p.name}</b>
  </div>
);

export default function InventoryPage({
  tab: initialTab,
  product: initialProduct,
}: {
  tab?: string | undefined;
  product?: string | undefined;
}) {
  const { data: productsData } = useSuspenseQuery(productsQuery());
  const { data } = useSuspenseQuery(inventoryQuery());
  const { data: attrData } = useSuspenseQuery(attributesQuery());
  const attributes = useAttributes(attrData);
  const navigate = useNavigate();
  const products = useProducts(productsData.rows);
  const inv = useInventory(data);
  const notify = useNotifyDialog();
  const preorder = usePreorderDialog((id) =>
    navigate({ to: "/inventory/preorders/$productId", params: { productId: id } }),
  );
  const tab: Tab = INVENTORY_TABS.find((t) => t === initialTab) ?? "Stock";
  const goTab = (t: Tab) => navigate({ to: "/inventory", search: t === "Stock" ? {} : { tab: t } });
  const prod = (id: string) => products.find((p) => p.id === id);

  /* ---------- Stock ---------- */
  // Variable products are listed one row per variant (attribute values); simple products stay one row.
  const variantBase = useMemo(
    () => withCurrentType(productsData.rows, products),
    [productsData.rows, products],
  );
  const variants = useVariants(variantBase, attributes);
  type StockRow = {
    key: string;
    p: ProductRow;
    v: Variant | null;
    sku: string;
    stock: number;
    sold: number;
    price: number | null;
    /** Normal price and offer price (the offer replaces the price when set). */
    list: number | null;
    offer: number | null;
  };
  const stockRows: StockRow[] = products.flatMap((p): StockRow[] => {
    const vs = p.variable ? variants.filter((x) => x.productId === p.id) : [];
    return vs.length
      ? vs.map((v) => ({
          key: v.id,
          p,
          v,
          sku: v.sku,
          stock: v.stock,
          sold: v.sold,
          price: v.offer || v.price,
          list: v.price,
          offer: v.offer,
        }))
      : [
          {
            key: p.id,
            p,
            v: null,
            sku: p.sku,
            stock: p.stock,
            sold: p.sold || 0,
            price: p.offer || p.price,
            list: p.price,
            offer: p.offer,
          },
        ];
  });
  const [f, setF] = useState({ q: "", product: initialProduct ?? "", cat: "", st: "" });
  const [adjust, setAdjust] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const setFilter = (k: keyof typeof f) => (v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setPage(1);
  };
  const q = f.q.toLowerCase();
  const stockOf = (r: StockRow) => adjust[r.key] ?? r.stock;
  const rows = stockRows
    .filter(
      (r) =>
        (!q || `${r.p.name} ${r.v?.label ?? ""} ${r.sku}`.toLowerCase().includes(q)) &&
        (!f.product || r.p.id === f.product) &&
        (!f.cat || r.p.category === f.cat) &&
        (!f.st || stockLabel(r.stock) === f.st),
    )
    .sort((a, b) => a.stock - b.stock);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = Math.min(page, pages);
  const changed = stockRows.filter((r) => adjust[r.key] !== undefined && adjust[r.key] !== r.stock);
  const saveStock = () => {
    if (!changed.length) {
      toast("No stock changes to save");
      return;
    }
    editVariants(
      Object.fromEntries(changed.filter((r) => r.v).map((r) => [r.key, { stock: adjust[r.key]! }])),
    );
    // a product's stock is the total of its variants
    const totals: Record<string, { stock: number }> = {};
    changed.forEach((r) => {
      totals[r.p.id] = {
        stock: stockRows
          .filter((x) => x.p.id === r.p.id)
          .reduce((a, x) => a + (adjust[x.key] ?? x.stock), 0),
      };
    });
    editProducts(totals);
    setAdjust({});
    toast(`Stock updated · ${changed.length} row${changed.length > 1 ? "s" : ""}`);
  };
  const stockCols: Column<StockRow>[] = [
    { header: "Product", cell: (r) => <ProductCell p={r.p} /> },
    {
      header: "Variant",
      cell: (r) =>
        r.v && r.v.attrs.length ? (
          <div className="flex flex-wrap gap-1">
            {r.v.attrs.map((a) => (
              <span
                key={a.name}
                className="rounded-full border border-border px-2 py-0.5 text-[11.5px]"
              >
                <span className="text-muted-foreground">{a.name}:</span> {a.value}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { header: "SKU", cell: (r) => <SkuChip>{r.sku}</SkuChip> },
    {
      header: "Price",
      align: "right",
      cell: (r) =>
        r.list ? (
          r.offer ? (
            <>
              <b className="whitespace-nowrap font-medium">{formatNumber(r.offer)} EGP</b>
              <div className="text-[12px] text-muted-foreground line-through">
                {formatNumber(r.list)}
              </div>
            </>
          ) : (
            <b className="whitespace-nowrap font-medium">{formatNumber(r.list)} EGP</b>
          )
        ) : (
          <span className="text-muted-foreground">No price</span>
        ),
    },
    {
      header: "Status",
      cell: (r) => {
        const l = stockLabel(stockOf(r));
        return (
          <StatusBadge tone={l === "In stock" ? "ok" : l === "Low stock" ? "warn" : "bad"}>
            {l}
          </StatusBadge>
        );
      },
    },
    {
      header: "On hand",
      align: "right",
      cell: (r) => (
        <b className={cn("font-medium", stockOf(r) !== r.stock && "text-info")}>{stockOf(r)}</b>
      ),
    },
    { header: "Sold · 30 days", align: "right", cell: (r) => r.sold },
    {
      header: "Adjust",
      align: "right",
      cell: (r) => (
        <div
          className="inline-flex h-8 overflow-hidden rounded-lg border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-7"
            onClick={() => setAdjust((a) => ({ ...a, [r.key]: Math.max(0, stockOf(r) - 1) }))}
          >
            −
          </button>
          <input
            value={stockOf(r)}
            onChange={(e) =>
              setAdjust((a) => ({
                ...a,
                [r.key]: Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0),
              }))
            }
            className="w-[46px] border-x border-border bg-surface text-center"
          />
          <button
            type="button"
            className="w-7"
            onClick={() => setAdjust((a) => ({ ...a, [r.key]: stockOf(r) + 1 }))}
          >
            +
          </button>
        </div>
      ),
    },
  ];
  const lowN = stockRows.filter((r) => r.stock > 0 && r.stock <= 2).length,
    outN = stockRows.filter((r) => r.stock === 0).length;
  /* ---------- Back-in-stock ---------- */
  const waitN = inv.waitlists.reduce(
    (a, w) => a + w.customers.filter((c) => !c.notified).length,
    0,
  );
  type WRow = (typeof inv.waitlists)[number] & { p: ProductRow };
  const waitRows: WRow[] = inv.waitlists.flatMap((w) => {
    const p = prod(w.productId);
    return p ? [{ ...w, p }] : [];
  });
  const waitCols: Column<WRow>[] = [
    { header: "Product", cell: (w) => <ProductCell p={w.p} /> },
    { header: "SKU", cell: (w) => <SkuChip>{w.p.sku}</SkuChip> },
    {
      header: "Stock now",
      align: "right",
      cell: (w) => (
        <b className={cn("font-medium", !w.p.stock ? "text-bad" : w.p.stock <= 2 && "text-warn")}>
          {w.p.stock}
        </b>
      ),
    },
    {
      header: "Waiting",
      align: "right",
      cell: (w) => <b className="font-medium">{w.customers.filter((c) => !c.notified).length}</b>,
    },
    { header: "Oldest request", cell: (w) => w.customers.find((c) => !c.notified)?.date ?? "—" },
    {
      header: "Notified",
      cell: (w) => {
        const n = w.customers.filter((c) => c.notified).length;
        return n ? `${n} sent` : "—";
      },
    },
    {
      header: "action",
      headerNode: "",
      align: "right",
      cell: (w) => {
        const left = w.customers.filter((c) => !c.notified).length;
        if (!left) return <span className="text-good">All notified ✓</span>;
        if (!w.p.stock)
          return (
            <span className="text-muted-foreground" title="Unlocks when stock is added">
              Waiting for stock
            </span>
          );
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <Button primary onClick={() => notify.show(w.p, w)}>
              Notify customers
            </Button>
          </span>
        );
      },
    },
  ];

  /* ---------- Pre-orders ---------- */
  type PRow = (typeof inv.preorders)[number] & { p: ProductRow };
  const preRows: PRow[] = inv.preorders.flatMap((r) => {
    const p = prod(r.productId);
    return p ? [{ ...r, p }] : [];
  });
  const preCols: Column<PRow>[] = [
    { header: "Product", cell: (r) => <ProductCell p={r.p} /> },
    { header: "SKU", cell: (r) => <SkuChip>{r.p.sku}</SkuChip> },
    {
      header: "Stock now",
      align: "right",
      cell: (r) => <b className={cn("font-medium", !r.p.stock && "text-bad")}>{r.p.stock}</b>,
    },
    { header: "Expected arrival", cell: (r) => r.expected },
    {
      header: "Pre-orders",
      cell: (r) => {
        const n = r.customers.length;
        return (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="inline-block h-1.5 w-[110px] overflow-hidden rounded bg-hover">
              <i
                className="block h-full bg-primary"
                style={{ width: `${Math.round((n / r.limit) * 100)}%` }}
              />
            </span>
            {n} of {r.limit}
            {n >= r.limit && <span className="text-muted-foreground">· full</span>}
          </span>
        );
      },
    },
    { header: "Payment", cell: (r) => r.payment },
    {
      header: "Open",
      align: "right",
      cell: (r) => {
        const full = r.customers.length >= r.limit;
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <Toggle
              on={r.open && !full}
              label={`Pre-orders open on ${r.p.name}`}
              onChange={() => {
                if (full) {
                  toast("This product has reached its maximum — raise the maximum to reopen");
                  return;
                }
                editPreorder(r.productId, { open: !r.open });
                toast(`Pre-orders ${!r.open ? "opened" : "closed"} · ${r.p.name}`);
              }}
            />
          </span>
        );
      },
    },
  ];
  const preTaken = preRows.reduce((a, r) => a + r.customers.length, 0);
  const preValue = preRows.reduce(
    (a, r) => a + r.customers.length * (r.p.offer || r.p.price || 0),
    0,
  );
  const preCandidates = products.filter(
    (p) => p.stock <= 2 && !inv.preorders.some((r) => r.productId === p.id),
  );

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Stock on hand for every product, and the customers waiting for sold-out items."
        actions={
          tab === "Pre-orders" ? (
            <Button primary onClick={() => preorder.show(preCandidates)}>
              + Open pre-orders on a product
            </Button>
          ) : (
            <>
              <Button onClick={soon("Stock count (Excel)")}>Stock count (Excel)</Button>
              <Button primary onClick={saveStock}>
                Save stock changes{changed.length ? ` · ${changed.length}` : ""}
              </Button>
            </>
          )
        }
      />
      <div className="mb-[18px] flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border">
        {INVENTORY_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => goTab(t)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px]",
              t === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Stock" && (
        <>
          <Kpis
            items={[
              ["Total units", formatNumber(stockRows.reduce((a, r) => a + r.stock, 0))],
              [
                "Stock value (retail)",
                formatMoney(stockRows.reduce((a, r) => a + (r.price ?? 0) * r.stock, 0)),
              ],
              ["Low stock", lowN],
              ["Out of stock", outN],
            ]}
          />
          <div className="-mt-1 mb-3.5 flex flex-wrap gap-7 text-[13px] text-muted-foreground">
            <span>
              <b className="font-medium text-foreground">Low stock</b> = 2 pieces or fewer
            </span>
            <span>
              <b className="font-medium text-foreground">Out of stock</b> = 0 — the product shows{" "}
              <b className="font-medium text-foreground">Sold out</b> with{" "}
              <b className="font-medium text-foreground">Notify me</b>
            </span>
          </div>
          <Card>
            <FilterBar>
              <SearchInput
                value={f.q}
                onChange={setFilter("q")}
                placeholder="Product, variant or SKU"
              />
              <SearchSelect
                value={f.product}
                allLabel="All products"
                items={products.map((p) => ({ value: p.id, label: p.name }))}
                onChange={setFilter("product")}
                className="w-auto min-w-[190px] bg-background text-[13px]"
              />
              <Dropdown
                value={f.cat}
                onChange={setFilter("cat")}
                ariaLabel="Category"
                options={[
                  { value: "", label: "All categories" },
                  ...productsData.categories.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Dropdown
                value={f.st}
                onChange={setFilter("st")}
                ariaLabel="Stock status"
                options={[
                  { value: "", label: "Any stock status" },
                  { value: "In stock", label: "In stock" },
                  { value: "Low stock", label: "Low stock" },
                  { value: "Out of stock", label: "Out of stock" },
                ]}
              />
            </FilterBar>
            <DataTable
              columns={stockCols}
              rows={rows.slice((cur - 1) * pageSize, cur * pageSize)}
              rowKey={(r) => r.key}
              empty="No product matches these filters."
              onRowClick={(r) =>
                r.v
                  ? navigate({ to: "/inventory/variant/$variantId", params: { variantId: r.v.id } })
                  : navigate({ to: "/products/$productId", params: { productId: r.p.id } })
              }
            />
            <Pager
              page={cur}
              pageSize={pageSize}
              total={rows.length}
              noun="rows"
              onPage={setPage}
              onPageSize={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </Card>
        </>
      )}

      {tab === "Back-in-stock requests" && (
        <>
          <FeatureBanner k="backInStock" live={inv.features.backInStock} />
          <HowItWorks
            steps={[
              [
                "On the site",
                "When a product is sold out, customers see “Sold out” and a “Notify me when it's back” button. Notify me only asks for their email.",
              ],
              [
                "In the admin",
                "Each product shows who is waiting. Open it to see every name, email and the date they asked.",
              ],
              [
                "When stock arrives",
                "Press Notify, tick everyone or only some, check the message, and send. Each person is marked Notified.",
              ],
            ]}
          />
          <Card>
            <h3 className="mb-3 text-[15px]">Customers waiting · {waitN}</h3>
            <DataTable
              columns={waitCols}
              rows={waitRows}
              rowKey={(w) => w.productId}
              empty="Nobody is waiting for a product."
              onRowClick={(w) =>
                navigate({
                  to: "/inventory/waiting/$productId",
                  params: { productId: w.productId },
                })
              }
            />
            <p className="mt-3 text-[12px] text-muted-foreground">
              Click a row to open its waiting list. Notify unlocks as soon as the product has stock
              again. Many requests on one product is also a clear signal to reorder it first.
            </p>
          </Card>
        </>
      )}

      {tab === "Pre-orders" && (
        <>
          <FeatureBanner k="preorders" live={inv.features.preorders} />
          <HowItWorks
            steps={[
              [
                "On the site",
                "For the products you choose here, a sold-out product shows “Pre-order · expected [date]” instead of Sold out. Every other sold-out product shows Sold out with Notify me.",
              ],
              [
                "In the admin",
                "Choose the product, the expected date and the maximum number of pre-orders. It closes by itself when the maximum is reached.",
              ],
              [
                "When stock arrives",
                "Pre-orders go to the front of Orders with a Pre-order tag, and are packed first.",
              ],
            ]}
          />
          <Kpis
            items={[
              [
                "Products open for pre-order",
                preRows.filter((r) => r.open && r.customers.length < r.limit).length,
              ],
              ["Pre-orders taken", preTaken],
              ["Value of pre-orders", formatMoney(preValue)],
              ["Next arrival", preRows[0]?.expected || "—"],
            ]}
          />
          <Card>
            <h3 className="mb-3 text-[15px]">Products on pre-order</h3>
            <DataTable
              columns={preCols}
              rows={preRows}
              rowKey={(r) => r.productId}
              empty="No products on pre-order yet."
              onRowClick={(r) =>
                navigate({
                  to: "/inventory/preorders/$productId",
                  params: { productId: r.productId },
                })
              }
            />
            <p className="mt-3 text-[12px] text-muted-foreground">
              Click a row to see who pre-ordered. The switch opens or closes pre-orders on that
              product.
            </p>
          </Card>
          <Card>
            <h3 className="mb-2 text-[15px]">Rules</h3>
            {(
              [
                ["Close pre-orders automatically when the maximum is reached", "", true],
                ["Email the customer if the expected date changes", "", true],
                [
                  "Pre-orders are paid in full online",
                  "Cash on delivery is not offered for pre-orders",
                  true,
                ],
                [
                  "Allow a customer to cancel before the stock arrives",
                  "Refund goes back to the same card",
                  false,
                ],
              ] as [string, string, boolean][]
            ).map(([l, h, on]) => (
              <RuleRow key={l} label={l} hint={h} initial={on} />
            ))}
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
      <div>
        <div className="text-[13.5px]">{label}</div>
        {hint && <div className="mt-0.5 text-[12px] text-muted-foreground">{hint}</div>}
      </div>
      <Toggle on={on} onChange={() => setOn(!on)} label={label} />
    </div>
  );
}
