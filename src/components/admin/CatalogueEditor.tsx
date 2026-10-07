// Add / edit a category or a maison. Saves go to the shared catalogue store (CatalogueFlow) — swap for API mutations later.
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ModeSwitch, Toggle } from "@/components/admin/primitives";
import { Button, DataTable, type Column } from "@/components/admin/page";
import {
  addBrand,
  addCategory,
  editBrand,
  editCategory,
  isCart,
  useCatalogue,
} from "@/components/admin/CatalogueFlow";
import { MixBar, useBulkMode, useVisibility } from "@/components/admin/CatalogueUi";
import { editProduct } from "@/components/admin/ProductFlow";
import type { ProductRow } from "@/lib/api/section-types";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
const areaCls =
  "w-full min-w-0 resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] leading-normal outline-none focus:border-primary";

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-[18px] min-w-0 rounded-[10px] border border-border bg-surface">
      {title && (
        <div className="px-5 pt-4">
          <h3 className="text-[15px]">{title}</h3>
        </div>
      )}
      <div className={cn("px-5 pb-5", title ? "pt-3" : "pt-4")}>{children}</div>
    </section>
  );
}
function Field({
  label,
  req,
  hint,
  children,
}: {
  label: ReactNode;
  req?: boolean | undefined;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex min-w-0 flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        {label}
        {req && <em className="not-italic text-bad">*</em>}
      </label>
      {children}
      {hint && <div className="mt-0.5 text-[12px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
function Bilingual({
  label,
  en,
  ar,
  onEn,
  onAr,
  rows,
  req,
}: {
  label: string;
  en: string;
  ar: string;
  onEn: (v: string) => void;
  onAr: (v: string) => void;
  rows?: number;
  req?: boolean;
}) {
  const tag = (t: string, dark: boolean) => (
    <span
      className={cn(
        "rounded-[3px] px-1.5 py-px text-[10px] font-semibold tracking-[.08em]",
        dark ? "bg-primary text-primary-foreground" : "bg-[#f0f0f0] text-foreground",
      )}
    >
      {t}
    </span>
  );
  const box = (v: string, on: (v: string) => void, rtl: boolean) =>
    rows ? (
      <textarea
        rows={rows}
        value={v}
        dir={rtl ? "rtl" : undefined}
        onChange={(e) => on(e.target.value)}
        className={cn(areaCls, rtl && "text-right")}
      />
    ) : (
      <input
        value={v}
        dir={rtl ? "rtl" : undefined}
        onChange={(e) => on(e.target.value)}
        className={cn(inputCls, rtl && "text-right")}
      />
    );
  return (
    <div className="mb-1.5">
      <div className="mb-2 text-[13px] font-medium">{label}</div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label={<>{tag("EN", true)} English</>} req={req}>
          {box(en, onEn, false)}
        </Field>
        <Field label={<>{tag("AR", false)} العربية</>}>{box(ar, onAr, true)}</Field>
      </div>
    </div>
  );
}
function Row({ label, hint, init }: { label: string; hint?: string; init: boolean }) {
  const [on, setOn] = useState(init);
  return (
    <div className="flex items-center justify-between gap-3.5 border-b border-line-soft py-2.5 last:border-b-0">
      <div>
        <div className="text-[13.5px]">{label}</div>
        {hint && <div className="mt-0.5 text-[12px] text-muted-foreground">{hint}</div>}
      </div>
      <Toggle on={on} onChange={() => setOn(!on)} label={label} />
    </div>
  );
}
const Swatch = ({ label, c }: { label: string; c: string }) => (
  <div>
    <div className="mb-1.5 text-[12px] text-muted-foreground">{label}</div>
    <button
      type="button"
      onClick={() => toast("Image upload connects to your API later")}
      className="relative block aspect-[16/10] w-full rounded-lg border border-border"
      style={{ background: `linear-gradient(145deg, ${c}, color-mix(in srgb, ${c} 55%, #000))` }}
    >
      <em className="absolute bottom-2 right-2.5 text-[10.5px] not-italic text-white/85">
        Replace
      </em>
    </button>
  </div>
);

export function CatalogueEditor({
  kind,
  id,
}: {
  kind: "category" | "maison";
  id?: string | undefined;
}) {
  const { data: cats } = useSuspenseQuery(categoriesQuery());
  const { data: brands } = useSuspenseQuery(brandsQuery());
  const { data: prods } = useSuspenseQuery(productsQuery());
  const live = useCatalogue(cats, brands, prods.rows);
  const navigate = useNavigate();
  const vis = useVisibility();
  const bulk = useBulkMode();
  const isCat = kind === "category";
  const word = isCat ? "category" : "maison";
  const cat = isCat ? live.categories.find((c) => c.id === id) : undefined;
  const brand = !isCat ? live.brands.find((b) => b.id === id) : undefined;
  const row = cat ?? brand;
  const isNew = !id;

  const [en, setEn] = useState(row?.name ?? "");
  const [ar, setAr] = useState(row?.nameAr ?? "");
  const [introEn, setIntroEn] = useState("");
  const [introAr, setIntroAr] = useState("");
  const [cats2, setCats2] = useState(brand?.categories ?? "");

  if (!isNew && !row)
    return <p className="py-24 text-center text-muted-foreground">This {word} was not found.</p>;

  const list: ProductRow[] = row
    ? live.products.filter((p) => (isCat ? p.category : p.brand) === row.name)
    : [];
  const slug = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const save = () => {
    const name = en.trim();
    if (!name) {
      toast(`Add the English ${word} name first`);
      return;
    }
    const clash = (isCat ? live.categories : live.brands).some(
      (x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase(),
    );
    if (clash) {
      toast(`A ${word} called "${name}" already exists`);
      return;
    }
    if (isCat) {
      if (cat) {
        editCategory(cat.id, { name, nameAr: ar.trim() });
        toast("Category saved");
        return;
      }
      const nid = slug(name) || `cat-${Date.now()}`;
      addCategory({
        id: nid,
        name,
        nameAr: ar.trim(),
        count: 0,
        mode: "Add to Cart",
        order: live.categories.length + 1,
        status: { label: "Active", tone: "ok" },
      });
      toast(`${name} added`);
      navigate({ to: "/categories/$categoryId", params: { categoryId: nid } });
      return;
    }
    if (brand) {
      editBrand(brand.id, { name, nameAr: ar.trim(), categories: cats2.trim() });
      toast("Maison saved");
      return;
    }
    const nid = slug(name) || `maison-${Date.now()}`;
    addBrand({
      id: nid,
      name,
      nameAr: ar.trim(),
      categories: cats2.trim(),
      mode: "Add to Cart",
      count: 0,
      featured: false,
      status: { label: "Active", tone: "ok" },
    });
    toast(`${name} added`);
    navigate({ to: "/brands/$brandId", params: { brandId: nid } });
  };

  const target =
    row &&
    (isCat
      ? ({ kind: "category", row: cat! } as const)
      : ({ kind: "maison", row: brand! } as const));
  const sellCard = row && target && (
    <Card title="Selling & visibility">
      <div className="flex items-center justify-between gap-3.5 border-b border-line-soft pb-3">
        <div>
          <div className="text-[13.5px]">Show this {word} on the site</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            Off hides the {word} page, its menu link and all its products — from search too
          </div>
        </div>
        {vis.toggle(target)}
      </div>
      <div className="mt-3">
        <MixBar list={list} total={row.count} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => bulk.ask(row.name, list, "cart")}>All → Add to Cart</Button>
        <Button onClick={() => bulk.ask(row.name, list, "enq")}>All → Enquiry</Button>
      </div>
      <Link
        to="/selling"
        className="mt-3 inline-block text-[12.5px] underline underline-offset-[3px]"
      >
        Or do it for many at once in Selling control →
      </Link>
    </Card>
  );

  const productColumns: Column<ProductRow>[] = [
    {
      header: "Product",
      cell: (p) => (
        <Link to="/products/$productId" params={{ productId: p.id }} className="font-medium">
          {p.name}
        </Link>
      ),
    },
    {
      header: "Sell as",
      cell: (p) => (
        <ModeSwitch<"cart" | "enq">
          value={isCart(p) ? "cart" : "enq"}
          onChange={(m) => {
            if (m === "cart" && !p.price) {
              toast(`${p.name} has no price yet — set one in the product first`);
              return;
            }
            editProduct(p.id, { mode: m === "cart" ? "Add to Cart" : "Enquiry only" });
          }}
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
        <Toggle
          on={p.visible}
          onChange={() => editProduct(p.id, { visible: !p.visible })}
          label={p.visible ? "On site" : "Hidden"}
        />
      ),
    },
  ];

  const back = isCat ? "/categories" : "/brands";
  return (
    <>
      <div className="mb-[22px]">
        <div className="mb-2 text-[12px] text-muted-foreground">
          <Link to={back} className="underline underline-offset-[3px]">
            {isCat ? "Categories" : "Maisons"}
          </Link>{" "}
          / {row?.name ?? "New"}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight">{isNew ? `Add ${word}` : row!.name}</h1>
            {!isNew && (
              <p className="mt-1 text-muted-foreground">{formatNumber(row!.count)} products</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button primary onClick={save}>
              {isNew ? `Add ${word}` : "Save"}
            </Button>
          </div>
        </div>
      </div>
      <div className="grid items-start gap-[18px] min-[981px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Card title={isCat ? "Name & text" : "Identity"}>
            <Bilingual
              label={isCat ? "Category name" : "Maison name"}
              en={en}
              ar={ar}
              onEn={setEn}
              onAr={setAr}
              req
            />
            <Bilingual
              label={
                isCat
                  ? "Short introduction (top of the category page)"
                  : "Story (brand page introduction)"
              }
              en={introEn}
              ar={introAr}
              onEn={setIntroEn}
              onAr={setIntroAr}
              rows={3}
            />
            {!isCat && (
              <Field label="Categories" hint="Comma separated, e.g. Fragrance, Bags">
                <input
                  value={cats2}
                  onChange={(e) => setCats2(e.target.value)}
                  className={inputCls}
                />
              </Field>
            )}
          </Card>
          <Card title={isCat ? "Images" : "Logo & imagery"}>
            {isCat ? (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Swatch label="Category tile (homepage & index)" c="#cdb8a3" />
                <Swatch label="Mega-menu image" c="#a78c72" />
                <Swatch label="Mobile band image" c="#8a735f" />
                <Swatch label="Category page banner" c="#6d5a4a" />
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-3">
                <Swatch label="Logo (black)" c="#e8e8e8" />
                <Swatch label="Logo (white)" c="#0a0a0a" />
                <Swatch label="Mega-menu “Spotlight” image" c="#9c8a78" />
              </div>
            )}
          </Card>
          {isCat && (
            <Card title="Filters">
              <p className="mb-1 text-[12px] text-muted-foreground">
                Filters shown on the category page:
              </p>
              {["Maison", "Gender", "Price range", "Size", "Concentration"].map((f, i) => (
                <Row key={f} label={f} init={i < 4} />
              ))}
            </Card>
          )}
          {!isCat && row && (
            <Card title="Products in this maison — switch one by one">
              <DataTable
                columns={productColumns}
                rows={list}
                rowKey={(p) => p.id}
                empty="No products yet"
              />
            </Card>
          )}
        </div>
        <div className="min-w-0">
          {sellCard}
          <Card title={isCat ? "Settings" : "Placement"}>
            {isCat ? (
              <>
                <Field label="Default sort">
                  <input type="number" min="0" step="1" value="1" className={inputCls} />
                </Field>
                <Row label="Show in main menu" init />
                <Row label="Show on homepage grid" init />
              </>
            ) : (
              <>
                <Row
                  label="Show in homepage “Houses we curate”"
                  hint="8 logos max — one per category"
                  init={!!brand?.featured}
                />
                <Row label="Show in mega-menu Brands panel" init />
                <Row label="Show on Maisons index page" init />
              </>
            )}
          </Card>
          <Card title="SEO">
            <Field label="URL">
              <input readOnly value={`zelliny.com/en/${slug(en) || word}`} className={inputCls} />
            </Field>
            <Field label="Meta title">
              <input
                readOnly
                value={`${en || (isCat ? "Category" : "Maison")} | Zelliny`}
                className={inputCls}
              />
            </Field>
          </Card>
        </div>
      </div>
      {vis.dialog}
      {bulk.dialog}
    </>
  );
}
