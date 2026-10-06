import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { productsQuery } from "@/lib/api/sections.functions";
import type { ProductRow } from "@/lib/api/section-types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ModeSwitch, SkuChip, StatusBadge, Thumb, Toggle } from "@/components/admin/primitives";
import {
  Button,
  Card,
  DataTable,
  FilterBar,
  FilterSelect,
  PageHeader,
  Pager,
  SearchInput,
  type Column,
} from "@/components/admin/page";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { soon } from "@/hooks/use-toast-lite";
import {
  editProduct,
  editProducts,
  useProducts,
  type ProductEdit,
} from "@/components/admin/ProductFlow";

type Mode = "cart" | "enq";
/** Local edits are shared with the product editor (see ProductFlow). Each change calls your API later. */
type Edit = ProductEdit;

const isCart = (p: ProductRow) => p.mode === "Add to Cart";
const STATUS_OPTIONS = ["In stock", "Low stock", "Out of stock", "Hidden from site", "Draft"];

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="size-4 cursor-pointer accent-[#0a0a0a]"
    />
  );
}

function BulkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-[30px] rounded-lg border border-white/35 px-3.5 text-[12px] text-white hover:border-white"
    >
      {children}
    </button>
  );
}

export default function ProductsPage() {
  const { data } = useSuspenseQuery(productsQuery());
  const navigate = useNavigate();
  const [f, setF] = useState({ q: "", cat: "", brand: "", gender: "", mode: "", status: "" });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [priceFor, setPriceFor] = useState<ProductRow | null>(null);
  const [priceInput, setPriceInput] = useState("");

  const products = useProducts(data.rows);
  const setFilter = (k: keyof typeof f) => (v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setPage(1);
  };
  const edit = (id: string, e: Edit) => editProduct(id, e);

  const q = f.q.toLowerCase();
  const rows = products.filter(
    (p) =>
      (!q || `${p.name}${p.sku}${p.nameAr}`.toLowerCase().includes(q)) &&
      (!f.cat || p.category === f.cat) &&
      (!f.brand || p.brand === f.brand) &&
      (!f.gender || p.gender === f.gender) &&
      (!f.mode || (f.mode === "Add to Cart" ? isCart(p) : !isCart(p))) &&
      (!f.status ||
        (f.status === "Hidden from site"
          ? !p.visible
          : f.status === "Draft"
            ? p.isDraft
            : !p.isDraft && p.status.label === f.status)),
  );
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * pageSize, cur * pageSize);

  const setMode = (p: ProductRow, m: Mode) => {
    if (m === "cart" && !p.price) {
      setPriceFor(p);
      setPriceInput("");
      return;
    }
    edit(p.id, { mode: m === "cart" ? "Add to Cart" : "Enquiry only" });
    toast(`${p.name} → ${m === "cart" ? "Add to Cart" : "Enquiry"}`);
  };
  const savePrice = () => {
    const v = parseInt(priceInput.replace(/[^0-9]/g, ""), 10);
    if (!priceFor) return;
    if (!v) {
      toast("Enter a price");
      return;
    }
    edit(priceFor.id, { price: v, mode: "Add to Cart" });
    toast(`${priceFor.name} now Add to Cart at ${formatNumber(v)} EGP`);
    setPriceFor(null);
  };
  const toggleVisible = (p: ProductRow) => {
    edit(p.id, { visible: !p.visible });
    toast(`${p.name} ${!p.visible ? "is visible on the site" : "is hidden from the site"}`);
  };

  const toggleSel = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allOn = rows.length > 0 && rows.every((p) => sel.has(p.id));
  const toggleAll = () =>
    setSel((s) => {
      const n = new Set(s);
      rows.forEach((p) => (allOn ? n.delete(p.id) : n.add(p.id)));
      return n;
    });
  const bulk = (d: "cart" | "enq" | "hide" | "show") => {
    let n = 0,
      skipped = 0;
    const next: Record<string, Edit> = {};
    products
      .filter((p) => sel.has(p.id))
      .forEach((p) => {
        if (d === "cart") {
          if (p.price) {
            next[p.id] = { mode: "Add to Cart" };
            n++;
          } else skipped++;
        }
        if (d === "enq") {
          next[p.id] = { mode: "Enquiry only" };
          n++;
        }
        if (d === "hide") {
          next[p.id] = { visible: false };
          n++;
        }
        if (d === "show") {
          next[p.id] = { visible: true };
          n++;
        }
      });
    editProducts(next);
    setSel(new Set());
    toast(`${n} products updated${skipped ? ` · ${skipped} without price stayed Enquiry` : ""}`);
  };

  const columns: Column<ProductRow>[] = [
    {
      header: "select",
      headerNode: <Check checked={allOn} onChange={toggleAll} label="Select all" />,
      cell: (p) => (
        <Check
          checked={sel.has(p.id)}
          onChange={() => toggleSel(p.id)}
          label={`Select ${p.name}`}
        />
      ),
    },
    {
      header: "thumb",
      headerNode: "",
      cell: (p) => (
        <button
          type="button"
          title="Manage images"
          onClick={(e) => {
            e.stopPropagation();
            navigate({
              to: "/products/$productId",
              params: { productId: p.id },
              search: { tab: "Images" },
            });
          }}
          className="group relative inline-block"
        >
          <Thumb
            color={p.color}
            className="group-hover:outline group-hover:outline-2 group-hover:outline-offset-2 group-hover:outline-primary"
          />
          <em className="absolute -bottom-1 -right-1.5 rounded-full border border-border bg-surface px-[5px] text-[10px] not-italic">
            {p.imageCount}
          </em>
        </button>
      ),
    },
    {
      header: "Product",
      cell: (p) => (
        <div>
          <b className="font-semibold">{p.name}</b>
          <div className="text-[12px] text-muted-foreground" dir="rtl">
            {p.nameAr}
          </div>
          <div className="text-[13px] text-muted-foreground">
            {p.category} · {p.gender}
          </div>
        </div>
      ),
    },
    {
      header: "SKU",
      cell: (p) =>
        p.sku ? <SkuChip>{p.sku}</SkuChip> : <span className="text-bad">SKU missing</span>,
    },
    { header: "Maison", cell: (p) => p.brand },
    {
      header: "Sell as",
      cell: (p) => (
        <ModeSwitch<Mode>
          title="Change how this product sells"
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
          p.offer ? (
            <>
              <b className="font-semibold whitespace-nowrap">{formatNumber(p.offer)} EGP</b>
              <div className="text-[12px] text-muted-foreground line-through">
                {formatNumber(p.price)}
              </div>
            </>
          ) : (
            <b className="font-semibold whitespace-nowrap">{formatNumber(p.price)} EGP</b>
          )
        ) : (
          <span className="text-muted-foreground">No price</span>
        ),
    },
    { header: "Stock", align: "right", cell: (p) => p.stock },
    {
      header: "On site",
      cell: (p) => (
        <>
          <Toggle
            on={p.visible}
            onChange={() => toggleVisible(p)}
            label={p.visible ? "Visible on site — click to hide" : "Hidden — click to show"}
          />
          {p.hiddenBy && (
            <div className="mt-[5px] max-w-[160px] text-[11.5px] leading-snug text-warn">
              Not on site — {p.hiddenBy}
            </div>
          )}
        </>
      ),
    },
    {
      header: "Status",
      cell: (p) => <StatusBadge tone={p.status.tone}>{p.status.label}</StatusBadge>,
    },
  ];

  const cartN = products.filter(isCart).length;
  return (
    <>
      <PageHeader
        title="Products"
        subtitle={
          <>
            {cartN} <b className="font-semibold text-foreground">Add to Cart</b> ·{" "}
            {products.length - cartN} <b className="font-semibold text-foreground">Enquiry</b> ·{" "}
            {products.filter((p) => !p.visible).length} hidden — switch any product with one click.
          </>
        }
        actions={
          <>
            <Button onClick={soon("Import from Excel")}>Import from Excel</Button>
            <Button onClick={soon("Export")}>Export</Button>
            <Button primary onClick={() => navigate({ to: "/products/new" })}>
              + Add product
            </Button>
          </>
        }
      />
      <Card>
        <FilterBar>
          <SearchInput
            value={f.q}
            onChange={setFilter("q")}
            placeholder="Name, SKU or Arabic name"
          />
          <FilterSelect
            value={f.cat}
            onChange={setFilter("cat")}
            all="All categories"
            options={data.categories}
          />
          <FilterSelect
            value={f.brand}
            onChange={setFilter("brand")}
            all="All maisons"
            options={data.brands}
          />
          <FilterSelect
            value={f.gender}
            onChange={setFilter("gender")}
            all="All genders"
            options={data.genders}
          />
          <FilterSelect
            value={f.mode}
            onChange={setFilter("mode")}
            all="Add to Cart & Enquiry"
            options={["Add to Cart", "Enquiry only"]}
          />
          <FilterSelect
            value={f.status}
            onChange={setFilter("status")}
            all="Any status"
            options={STATUS_OPTIONS}
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
              <span>
                <b className="font-semibold">{sel.size} selected</b>
              </span>
              <BulkButton onClick={() => bulk("cart")}>→ Add to Cart</BulkButton>
              <BulkButton onClick={() => bulk("enq")}>→ Enquiry</BulkButton>
              <BulkButton onClick={() => bulk("hide")}>Hide from site</BulkButton>
              <BulkButton onClick={() => bulk("show")}>Show on site</BulkButton>
              <button
                type="button"
                onClick={() => setSel(new Set())}
                className="text-white/70 underline"
              >
                Clear
              </button>
            </>
          ) : (
            <span>Tick products to change many at once</span>
          )}
        </div>
        <DataTable
          columns={columns}
          rows={shown}
          rowKey={(p) => p.id}
          empty="No products match"
          onRowClick={(p) => navigate({ to: "/products/$productId", params: { productId: p.id } })}
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

      <Dialog open={!!priceFor} onOpenChange={(o) => !o && setPriceFor(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Set a price first
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            {priceFor?.name} has no price yet. Add to Cart needs a price customers can pay.
          </p>
          <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
            Price
            <div className="flex overflow-hidden rounded-lg border border-border">
              <input
                autoFocus
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && savePrice()}
                placeholder="e.g. 3,450"
                className="h-9 flex-1 bg-surface px-3 text-[13px] text-foreground outline-none"
              />
              <span className="grid place-items-center bg-hover px-3 text-[12px]">EGP</span>
            </div>
          </label>
          <DialogFooter>
            <Button onClick={() => setPriceFor(null)}>Cancel</Button>
            <Button primary onClick={savePrice}>
              Save price &amp; switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
