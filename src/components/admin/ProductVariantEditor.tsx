// Product variant editor — one combination of a product (e.g. Size 100 ml / Concentration EDP).
// Opened from Inventory and from the product page. Tabs: General · Images · Shipping · SEO.
import { useSuspenseQuery } from "@tanstack/react-query";
import { DROP_ON, chooseFiles, useFileDrop } from "@/lib/image-upload";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useReducer, useState, type ReactNode } from "react";
import { attributesQuery, productsQuery } from "@/lib/api/sections.functions";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/primitives";
import { Button } from "@/components/admin/page";
import { useAttributes } from "@/components/admin/AttributeFlow";
import { editProducts, stockLabel, useProducts } from "@/components/admin/ProductFlow";
import {
  BiField,
  Fld,
  TouchCtx,
  TxtField,
  imgStyle,
  inputCls,
  useDone,
} from "@/components/admin/SiteContentUi";
import {
  editVariants,
  slugify,
  useVariants,
  withCurrentType,
  type Variant,
} from "@/components/admin/VariantFlow";

const TABS = ["General", "Images", "Shipping", "SEO"] as const;
type Tab = (typeof TABS)[number];

function Card({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-[18px] min-w-0 rounded-[10px] border border-border bg-surface">
      <div className="flex items-center justify-between gap-2.5 px-5 pt-4">
        <h3 className="text-[15px]">{title}</h3>
        {extra}
      </div>
      <div className="px-5 pb-5 pt-3">{children}</div>
    </section>
  );
}

/** A whole-number box that keeps "" while empty. */
function NumField({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      inputMode="numeric"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, "");
        onChange(d === "" ? null : Number(d));
      }}
      className={inputCls}
    />
  );
}

export function ProductVariantEditor({ variantId }: { variantId: string }) {
  const { data: pd } = useSuspenseQuery(productsQuery());
  const { data: ad } = useSuspenseQuery(attributesQuery());
  const attributes = useAttributes(ad);
  const products = useProducts(pd.rows);
  const variantBase = useMemo(() => withCurrentType(pd.rows, products), [pd.rows, products]);
  const variants = useVariants(variantBase, attributes);
  const navigate = useNavigate();
  const [doneNode, done] = useDone();
  const v = variants.find((x) => x.id === variantId);
  const [tab, setTab] = useState<Tab>("General");
  const [draft] = useState<Variant | undefined>(() => (v ? structuredClone(v) : undefined));
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(v ?? null));
  const { over: dropOver, bind: dropBind } = useFileDrop();

  if (!v || !draft)
    return <p className="py-24 text-center text-muted-foreground">This variant was not found.</p>;
  const product = products.find((p) => p.id === v.productId);
  const siblings = variants.filter((x) => x.productId === v.productId);
  const d = draft;
  const dirty = JSON.stringify(d) !== savedJson;
  const stockL = stockLabel(d.stock);

  const save = () => {
    const { id: _id, productId: _p, attrs: _a, label: _l, ...fields } = d;
    editVariants({ [d.id]: fields });
    // the product's stock is the total of all its variants
    const total = siblings.reduce((a, x) => a + (x.id === d.id ? d.stock : x.stock), 0);
    editProducts({ [d.productId]: { stock: total } });
    setSavedJson(JSON.stringify(d));
    done("Variant saved", `${d.name[0]} · ${d.sku} is saved.`);
  };

  const addFiles = (files: File[]) => {
    files
      .slice(0, Math.max(0, 6 - d.images.length))
      .forEach((f) => d.images.push(URL.createObjectURL(f)));
    refresh();
  };
  const replaceFile = (i: number, files: File[]) => {
    const f = files[0];
    if (!f) return;
    d.images[i] = URL.createObjectURL(f);
    refresh();
  };
  const addImages = () => chooseFiles(addFiles, { multiple: true });
  const replaceImage = (i: number) => chooseFiles((f) => replaceFile(i, f));
  const dropAdd = (key: string) => dropBind(key, addFiles, { multiple: true });
  const dropReplace = (i: number) => dropBind(`img${i}`, (f) => replaceFile(i, f));
  const hot = (key: string) => dropOver === key && DROP_ON;
  const removeImage = (i: number) => {
    d.images.splice(i, 1);
    refresh();
  };
  const makeHero = (i: number) => {
    const [x] = d.images.splice(i, 1);
    if (x) d.images.unshift(x);
    refresh();
  };
  const act = "rounded bg-white/90 px-2 py-0.5 text-[11px] text-black hover:bg-white";
  const box = "relative aspect-square overflow-hidden rounded-[10px] border border-border";

  const bodies: Record<Tab, ReactNode> = {
    General: (
      <>
        <Card title="Variant">
          <div className="flex flex-wrap items-center gap-2">
            {d.attrs.length ? (
              d.attrs.map((a) => (
                <span
                  key={a.name}
                  className="rounded-full border border-border px-3 py-1 text-[12.5px]"
                >
                  <span className="text-muted-foreground">{a.name}:</span> {a.value}
                </span>
              ))
            ) : (
              <span className="text-[13px] text-muted-foreground">
                This product has no attributes, so it has one default variant.
              </span>
            )}
          </div>
          <p className="mt-2.5 text-[12px] text-muted-foreground">
            The attribute values come from the product&rsquo;s attributes — change them on the
            product page.
          </p>
        </Card>
        <Card title="Name & description">
          <BiField label="Variant name" labelAr="اسم النسخة" v={d.name} />
          <BiField
            label="Short description (under the title)"
            labelAr="وصف قصير"
            v={d.shortDesc}
            rows={2}
          />
          <BiField label="Full description" labelAr="الوصف الكامل" v={d.desc} rows={5} />
        </Card>
        <Card title="Identification">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Fld label="SKU">
              <TxtField o={d} k="sku" />
            </Fld>
            <Fld label="Barcode (EAN)">
              <TxtField o={d} k="barcode" />
            </Fld>
          </div>
        </Card>
        <Card title="Price & stock">
          <div className="grid gap-3.5 sm:grid-cols-3">
            <Fld label="Price (EGP)">
              <NumField
                value={d.price}
                onChange={(n) => {
                  d.price = n;
                  refresh();
                }}
              />
            </Fld>
            <Fld label="Offer price (EGP)" hint="Empty = no offer">
              <NumField
                value={d.offer}
                onChange={(n) => {
                  d.offer = n;
                  refresh();
                }}
              />
            </Fld>
            <Fld label="Stock on hand" hint={`${stockL} · low stock is 2 pieces or fewer`}>
              <NumField
                value={d.stock}
                onChange={(n) => {
                  d.stock = n ?? 0;
                  refresh();
                }}
              />
            </Fld>
          </div>
        </Card>
      </>
    ),
    Images: (
      <>
        <Card
          title="Variant images"
          extra={
            <span {...dropAdd("btn")} className={cn("rounded-lg", hot("btn"))}>
              <Button onClick={addImages}>Upload images</Button>
            </span>
          }
        >
          <div className="grid gap-[22px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div>
              <div className="mb-2.5 flex flex-col">
                <b className="text-[13.5px] font-medium">Hero image</b>
                <span className="text-[12px] text-muted-foreground">
                  Shown when this variant is chosen on the product page
                </span>
              </div>
              {d.images[0] ? (
                <div
                  {...dropReplace(0)}
                  className={cn(box, "w-full", hot("img0"))}
                  style={imgStyle(d.images[0])}
                >
                  <span className="absolute left-2.5 top-2.5 rounded bg-white px-[9px] py-[3px] text-[10.5px] font-semibold tracking-[.14em] text-black">
                    HERO
                  </span>
                  <span className="absolute bottom-2.5 right-2.5 flex gap-1.5">
                    <button type="button" className={act} onClick={() => replaceImage(0)}>
                      Replace
                    </button>
                    <button type="button" className={act} onClick={() => removeImage(0)}>
                      Remove
                    </button>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={addImages}
                  {...dropAdd("hero")}
                  className={cn(
                    box,
                    "grid w-full place-items-center border-dashed bg-[#f7f7f7] text-[13px] text-muted-foreground",
                    hot("hero"),
                  )}
                >
                  + Upload hero image · or drop it here
                </button>
              )}
            </div>
            <div>
              <div className="mb-2.5 flex flex-col">
                <b className="text-[13.5px] font-medium">Gallery</b>
                <span className="text-[12px] text-muted-foreground">
                  {Math.max(d.images.length - 1, 0)} of 5 · shown on the product page
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {d.images.slice(1).map((src, k) => {
                  const i = k + 1;
                  return (
                    <div
                      key={`${i}-${src.slice(-24)}`}
                      {...dropReplace(i)}
                      className={cn(box, hot(`img${i}`))}
                      style={imgStyle(src)}
                    >
                      <span className="absolute left-2 top-2 grid size-[22px] place-items-center rounded-full bg-white/90 text-[11px] text-black">
                        {i + 1}
                      </span>
                      <span className="absolute bottom-2 right-2 flex gap-1">
                        <button type="button" className={act} onClick={() => makeHero(i)}>
                          ★ Hero
                        </button>
                        <button type="button" className={act} onClick={() => replaceImage(i)}>
                          Replace
                        </button>
                        <button type="button" className={act} onClick={() => removeImage(i)}>
                          ✕
                        </button>
                      </span>
                    </div>
                  );
                })}
                {d.images.length < 6 && (
                  <button
                    type="button"
                    onClick={addImages}
                    {...dropAdd("gallery")}
                    className={cn(
                      box,
                      "grid place-items-center border-dashed bg-[#f7f7f7] text-[12.5px] text-muted-foreground",
                      hot("gallery"),
                    )}
                  >
                    + Add image · or drop
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-[18px] gap-y-2 border-t border-line-soft pt-3.5 text-[12px] text-muted-foreground">
            <span>★ Hero makes an image the main one</span>
            <span>Replace swaps one image without touching the rest</span>
            <span>Recommended: square, 2000 × 2000 px, white or lifestyle background</span>
          </div>
        </Card>
        <Card title="Image text (for Google & accessibility)">
          <BiField label="Alt text" labelAr="النص البديل" v={d.alt} />
        </Card>
      </>
    ),
    Shipping: (
      <Card title="Size & weight">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Fld label="Weight (g)">
            <TxtField o={d} k="weight" />
          </Fld>
          <Fld label="Length (cm)">
            <TxtField o={d} k="length" placeholder="e.g. 12" />
          </Fld>
          <Fld label="Width (cm)">
            <TxtField o={d} k="width" placeholder="e.g. 8" />
          </Fld>
          <Fld label="Height (cm)">
            <TxtField o={d} k="height" placeholder="e.g. 15" />
          </Fld>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Packed size of this variant, used by the courier to price the parcel.
        </p>
      </Card>
    ),
    SEO: (
      <Card title="Search engines & sharing">
        <BiField
          label="Page title"
          labelAr="عنوان الصفحة"
          v={d.seoTitle}
          phEn={`${d.name[0]} | Zelliny`}
          phAr={`${d.name[1]} | زيليني`}
        />
        <BiField
          label="Meta description"
          labelAr="الوصف"
          v={d.meta}
          rows={2}
          phEn={`Shop ${d.name[0]} at Zelliny — authentic luxury, delivered across Egypt.`}
          phAr={`تسوق ${d.name[1]} من زيليني — فخامة أصلية تصلك في جميع أنحاء مصر.`}
        />
        <Fld
          label="URL"
          hint="Created automatically from the product and variant names — edit only if needed."
        >
          <input
            value={`zelliny.com/en/${d.url}`}
            onChange={(e) => {
              d.url = slugify(e.target.value.replace(/^zelliny\.com\/en\//, "")) || d.url;
              refresh();
            }}
            className={inputCls}
          />
        </Fld>
        <div className="rounded-lg border border-border bg-hover p-3.5">
          <div className="text-[12px] text-muted-foreground">
            zelliny.com › {(product?.category ?? "").toLowerCase()}
          </div>
          <div className="my-0.5 text-[17px] text-[#1a0dab]">
            {d.seoTitle[0] || `${d.name[0]} | Zelliny`}
          </div>
          <div className="text-[13px] text-muted-foreground">
            {d.meta[0] ||
              `Shop ${d.name[0]} at Zelliny — authentic luxury, delivered across Egypt.`}
          </div>
        </div>
      </Card>
    ),
  };

  return (
    <TouchCtx.Provider value={refresh}>
      <div className="mb-[22px]">
        <div className="mb-2 text-[12px] text-muted-foreground">
          <Link to="/inventory" className="underline underline-offset-[3px]">
            Inventory
          </Link>{" "}
          /{" "}
          <Link
            to="/products/$productId"
            params={{ productId: v.productId }}
            className="underline underline-offset-[3px]"
          >
            {product?.name ?? v.productId}
          </Link>{" "}
          / {v.label}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight">{d.name[0] || v.label}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
              {d.sku || "No SKU"} · {v.label} ·{" "}
              <StatusBadge
                tone={stockL === "In stock" ? "ok" : stockL === "Low stock" ? "warn" : "bad"}
              >
                {stockL}
              </StatusBadge>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() =>
                navigate({ to: "/products/$productId", params: { productId: v.productId } })
              }
            >
              Open product
            </Button>
            <Button primary onClick={save} disabled={!dirty}>
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-[18px] flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
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
      {bodies[tab]}
      {doneNode}
    </TouchCtx.Provider>
  );
}
