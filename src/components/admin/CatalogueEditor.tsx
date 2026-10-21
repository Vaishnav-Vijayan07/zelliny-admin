// Add / edit a category or a maison. Saves go to the shared catalogue store (CatalogueFlow) — swap for API mutations later.
import { StickyCol } from "@/components/admin/StickyCol";
import { useIsOwner } from "@/pages/StaffPage";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ModeSwitch, Toggle } from "@/components/admin/primitives";
import { Button, DataTable, Pager, SearchInput, type Column } from "@/components/admin/page";
import {
  addBrand,
  addCategory,
  deleteBrand,
  deleteCategory,
  editBrand,
  editCategory,
  isCart,
  setCategoryVisible,
  useCatalogue,
} from "@/components/admin/CatalogueFlow";
import { Dropdown } from "@/components/admin/Dropdown";
import { useStickyFit } from "@/components/admin/useStickyFit";
import { MixBar, useBulkMode, useVisibility } from "@/components/admin/CatalogueUi";
import { editProduct } from "@/components/admin/ProductFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductRow } from "@/lib/api/section-types";

const SORTS = [
  "Newest first",
  "Bestselling",
  "Price: low to high",
  "Price: high to low",
  "Maison A–Z",
];
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
const Swatch = ({
  label,
  c,
  size,
  empty,
}: {
  label: string;
  c: string;
  /** Recommended size and format, shown under the image. */
  size?: string;
  /** A new category has no image yet. */
  empty?: boolean;
}) => (
  <div>
    <div className="mb-1.5 text-[12px] text-muted-foreground">{label}</div>
    {empty ? (
      <button
        type="button"
        onClick={() => toast("Image upload connects to your API later")}
        className="grid aspect-[16/10] w-full place-items-center rounded-lg border-[1.5px] border-dashed border-[#c9c9c9] bg-hover text-[13px] text-muted-foreground hover:border-primary hover:text-foreground"
      >
        + Upload image
      </button>
    ) : (
      <button
        type="button"
        onClick={() => toast("Image upload connects to your API later")}
        className="relative block aspect-[16/10] w-full rounded-lg border border-border"
        style={{
          background: `linear-gradient(145deg, ${c}, color-mix(in srgb, ${c} 55%, #000))`,
        }}
      >
        <em className="absolute bottom-2 right-2.5 text-[10.5px] not-italic text-white/85">
          Replace
        </em>
      </button>
    )}
    {size && <div className="mt-1.5 text-[11.5px] text-muted-foreground">{size}</div>}
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
  const [introEn, setIntroEn] = useState(cat?.introEn ?? "");
  const [introAr, setIntroAr] = useState(cat?.introAr ?? "");
  const [sort, setSort] = useState(cat?.defaultSort ?? SORTS[0]!);
  const [metaTitle, setMetaTitle] = useState(cat?.metaTitle ?? brand?.metaTitle ?? "");
  const [metaTitleAr, setMetaTitleAr] = useState(brand?.metaTitleAr ?? "");
  const [metaEn, setMetaEn] = useState(cat?.metaEn ?? brand?.metaEn ?? "");
  const [metaAr, setMetaAr] = useState(cat?.metaAr ?? brand?.metaAr ?? "");
  const [url, setUrl] = useState(cat?.url ?? brand?.url ?? "");
  const [showNew, setShowNew] = useState(true);
  const [cats2, setCats2] = useState(brand?.categories ?? "");
  const [pq, setPq] = useState("");
  const [pf, setPf] = useState("");
  const [pPage, setPPage] = useState(1);
  const [askNoPrice, setAskNoPrice] = useState<ProductRow | null>(null);
  const [askCategory, setAskCategory] = useState(false);
  const [pick, setPick] = useState("");
  const [askDelete, setAskDelete] = useState(false);
  const owner = useIsOwner();
  // Sticky right column that scrolls with the page when it is taller than the screen.
  const stickRef = useStickyFit(83);

  if (!isNew && !row)
    return <p className="py-24 text-center text-muted-foreground">This {word} was not found.</p>;

  const list: ProductRow[] = row
    ? live.products.filter((p) => (isCat ? p.category : p.brand) === row.name)
    : [];
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  // URL and meta title follow the English name until the team edits them.
  const urlShown = url || slug(en) || word;
  const titleShown = metaTitle || `${en || (isCat ? "Category" : "Maison")} | Zelliny`;

  // Categories are a tick list now — no commas to type.
  const tickedCats = cats2
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const toggleCat = (name: string) => {
    const next = tickedCats.includes(name)
      ? tickedCats.filter((c) => c !== name)
      : [...tickedCats, name];
    setCats2(next.join(", "));
  };

  // Products in this maison: search, filter and 25 per page.
  const q = pq.toLowerCase();
  const pRows = list.filter(
    (p) =>
      (!q || `${p.name}${p.sku}${p.nameAr}`.toLowerCase().includes(q)) &&
      (!pf || (pf === "cart" ? isCart(p) : pf === "enq" ? !isCart(p) && !!p.price : !p.price)),
  );
  const pCur = Math.min(pPage, Math.max(1, Math.ceil(pRows.length / 25)));
  const pShown = pRows.slice((pCur - 1) * 25, pCur * 25);

  // The category this maison shows for in the homepage "Houses we curate" row.
  const featured = !!brand?.featured;
  const featuredCat = brand?.featuredCategory ?? "";
  /** The maison already showing for a category, if any. */
  const occupies = (name: string) =>
    live.brands.find(
      (b) =>
        b.id !== brand?.id &&
        (b.featuredCategory
          ? b.featuredCategory === name
          : b.featured &&
            b.categories
              .split(",")
              .map((s) => s.trim())
              .includes(name)),
    );
  const replaceBrand = pick ? occupies(pick) : undefined;
  /** How many of the 8 homepage places are taken. */
  const placesUsed = live.brands.filter((b) => b.featuredCategory || b.featured).length;
  const openCurate = () => {
    setPick(tickedCats[0] ?? "");
    setAskCategory(true);
  };
  const confirmCurate = () => {
    if (!brand || !pick) return;
    if (replaceBrand) editBrand(replaceBrand.id, { featured: false, featuredCategory: "" });
    editBrand(brand.id, { featured: true, featuredCategory: pick });
    toast(
      `${brand.name} now shows for ${pick}${replaceBrand ? ` — replaced ${replaceBrand.name}` : ""}`,
    );
    setAskCategory(false);
    setPick("");
  };

  const save = () => {
    const name = en.trim();
    if (!name) {
      toast(`Add the English ${word} name first — it is needed to add the ${word}`);
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
        editCategory(cat.id, {
          name,
          nameAr: ar.trim(),
          defaultSort: sort,
          introEn,
          introAr,
          metaTitle,
          metaEn,
          metaAr,
          url,
        });
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
        defaultSort: sort,
        introEn,
        introAr,
        metaTitle,
        metaEn,
        metaAr,
        url: urlShown,
      });
      setCategoryVisible(nid, showNew);
      toast(`${name} added as the last card — drag it to its position on the Categories page.`);
      navigate({ to: "/categories/$categoryId", params: { categoryId: nid } });
      return;
    }
    if (brand) {
      editBrand(brand.id, {
        name,
        nameAr: ar.trim(),
        categories: cats2.trim(),
        metaTitle,
        metaTitleAr,
        metaEn,
        metaAr,
        url,
      });
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
  // A new category has no products yet: only the show/hide switch.
  const newSellCard = isNew && (
    <Card title="Selling & visibility">
      <div className="flex items-center justify-between gap-3.5">
        <div>
          <div className="text-[13.5px]">Show this {word} on the site</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            Off keeps the {word} hidden until you are ready
          </div>
        </div>
        <Toggle
          on={showNew}
          onChange={() => setShowNew((v) => !v)}
          label={showNew ? "On site — click to hide" : "Hidden — click to show"}
        />
      </div>
    </Card>
  );
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
              setAskNoPrice(p);
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
      <div className="grid gap-[18px] min-[981px]:grid-cols-[minmax(0,1fr)_320px]">
        {/* The last card on the left stretches, so both columns end at the same level. */}
        <div className="flex min-w-0 flex-col [&>section:last-child]:mb-0 [&>section:last-child]:flex-1">
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
              <div className="mb-3.5">
                <span className="flex items-center justify-between text-[12px] text-muted-foreground">
                  Categories
                  <Link
                    to="/categories/new"
                    className="text-[12.5px] text-muted-foreground underline underline-offset-[3px] hover:text-foreground"
                  >
                    + Add category
                  </Link>
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {live.categories.map((c) => {
                    const on = tickedCats.includes(c.name);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCat(c.name)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-surface hover:border-primary",
                        )}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
                <span className="mt-2 block text-[12px] text-muted-foreground">
                  Tick the categories this maison sells in — it then appears under them on the site.
                </span>
              </div>
            )}
          </Card>
          <Card title={isCat ? "Images" : "Logo & imagery"}>
            {isCat ? (
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Swatch
                  label="Category tile (homepage & index)"
                  c="#cdb8a3"
                  empty={isNew}
                  size="Recommended 1200 × 1200 px · square"
                />
                <Swatch
                  label="Mega-menu image"
                  c="#a78c72"
                  empty={isNew}
                  size="Recommended 800 × 600 px"
                />
                <Swatch
                  label="Mobile band image"
                  c="#8a735f"
                  empty={isNew}
                  size="Recommended 1080 × 640 px"
                />
                <Swatch
                  label="Category page banner"
                  c="#6d5a4a"
                  empty={isNew}
                  size="Recommended 2400 × 800 px · JPG or WebP"
                />
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-3">
                <Swatch
                  label="Logo (black)"
                  c="#e8e8e8"
                  size="Recommended: Transparent PNG or SVG · 600 × 200 px"
                />
                <Swatch
                  label="Logo (white)"
                  c="#0a0a0a"
                  size="Recommended: Transparent PNG or SVG · 600 × 200 px"
                />
                <Swatch
                  label="Mega-menu “Spotlight” image"
                  c="#9c8a78"
                  size="Recommended: JPG or WebP · 800 × 1000 px"
                />
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
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <SearchInput
                  value={pq}
                  onChange={(v) => {
                    setPq(v);
                    setPPage(1);
                  }}
                  placeholder={`Search products in ${row.name}`}
                />
                <span className="inline-flex h-9 items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5">
                  {(
                    [
                      ["all", "All"],
                      ["cart", "Add to Cart"],
                      ["enq", "Enquiry"],
                      ["np", "No price"],
                    ] as const
                  ).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setPf(v === "all" ? "" : v);
                        setPPage(1);
                      }}
                      className={cn(
                        "whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors",
                        (pf || "all") === v
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </span>
              </div>
              <DataTable
                columns={productColumns}
                rows={pShown}
                rowKey={(p) => p.id}
                empty="No products match."
              />
              <Pager
                page={pCur}
                pageSize={25}
                total={pRows.length}
                noun="products"
                onPage={setPPage}
                onPageSize={() => setPPage(1)}
                hideSize
              />
            </Card>
          )}
        </div>
        <StickyCol>
          <div
            ref={stickRef}
            className="min-[981px]:sticky min-[981px]:top-[83px] flex min-w-0 flex-col [&>section:last-child]:mb-0"
          >
            {sellCard}
            {newSellCard}
            <Card title={isCat ? "Settings" : "Placement"}>
              {isCat ? (
                <>
                  <Field
                    label="Default sort"
                    hint="Sets the order products appear in on this category page."
                  >
                    <Dropdown
                      value={sort}
                      onChange={setSort}
                      className="h-9 w-full text-[14px] text-foreground"
                      options={SORTS.map((o) => ({ value: o, label: o }))}
                    />
                  </Field>
                  <Row label="Show in main menu" init />
                  <Row label="Show on homepage grid" init />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3.5 border-b border-line-soft py-2.5">
                    <div>
                      <div className="text-[13.5px]">Show in homepage “Houses we curate”</div>
                      <div className="mt-0.5 text-[12px] text-muted-foreground">
                        8 logos max — one per category
                        {featuredCat && (
                          <>
                            {" · showing for "}
                            <b className="font-medium text-foreground">{featuredCat}</b>
                          </>
                        )}
                      </div>
                    </div>
                    <Toggle
                      on={featured}
                      onChange={() => {
                        if (!brand) return;
                        if (featured) {
                          editBrand(brand.id, { featured: false, featuredCategory: "" });
                          return;
                        }
                        openCurate();
                      }}
                      label={featured ? "Showing — click to remove" : "Hidden — click to add"}
                    />
                  </div>
                  <Row label="Show in mega-menu Brands panel" init />
                  <Row label="Show on Maisons index page" init />
                </>
              )}
            </Card>
            <Card title="SEO">
              <Field
                label="URL"
                hint="Created automatically from the English name — accents become plain letters (Hermès → hermes)."
              >
                <input
                  value={`zelliny.com/en/${urlShown}`}
                  onChange={(e) => setUrl(e.target.value.replace(/^zelliny\.com\/en\//, ""))}
                  className={inputCls}
                />
              </Field>
              <Bilingual
                label="Meta title"
                en={titleShown}
                ar={metaTitleAr || (ar ? `${ar} | زيليني` : "")}
                onEn={setMetaTitle}
                onAr={setMetaTitleAr}
              />
              <Bilingual
                label="Meta description"
                rows={3}
                en={metaEn || introEn}
                ar={metaAr || introAr}
                onEn={setMetaEn}
                onAr={setMetaAr}
              />
              <p className="text-[12px] text-muted-foreground">
                The short text Google shows under the page title. If left empty, it is filled from
                the {isCat ? "short introduction" : "Story"}.
              </p>
            </Card>
          </div>
        </StickyCol>
      </div>
      {row && !isNew && owner && (
        <section className="mt-[18px] rounded-[10px] border border-bad-bg bg-surface">
          <div className="border-b border-bad-bg px-5 py-3.5 text-[10.5px] uppercase tracking-[.16em] text-bad">
            Danger zone
          </div>
          <div className="flex flex-wrap items-center justify-between gap-5 px-5 py-4">
            <p className="max-w-[640px] text-[13px] text-muted-foreground">
              <b className="font-medium text-foreground">Delete this {word} permanently.</b>{" "}
              {list.length > 0 ? (
                <>
                  It has{" "}
                  <b className="font-medium text-foreground">
                    {formatNumber(list.length)} products
                  </b>{" "}
                  — it can’t be deleted. Switch “Show this {word} on the site” off instead.
                </>
              ) : (
                "It has no products, so it can be deleted."
              )}
            </p>
            <Button
              disabled={list.length > 0}
              onClick={() => setAskDelete(true)}
              className="border-bad text-bad enabled:hover:border-bad"
            >
              Delete {word}
            </Button>
          </div>
        </section>
      )}
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

      <Dialog
        open={askCategory}
        onOpenChange={(o) => {
          if (!o) {
            setAskCategory(false);
            setPick("");
          }
        }}
      >
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Show {brand?.name} in “Houses we curate”
            </DialogTitle>
          </DialogHeader>
          {tickedCats.length === 0 ? (
            <>
              <p className="text-[13.5px]">
                The homepage row shows one maison per category — 8 logos at most.
              </p>
              <p className="text-[13px] text-muted-foreground">
                Tick at least one category for {brand?.name} first, then turn this on again.
              </p>
            </>
          ) : (
            <>
              <p className="text-[13.5px]">
                The homepage row shows one maison per category — 8 logos at most. Choose the
                category {brand?.name} represents:
              </p>
              <div className="mt-3.5 flex flex-wrap gap-2">
                {tickedCats.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPick(c)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
                      pick === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface hover:border-primary",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {pick &&
                (replaceBrand ? (
                  <div className="mt-3.5 rounded-lg border border-[#e8d3ae] bg-warn-bg px-3.5 py-3 text-[13px] leading-normal text-warn">
                    <b className="font-semibold">
                      {pick} already shows {replaceBrand.name}.
                    </b>{" "}
                    {brand?.name} will replace it in the homepage row.
                  </div>
                ) : (
                  <p className="mt-3 text-[13px] text-muted-foreground">
                    {pick} has no logo yet. {placesUsed} of 8 places are used.
                  </p>
                ))}
            </>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setAskCategory(false);
                setPick("");
              }}
            >
              Cancel
            </Button>
            <Button primary disabled={!pick} onClick={confirmCurate}>
              {replaceBrand ? `Replace ${replaceBrand.name}` : "Show logo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={askDelete} onOpenChange={setAskDelete}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Delete {row?.name}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">It has no products. This cannot be undone.</p>
          <DialogFooter>
            <Button onClick={() => setAskDelete(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!row) return;
                if (isCat) {
                  deleteCategory(row.id);
                  toast(`${row.name} deleted`);
                  navigate({ to: "/categories" });
                } else {
                  deleteBrand(row.id);
                  toast(`${row.name} deleted`);
                  navigate({ to: "/brands" });
                }
              }}
              className="border-bad bg-bad text-white hover:opacity-90"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {vis.dialog}
      {bulk.dialog}
    </>
  );
}
