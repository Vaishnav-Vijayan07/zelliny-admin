import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import type { ProductRow } from "@/lib/api/section-types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ModeSwitch, Toggle } from "@/components/admin/primitives";
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
import { SearchSelect } from "@/components/admin/SearchSelect";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isCart, useCatalogue } from "@/components/admin/CatalogueFlow";
import { MixBar, useBulkMode, useVisibility } from "@/components/admin/CatalogueUi";
import { editProduct, editProducts, type ProductEdit } from "@/components/admin/ProductFlow";

const TABS = ["By maison", "By category", "By product"] as const;
type Tab = (typeof TABS)[number];
const RULES: [string, string][] = [
  [
    "Out of stock → switch to Enquiry automatically",
    "Instead of showing “Out of stock”, the product stays live and collects enquiries",
  ],
  ["Back in stock → switch back to Add to Cart", ""],
  ["Products without a price can only be Enquiry", ""],
  ["Hide a maison automatically when all its products are hidden", ""],
  ["Email me a daily summary of automatic switches", ""],
];
const BULK_TEXT = {
  cart: [
    "Switch {n} to Add to Cart?",
    "Customers will see the price and buy online.",
    "Switch to Add to Cart",
  ],
  enq: [
    "Switch {n} to Enquiry?",
    "The price is hidden and customers see “Make an Enquiry” instead.",
    "Switch to Enquiry",
  ],
  hide: [
    "Hide {n} from the website?",
    "They disappear from the website. Nothing is deleted — you can show them again.",
    "Hide from site",
  ],
  show: [
    "Show {n} on the website?",
    "They become visible to customers on zelliny.com.",
    "Show on site",
  ],
} as const;

function Mini({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="whitespace-nowrap rounded-full border border-border px-2.5 py-1 text-[11.5px] hover:border-primary"
    >
      {children}
    </button>
  );
}

export default function SellingPage() {
  const { data: cats } = useSuspenseQuery(categoriesQuery());
  const { data: brands } = useSuspenseQuery(brandsQuery());
  const { data: prods } = useSuspenseQuery(productsQuery());
  const navigate = useNavigate();
  const live = useCatalogue(cats, brands, prods.rows);
  const vis = useVisibility();
  const bulk = useBulkMode();
  const [tab, setTab] = useState<Tab>("By maison");
  const [f, setF] = useState({ q: "", cat: "", brand: "", mode: "", vis: "" });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rules, setRules] = useState(RULES.map((_, i) => i !== 3));
  const [askBulk, setAskBulk] = useState<"cart" | "enq" | "hide" | "show" | null>(null);
  const [askNoPrice, setAskNoPrice] = useState<ProductRow | null>(null);

  const setFilter = (k: keyof typeof f) => (v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setPage(1);
  };
  const onSite = (p: ProductRow) => p.visible && !p.hiddenBy;

  const setMode = (p: ProductRow, m: "cart" | "enq") => {
    if (m === "cart" && !p.price) {
      setAskNoPrice(p);
      return;
    }
    editProduct(p.id, { mode: m === "cart" ? "Add to Cart" : "Enquiry only" });
    toast("1 product updated");
  };
  const toggleVisible = (p: ProductRow) => {
    editProduct(p.id, { visible: !p.visible });
    toast("1 product updated");
  };

  const q = f.q.toLowerCase();
  const rows = live.products.filter(
    (p) =>
      (!q || `${p.name}${p.sku}${p.nameAr}`.toLowerCase().includes(q)) &&
      (!f.cat || p.category === f.cat) &&
      (!f.brand || p.brand === f.brand) &&
      (!f.mode || (f.mode === "Add to Cart" ? isCart(p) : !isCart(p))) &&
      (!f.vis || (f.vis === "On site" ? onSite(p) : !onSite(p))),
  );
  const cur = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const shown = rows.slice((cur - 1) * pageSize, cur * pageSize);
  // Maison and category tabs page through their own list.
  const groups = tab === "By maison" ? live.brands : live.categories;
  const gCur = Math.min(page, Math.max(1, Math.ceil(groups.length / pageSize)));
  const gShown = groups.slice((gCur - 1) * pageSize, gCur * pageSize);
  const groupPager = (noun: string) => (
    <Pager
      page={gCur}
      pageSize={pageSize}
      total={groups.length}
      noun={noun}
      onPage={setPage}
      onPageSize={(n) => {
        setPageSize(n);
        setPage(1);
      }}
    />
  );
  const allOn = rows.length > 0 && rows.every((p) => sel.has(p.id));
  const toggleAll = () =>
    setSel((s) => {
      const n = new Set(s);
      rows.forEach((p) => (allOn ? n.delete(p.id) : n.add(p.id)));
      return n;
    });
  const toggleSel = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const doBulk = (d: "cart" | "enq" | "hide" | "show") => {
    const list = live.products.filter((p) => sel.has(p.id));
    const next: Record<string, ProductEdit> = {};
    let n = 0;
    list.forEach((p) => {
      if (d === "cart" && p.price && !isCart(p)) {
        next[p.id] = { mode: "Add to Cart" };
        n++;
      }
      if (d === "enq" && isCart(p)) {
        next[p.id] = { mode: "Enquiry only" };
        n++;
      }
      if (d === "hide" && p.visible) {
        next[p.id] = { visible: false };
        n++;
      }
      if (d === "show" && !p.visible) {
        next[p.id] = { visible: true };
        n++;
      }
    });
    editProducts(next);
    setSel(new Set());
    toast(`${n} product${n === 1 ? "" : "s"} updated`);
  };
  const noPriceSel = live.products.filter((p) => sel.has(p.id) && !isCart(p) && !p.price).length;

  const groupColumns = (
    kind: "maison" | "category",
  ): Column<(typeof live.brands)[number] | (typeof live.categories)[number]>[] => [
    {
      header: kind === "maison" ? "Maison" : "Category",
      cell: (o) =>
        kind === "maison" ? (
          <Link to="/brands/$brandId" params={{ brandId: o.id }} className="font-medium">
            {o.name}
          </Link>
        ) : (
          <Link to="/categories/$categoryId" params={{ categoryId: o.id }} className="font-medium">
            {o.name}
          </Link>
        ),
    },
    { header: "Products", align: "right", cell: (o) => o.count },
    {
      header: "Current mix",
      cell: (o) => (
        <MixBar
          list={live.products.filter((p) => (kind === "maison" ? p.brand : p.category) === o.name)}
          total={o.count}
        />
      ),
    },
    {
      header: "Switch all",
      cell: (o) => {
        const list = live.products.filter(
          (p) => (kind === "maison" ? p.brand : p.category) === o.name,
        );
        return (
          <div className="flex flex-wrap gap-1.5">
            <Mini onClick={() => bulk.ask(o.name, list, "cart")}>All → Cart</Mini>
            <Mini onClick={() => bulk.ask(o.name, list, "enq")}>All → Enquiry</Mini>
            <Mini
              onClick={() => {
                setF({
                  q: "",
                  cat: kind === "category" ? o.name : "",
                  brand: kind === "maison" ? o.name : "",
                  mode: "",
                  vis: "",
                });
                setPage(1);
                setTab("By product");
              }}
            >
              Pick one by one →
            </Mini>
          </div>
        );
      },
    },
    {
      header: "On site",
      cell: (o) =>
        vis.toggle(
          kind === "maison"
            ? { kind: "maison", row: o as (typeof live.brands)[number] }
            : { kind: "category", row: o as (typeof live.categories)[number] },
        ),
    },
  ];

  const productColumns: Column<ProductRow>[] = [
    {
      header: "select",
      headerNode: (
        <input
          type="checkbox"
          aria-label="Select all"
          checked={allOn}
          onChange={toggleAll}
          className="size-4 cursor-pointer accent-[#0a0a0a]"
        />
      ),
      cell: (p) => (
        <input
          type="checkbox"
          aria-label={`Select ${p.name}`}
          checked={sel.has(p.id)}
          onChange={() => toggleSel(p.id)}
          className="size-4 cursor-pointer accent-[#0a0a0a]"
        />
      ),
    },
    {
      header: "Product",
      cell: (p) => (
        <div>
          <b className="font-semibold">{p.name}</b>
          <div className="text-[12px] text-muted-foreground">{p.sku}</div>
        </div>
      ),
    },
    { header: "Maison", cell: (p) => p.brand },
    { header: "Category", cell: (p) => p.category },
    {
      header: "Sell as",
      cell: (p) => (
        <ModeSwitch<"cart" | "enq">
          value={isCart(p) ? "cart" : "enq"}
          onChange={(m) => setMode(p, m)}
          options={[
            { value: "cart", label: "Add to Cart" },
            { value: "enq", label: "Enquiry" },
          ]}
        />
      ),
    },
    {
      header: "Price",
      align: "right",
      cell: (p) =>
        p.price ? (
          `${formatNumber(p.offer ?? p.price)} EGP`
        ) : (
          <span className="text-muted-foreground">No price</span>
        ),
    },
    {
      header: "On site",
      cell: (p) => (
        <>
          <Toggle
            on={p.visible}
            onChange={() => toggleVisible(p)}
            label={p.visible ? "On site — click to hide" : "Hidden — click to show"}
          />
          {p.hiddenBy && (
            <div className="mt-[5px] max-w-[160px] text-[11.5px] leading-snug text-warn">
              Not on site — {p.hiddenBy}
            </div>
          )}
        </>
      ),
    },
  ];

  const how = [
    [
      "1 · Add to Cart or Enquiry",
      "Switch a whole maison or category in one click, or pick product by product.",
    ],
    [
      "2 · On site or hidden",
      "Hide a product, a maison or a category. Hiding a maison or category takes all its products off the site — search included.",
    ],
    ["3 · Nothing is deleted", "Switch anything back on and it returns exactly as it was."],
  ];

  return (
    <>
      <PageHeader
        title="Selling control"
        subtitle="The one place to decide what is on the site, and whether it sells by Add to Cart or by Enquiry — for a whole maison, a whole category, or product by product."
        actions={
          <Link to="/products">
            <Button>Open product list</Button>
          </Link>
        }
      />
      <div className="mb-[18px] grid gap-[18px] lg:grid-cols-3">
        {how.map(([t, d]) => (
          <div key={t} className="rounded-[10px] border border-border bg-surface px-[18px] py-4">
            <b className="mb-1 block font-head text-[16px] font-normal">{t}</b>
            <span className="text-[12.5px] text-muted-foreground">{d}</span>
          </div>
        ))}
      </div>
      <div className="mb-[18px] flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
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

      {tab === "By maison" && (
        <Card>
          <DataTable columns={groupColumns("maison")} rows={gShown} rowKey={(o) => o.id} />
          {groupPager("maisons")}
        </Card>
      )}
      {tab === "By category" && (
        <Card>
          <DataTable columns={groupColumns("category")} rows={gShown} rowKey={(o) => o.id} />
          {groupPager("categories")}
        </Card>
      )}
      {tab === "By product" && (
        <Card>
          <FilterBar>
            <SearchInput value={f.q} onChange={setFilter("q")} placeholder="Product name or SKU" />
            <Dropdown
              value={f.cat}
              onChange={setFilter("cat")}
              ariaLabel="Category"
              options={[
                { value: "", label: "All categories" },
                ...prods.categories.map((c) => ({ value: c, label: c })),
              ]}
            />
            <SearchSelect
              value={f.brand}
              onChange={setFilter("brand")}
              allLabel="All maisons"
              options={prods.brands}
              className="w-auto min-w-[150px] bg-background text-[13px]"
            />
            <Dropdown
              value={f.mode}
              onChange={setFilter("mode")}
              ariaLabel="Selling mode"
              options={[
                { value: "", label: "Cart & Enquiry" },
                { value: "Add to Cart", label: "Add to Cart" },
                { value: "Enquiry only", label: "Enquiry only" },
              ]}
            />
            <Dropdown
              value={f.vis}
              onChange={setFilter("vis")}
              ariaLabel="On site"
              options={[
                { value: "", label: "On site & hidden" },
                { value: "On site", label: "On site" },
                { value: "Not on site", label: "Not on site" },
              ]}
            />
          </FilterBar>
          <div
            className={cn(
              "mb-2.5 flex min-h-[46px] flex-wrap items-center gap-2 rounded-lg px-3 py-2.5 text-[13px]",
              sel.size ? "bg-primary text-primary-foreground" : "bg-hover",
            )}
          >
            {sel.size ? (
              <>
                <b className="font-semibold">{sel.size} selected</b>
                {(
                  [
                    ["cart", "→ Add to Cart"],
                    ["enq", "→ Enquiry"],
                    ["hide", "Hide from site"],
                    ["show", "Show on site"],
                  ] as const
                ).map(([d, l]) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setAskBulk(d)}
                    className="h-[30px] rounded-lg border border-white/35 px-3.5 text-[12px] text-white hover:border-white"
                  >
                    {l}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSel(new Set())}
                  className="text-white/70 underline"
                >
                  Clear
                </button>
              </>
            ) : (
              <span>Tick products to switch many at once — or use the switches on each row.</span>
            )}
          </div>
          <DataTable
            columns={productColumns}
            rows={shown}
            rowKey={(p) => p.id}
            empty="No product matches these filters."
          />
          <Pager
            page={cur}
            pageSize={pageSize}
            total={rows.length}
            noun="products"
            onPage={setPage}
            onPageSize={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </Card>
      )}
      {vis.dialog}
      {bulk.dialog}

      <Dialog open={!!askBulk} onOpenChange={(o) => !o && setAskBulk(null)}>
        <DialogContent className="max-w-[480px]">
          {askBulk && (
            <>
              <DialogHeader>
                <DialogTitle className="font-head text-[18px] font-normal">
                  {BULK_TEXT[askBulk][0].replace(
                    "{n}",
                    `${sel.size} product${sel.size === 1 ? "" : "s"}`,
                  )}
                </DialogTitle>
              </DialogHeader>
              <p className="text-[13.5px]">{BULK_TEXT[askBulk][1]}</p>
              {askBulk === "cart" && noPriceSel > 0 && (
                <div className="rounded-lg border border-[#e8d3ae] bg-warn-bg px-3 py-2.5 text-[13px] leading-normal text-warn">
                  <b className="font-semibold">
                    {noPriceSel} product{noPriceSel === 1 ? " has" : "s have"} no price
                  </b>{" "}
                  and will stay on Enquiry until you add one.
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setAskBulk(null)}>Cancel</Button>
                <Button
                  primary
                  onClick={() => {
                    doBulk(askBulk);
                    setAskBulk(null);
                  }}
                >
                  {BULK_TEXT[askBulk][2]}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!askNoPrice} onOpenChange={(o) => !o && setAskNoPrice(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">No price yet</DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            <b className="font-semibold">{askNoPrice?.name}</b> has no price, so it can’t be
            switched to Add to Cart. Set the price on the product page first.
          </p>
          <DialogFooter>
            <Button onClick={() => setAskNoPrice(null)}>Cancel</Button>
            <Button
              primary
              onClick={() => {
                if (askNoPrice)
                  navigate({
                    to: "/products/$productId",
                    params: { productId: askNoPrice.id },
                    search: { tab: "Price & action" },
                  });
              }}
            >
              Open product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
