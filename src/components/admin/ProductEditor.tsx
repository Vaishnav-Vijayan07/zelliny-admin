// The product editor (prototype `P.product`), used for "+ Add product" and for each existing product.
// Saves go to the shared product store (ProductFlow) — swap for API mutations later.
import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useSuspenseQuery } from "@tanstack/react-query";
import { attributesQuery } from "@/lib/api/sections.functions";
import { useAttributes } from "@/components/admin/AttributeFlow";
import type { ProductRow } from "@/lib/api/section-types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ModeSwitch, StatusBadge, Toggle } from "@/components/admin/primitives";
import { addProduct, deleteProduct, editProduct, statusOf } from "@/components/admin/ProductFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const PRODUCT_TABS = ["General", "Price & action", "Images", "Shipping", "SEO"] as const;
export type ProductTab = (typeof PRODUCT_TABS)[number];
type Mode = "cart" | "enq";
type Variant = {
  key: string;
  label: string;
  sku: string;
  price: string;
  offer: string;
  stock: string;
};
/** Site-wide gift services. Switched on or off only in Gift services — the product page just shows the state. */
const GIFT_FEATURES = [
  { key: "giftwrap", name: "Gift wrapping", live: true },
  { key: "engraving", name: "Engraving & embossing", live: false },
] as const;

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
const toNum = (v: string) => parseInt(v.replace(/[^0-9]/g, ""), 10) || 0;

/* ---------- small building blocks (prototype helpers) ---------- */

function Btn({
  primary,
  children,
  onClick,
  danger,
  disabled,
}: {
  primary?: boolean;
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-9 whitespace-nowrap rounded-lg border px-3.5 text-[13px] transition disabled:pointer-events-none disabled:opacity-40",
        primary
          ? "border-primary bg-primary text-primary-foreground hover:opacity-[.88]"
          : danger
            ? "border-bad text-bad hover:bg-bad hover:text-white"
            : "border-border bg-surface hover:border-primary",
      )}
    >
      {children}
    </button>
  );
}

function Card({
  title,
  extra,
  children,
}: {
  title?: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-[18px] min-w-0 rounded-[10px] border border-border bg-surface">
      {title && (
        <div className="flex items-center justify-between gap-2.5 px-5 pt-4">
          <h3 className="text-[15px]">{title}</h3>
          <div>{extra}</div>
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
  req?: boolean;
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

function Input({
  value,
  defaultValue,
  onChange,
  placeholder,
  rtl,
  readOnly,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  rtl?: boolean;
  readOnly?: boolean;
}) {
  return (
    <input
      value={value}
      defaultValue={defaultValue}
      readOnly={readOnly}
      onChange={onChange && ((e) => onChange(e.target.value))}
      placeholder={placeholder}
      dir={rtl ? "rtl" : undefined}
      className={cn(inputCls, rtl && "text-right")}
    />
  );
}

function Select({
  value,
  defaultValue,
  onChange,
  options,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      defaultValue={defaultValue}
      onChange={onChange && ((e) => onChange(e.target.value))}
      className={cn(inputCls, "cursor-pointer")}
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}

/** English + Arabic side by side (prototype `bi`). */
function Bilingual({
  label,
  en,
  ar,
  rows,
  onEn,
  onAr,
}: {
  label: string;
  en: string;
  ar: string;
  rows?: number;
  onEn?: (v: string) => void;
  onAr?: (v: string) => void;
}) {
  const lang = (t: string, dark: boolean) => (
    <span
      className={cn(
        "rounded-[3px] px-1.5 py-px text-[10px] font-semibold tracking-[.08em]",
        dark ? "bg-primary text-primary-foreground" : "bg-[#f0f0f0] text-foreground",
      )}
    >
      {t}
    </span>
  );
  const box = (v: string, on: ((v: string) => void) | undefined, ar: boolean) => {
    const common = {
      dir: ar ? "rtl" : undefined,
      ...(on
        ? { value: v, onChange: (e: { target: { value: string } }) => on(e.target.value) }
        : { defaultValue: v }),
    };
    return rows ? (
      <textarea
        rows={rows}
        {...common}
        className={cn(
          "w-full min-w-0 resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] leading-normal outline-none focus:border-primary",
          ar && "text-right",
        )}
      />
    ) : (
      <input {...common} className={cn(inputCls, ar && "text-right")} />
    );
  };
  return (
    <div className="mb-1.5">
      <div className="mb-2 text-[13px] font-medium">{label}</div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label={<>{lang("EN", true)} English</>}>{box(en, onEn, false)}</Field>
        <Field label={<>{lang("AR", false)} العربية</>}>{box(ar, onAr, true)}</Field>
      </div>
    </div>
  );
}

/** Label + hint + on/off switch (prototype `toggle`). Local only, like the prototype. */
function ToggleRow({ label, hint, initial }: { label: string; hint?: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
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

/** "Gift wrapping is live / switched off on the whole site" — the switch itself is only in Gift services. */
function FeatureNote({ name, live }: { name: string; live: boolean }) {
  return (
    <div className="mb-[18px] flex items-center gap-3 rounded-[10px] border border-border px-3.5 py-2.5 text-[12.5px] text-muted-foreground">
      <span
        className={cn(
          "size-2 flex-none rounded-full border-2",
          live ? "border-good bg-good" : "border-muted-foreground",
        )}
      />
      <div className="flex-1">
        <b className="font-medium text-foreground">{name}</b> is{" "}
        {live ? "live on the site" : "switched off on the whole site"}. The on/off switch is only in
        Gift services.
      </div>
      <Link
        to="/$section"
        params={{ section: "gifting" }}
        className="whitespace-nowrap text-foreground underline"
      >
        Open Gift services →
      </Link>
    </div>
  );
}

const Grid = ({ cols, children }: { cols: 2 | 3; children: ReactNode }) => (
  <div className={cn("grid gap-3.5", cols === 2 ? "sm:grid-cols-2" : "lg:grid-cols-3")}>
    {children}
  </div>
);

/** An image is either an uploaded file or (for sample data) a colour swatch. */
type Img = { src?: string; c?: string; v: number };
const imgStyle = (im: Img) =>
  im.src
    ? { backgroundImage: `url('${im.src}')` }
    : {
        background: `linear-gradient(145deg, ${im.c ?? "#ddd"}, color-mix(in srgb, ${im.c ?? "#ddd"} 55%, #000))`,
        filter: `brightness(${1 - im.v * 0.09}) saturate(${1 - im.v * 0.05})`,
      };

const MODE_CHIP: Record<string, string> = {
  "Add to Cart": "border-primary bg-primary text-primary-foreground",
  "Enquiry only": "border-dashed border-border",
};

/* ---------- editor ---------- */

export function ProductEditor({
  product,
  brands,
  categories,
  initialTab = "General",
}: {
  product: ProductRow | null;
  brands: string[];
  categories: string[];
  initialTab?: ProductTab;
}) {
  const navigate = useNavigate();
  const isNew = !product;
  const [tab, setTab] = useState<ProductTab>(initialTab);
  const [p, setP] = useState(() =>
    product
      ? {
          en: product.name,
          ar: product.nameAr,
          brand: product.brand,
          category: product.category,
          gender: product.gender as string,
          mode: (product.mode === "Add to Cart" ? "cart" : "enq") as Mode,
          price: product.price ? formatNumber(product.price) : "",
          offer: product.offer ? formatNumber(product.offer) : "",
          sku: product.sku,
          stock: String(product.stock),
          visible: product.visible,
          status: product.isDraft ? "Draft" : "Published",
        }
      : {
          en: "",
          ar: "",
          brand: brands.includes("Hermès") ? "Hermès" : (brands[0] ?? ""),
          category: categories.includes("Fragrance") ? "Fragrance" : (categories[0] ?? ""),
          gender: "Unisex",
          mode: "cart" as Mode,
          price: "",
          offer: "",
          sku: "",
          stock: "0",
          visible: false,
          status: "Draft",
        },
  );
  const set =
    <K extends keyof typeof p>(k: K) =>
    (v: (typeof p)[K]) =>
      setP((x) => ({ ...x, [k]: v }));
  const [imgs, setImgs] = useState<Img[]>(() =>
    product ? Array.from({ length: product.imageCount }, (_, v) => ({ c: product.color, v })) : [],
  );
  const { data: attrData } = useSuspenseQuery(attributesQuery());
  const attributes = useAttributes(attrData).filter(
    (a) => a.status.label !== "Inactive" && a.values.length > 0,
  );
  const [productType, setProductType] = useState<"simple" | "variable">("simple");
  /** attribute id → ticked value ids */
  const [attrSel, setAttrSel] = useState<Record<string, string[]>>({});
  const [variants, setVariants] = useState<Variant[]>([]);
  const [publishDate, setPublishDate] = useState("");
  const [askPrice, setAskPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [askDelete, setAskDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<(srcs: string[]) => void>(() => {});
  const dragFrom = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const isVariable = productType === "variable";
  const vPrices = variants.map((v) => toNum(v.price)).filter(Boolean);
  const vOffers = variants.map((v) => toNum(v.offer)).filter(Boolean);
  const price = isVariable ? (vPrices.length ? Math.min(...vPrices) : 0) : toNum(p.price);
  const offer = isVariable ? (vOffers.length ? Math.min(...vOffers) : 0) : toNum(p.offer);
  const totalStock = isVariable ? variants.reduce((a, v) => a + toNum(v.stock), 0) : toNum(p.stock);
  const isCart = p.mode === "cart";
  const name = p.en || "This product";

  const toggleAttr = (id: string) =>
    setAttrSel((s) => {
      const n = { ...s };
      if (n[id]) delete n[id];
      else n[id] = [];
      return n;
    });
  const toggleVal = (aid: string, vid: string) =>
    setAttrSel((s) => {
      const cur = s[aid] ?? [];
      return { ...s, [aid]: cur.includes(vid) ? cur.filter((x) => x !== vid) : [...cur, vid] };
    });
  const generate = () => {
    const chosen = attributes.filter((a) => (attrSel[a.id] ?? []).length > 0);
    if (!chosen.length) {
      toast("Tick an attribute and at least one of its values first");
      return;
    }
    let combos: { key: string; label: string }[] = [{ key: "", label: "" }];
    chosen.forEach((a) => {
      const vals = a.values.filter((v) => (attrSel[a.id] ?? []).includes(v.id));
      combos = combos.flatMap((c) =>
        vals.map((v) => ({
          key: c.key ? `${c.key}|${v.id}` : v.id,
          label: c.label ? `${c.label} / ${v.value}` : v.value,
        })),
      );
    });
    const old = new Map(variants.map((v) => [v.key, v]));
    const base = p.sku.trim() || "SKU";
    setVariants(
      combos.map(
        (c, i) =>
          old.get(c.key) ?? {
            key: c.key,
            label: c.label,
            sku: `${base}-${String(i + 1).padStart(2, "0")}`,
            price: "",
            offer: "",
            stock: "0",
          },
      ),
    );
    toast(
      `${combos.length} combination${combos.length === 1 ? "" : "s"} generated — add each price`,
    );
  };
  const setVar = (key: string, patch: Partial<Variant>) =>
    setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, ...patch } : v)));

  const setMode = (m: Mode) => {
    if (m === "cart" && !price) {
      if (isVariable) {
        setTab("Price & action");
        toast("Generate the combinations and add their prices first");
        return;
      }
      setPriceInput("");
      setAskPrice(true);
      return;
    }
    set("mode")(m);
    if (product) editProduct(product.id, { mode: m === "cart" ? "Add to Cart" : "Enquiry only" });
    toast(`${name} → ${m === "cart" ? "Add to Cart" : "Enquiry"}`);
  };
  const savePrice = () => {
    const v = toNum(priceInput);
    if (!v) {
      toast("Enter a price");
      return;
    }
    setP((x) => ({ ...x, price: formatNumber(v), mode: "cart" }));
    if (product) editProduct(product.id, { price: v, mode: "Add to Cart" });
    setAskPrice(false);
    toast(`${name} now Add to Cart at ${formatNumber(v)} EGP`);
  };
  const setVisible = () => {
    const v = !p.visible;
    set("visible")(v);
    if (product) editProduct(product.id, { visible: v });
    toast(`${name} ${v ? "is visible on the site" : "is hidden from the site"}`);
  };

  /* save / publish / duplicate / delete */
  const fields = (publish: boolean): Omit<ProductRow, "id"> => {
    const isDraft = publish ? false : p.status === "Draft";
    const stock = totalStock;
    return {
      sku: (isVariable ? (variants[0]?.sku ?? p.sku) : p.sku).trim(),
      name: p.en.trim(),
      nameAr: p.ar.trim(),
      brand: p.brand,
      category: p.category,
      gender: p.gender as ProductRow["gender"],
      mode: isCart ? "Add to Cart" : "Enquiry only",
      price: price || null,
      offer: offer || null,
      stock,
      sold: product?.sold ?? 0,
      enquiries: product?.enquiries ?? 0,
      status: statusOf(stock, isDraft),
      color: product?.color ?? "#e8e8e8",
      visible: publish ? true : p.visible,
      imageCount: imgs.length,
      hiddenBy: product?.hiddenBy ?? null,
      isDraft,
    };
  };
  const save = (publish: boolean) => {
    if (!p.en.trim()) {
      setTab("General");
      toast("Add the English product name first");
      return;
    }
    if (publish && !isVariable && !p.sku.trim()) {
      setTab("General");
      toast("Add the SKU before publishing");
      return;
    }
    if (p.status === "Scheduled" && !publishDate) {
      toast("Choose the date this product goes live");
      return;
    }
    if (isVariable && !variants.length) {
      setTab("Price & action");
      toast("Generate the combinations for this variable product");
      return;
    }
    if (isVariable && variants.some((v) => !v.sku.trim())) {
      setTab("Price & action");
      toast("Every combination needs a SKU");
      return;
    }
    if (publish && isCart && (isVariable ? variants.some((v) => !toNum(v.price)) : !price)) {
      setTab("Price & action");
      toast(
        isVariable
          ? "Every combination needs a price"
          : "Add to Cart needs a price — set one, or switch to Enquiry",
      );
      return;
    }
    if (product) {
      editProduct(product.id, fields(publish));
      if (publish) setP((x) => ({ ...x, status: "Published", visible: true }));
      toast(publish ? "Product published" : "Saved");
      return;
    }
    const id = `P${9000 + Math.floor(Math.random() * 999)}`;
    addProduct({ id, ...fields(publish) });
    toast(publish ? "Product published" : "Saved as draft");
    navigate({ to: "/products/$productId", params: { productId: id } });
  };
  const duplicate = () => {
    if (!product) return;
    const id = `P${9000 + Math.floor(Math.random() * 999)}`;
    addProduct({
      ...product,
      ...fields(false),
      id,
      sku: "",
      name: `${p.en} (copy)`,
      isDraft: true,
      visible: false,
      status: statusOf(totalStock, true),
      sold: 0,
      enquiries: 0,
    });
    toast("Product duplicated as Draft");
    navigate({ to: "/products/$productId", params: { productId: id } });
  };
  const used = !!product && (product.sold > 0 || product.enquiries > 0);
  const doDelete = () => {
    if (!product || confirmText.trim().toUpperCase() !== "DELETE") {
      toast("Type DELETE to confirm");
      return;
    }
    deleteProduct(product.id);
    setAskDelete(false);
    toast(`${product.name} deleted`);
    navigate({ to: "/products" });
  };

  /* images */
  const pickFiles = (multi: boolean, cb: (srcs: string[]) => void) => {
    const el = fileRef.current;
    if (!el) return;
    el.multiple = multi;
    pickRef.current = cb;
    el.value = "";
    el.click();
  };
  const onFiles = (files: FileList | null) => {
    Promise.all(
      [...(files ?? [])].map(
        (f) =>
          new Promise<string>((r) => {
            const fr = new FileReader();
            fr.onload = () => r(String(fr.result));
            fr.readAsDataURL(f);
          }),
      ),
    ).then(pickRef.current);
  };
  const imgAdd = () =>
    pickFiles(true, (srcs) => {
      const room = 6 - imgs.length;
      setImgs((x) => [...x, ...srcs.slice(0, room).map((src) => ({ src, v: 0 }))]);
      toast(
        `${Math.min(srcs.length, room)} image(s) added${srcs.length > room ? " · max 6 per product" : ""}`,
      );
    });
  const imgReplace = (i: number) =>
    pickFiles(false, (srcs) => {
      const src = srcs[0];
      if (!src) return;
      setImgs((x) => x.map((s, k) => (k === i ? { src, v: 0 } : s)));
      toast(i === 0 ? "Hero image replaced" : `Image ${i + 1} replaced`);
    });
  const imgRemove = (i: number) => {
    setImgs((x) => x.filter((_, k) => k !== i));
    toast(i === 0 ? "Hero removed — next image is now the hero" : "Image removed");
  };
  const move = (from: number, to: number) =>
    setImgs((x) => {
      const n = [...x];
      const [im] = n.splice(from, 1);
      if (im) n.splice(to, 0, im);
      return n;
    });
  const imgHero = (i: number) => {
    move(i, 0);
    toast("New hero image set");
  };
  const dragProps = (i: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      dragFrom.current = i;
      e.dataTransfer.effectAllowed = "move";
    },
    onDragOver: (e: DragEvent) => {
      if (dragFrom.current !== null) {
        e.preventDefault();
        setOver(i);
      }
    },
    onDragEnd: () => {
      dragFrom.current = null;
      setOver(null);
    },
    onDrop: (e: DragEvent) => {
      if (dragFrom.current === null) return;
      e.preventDefault();
      move(dragFrom.current, i);
      dragFrom.current = null;
      setOver(null);
      toast(i === 0 ? "New hero image set" : "Image order saved");
    },
  });
  const imgBox = (i: number, extra?: string) =>
    cn(
      "group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-border bg-cover bg-center transition hover:shadow-[0_6px_20px_rgba(0,0,0,.12)]",
      dragFrom.current === i && "opacity-40",
      over === i && "scale-[1.02] outline-2 outline-dashed outline-offset-[3px] outline-primary",
      extra,
    );
  const imgActs = (children: ReactNode) => (
    <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-1 bg-gradient-to-b from-transparent to-black/55 p-2 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
      {children}
    </div>
  );
  const imgAct = (label: ReactNode, onClick: () => void, title?: string) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-full bg-white px-[9px] py-1 text-[11px] text-black hover:bg-black hover:text-white"
    >
      {label}
    </button>
  );
  const emptyBox =
    "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-[#c9c9c9] bg-hover text-[13px] text-muted-foreground hover:border-primary hover:text-foreground";

  const pricePreview = !isCart ? (
    "Price on request"
  ) : offer ? (
    <>
      {formatNumber(offer)} EGP{" "}
      <s className="ml-1.5 text-muted-foreground">{formatNumber(price)} EGP</s>
    </>
  ) : price ? (
    `${formatNumber(price)} EGP`
  ) : (
    "—"
  );
  const live = statusOf(totalStock, p.status === "Draft");

  const bodies: Record<ProductTab, ReactNode> = {
    General: (
      <>
        <Card title="Name & description">
          <Bilingual label="Product name" en={p.en} ar={p.ar} onEn={set("en")} onAr={set("ar")} />
          <Bilingual
            label="Short description (under the title)"
            en={isNew ? "" : "A warm, woody signature — vetiver, orange and flint."}
            ar={isNew ? "" : "توقيع دافئ خشبي — نجيل الهند والبرتقال والصوان."}
            rows={2}
          />
          <Bilingual label="Full description" en="" ar="" rows={5} />
          <Bilingual label="Notes / key details (bullet list)" en="" ar="" rows={3} />
        </Card>
        <Card title="Identification">
          <Grid cols={2}>
            <Field
              label={isVariable ? "Base SKU" : "SKU"}
              req={!isVariable}
              hint={isVariable ? "Each combination gets its own SKU in Price & action" : undefined}
            >
              <Input value={p.sku} onChange={set("sku")} />
            </Field>
            <Field label="Barcode (EAN)">
              <Input defaultValue="3346131400423" />
            </Field>
          </Grid>
        </Card>
        <Card title="Organisation">
          <Grid cols={2}>
            <Field label="Maison" req>
              <Select value={p.brand} onChange={set("brand")} options={brands} />
            </Field>
            <Field label="Category" req>
              <Select value={p.category} onChange={set("category")} options={categories} />
            </Field>
          </Grid>
          <Grid cols={2}>
            <Field
              label="Gender"
              hint="Unisex products appear under both Women and Men on the site"
            >
              <Select
                value={p.gender}
                onChange={set("gender")}
                options={["Women", "Men", "Unisex"]}
              />
            </Field>
          </Grid>
          <Field
            label="Collections / tags"
            hint="Controls where it appears: homepage rows, mega-menu, New Arrivals"
          >
            <Input defaultValue="Curated for You, Bestseller" />
          </Field>
        </Card>
      </>
    ),
    "Price & action": (
      <>
        <Card title="How this product sells">
          <div className="mb-2.5 grid gap-3 lg:grid-cols-2">
            {(
              [
                ["cart", "Add to Cart", "Price shown · customers buy online"],
                [
                  "enq",
                  "Enquiry",
                  "“Price on request” and a “Make an Enquiry” button · arrives in Corporate enquiries",
                ],
              ] as const
            ).map(([m, t, d]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "relative flex flex-col gap-1.5 rounded-[10px] border px-[18px] py-4 text-left transition",
                  p.mode === m
                    ? "border-primary shadow-[inset_0_0_0_1px_#0a0a0a]"
                    : "border-border",
                )}
              >
                <b className="font-head text-[18px] font-normal">{t}</b>
                <span className="text-[12.5px] text-muted-foreground">{d}</span>
                {p.mode === m && (
                  <span className="absolute right-4 top-3.5 rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">
                    ✓ Current
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground">
            Set per product. To switch a whole maison or category at once, use Selling control — you
            can always flip one product back here.
          </p>
        </Card>
        <Card title="Product type">
          <div className="mb-2.5 grid gap-3 lg:grid-cols-2">
            {(
              [
                ["simple", "Simple product", "One price, one SKU"],
                [
                  "variable",
                  "Variable product",
                  "Options such as size or colour — each combination has its own SKU, price and offer price",
                ],
              ] as const
            ).map(([t, title, d]) => (
              <button
                key={t}
                type="button"
                onClick={() => setProductType(t)}
                className={cn(
                  "relative flex flex-col gap-1.5 rounded-[10px] border px-[18px] py-4 text-left transition",
                  productType === t
                    ? "border-primary shadow-[inset_0_0_0_1px_#0a0a0a]"
                    : "border-border",
                )}
              >
                <b className="font-head text-[18px] font-normal">{title}</b>
                <span className="text-[12.5px] text-muted-foreground">{d}</span>
                {productType === t && (
                  <span className="absolute right-4 top-3.5 rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">
                    ✓ Current
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>
        {!isVariable ? (
          <Card title="Price">
            <Grid cols={2}>
              <Field label="Price" hint={"Shown as “7,850 EGP”"}>
                <Input value={p.price} onChange={set("price")} />
              </Field>
              <Field label="Offer price" hint="Empty = no offer">
                <Input value={p.offer} onChange={set("offer")} />
              </Field>
            </Grid>
            <ToggleRow initial label="Eligible for discount codes" />
            <ToggleRow initial label="Allow cash on delivery" />
            <Field label="Stock on hand">
              <Input value={p.stock} onChange={set("stock")} />
            </Field>
          </Card>
        ) : (
          <>
            <Card title="Attributes">
              {attributes.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  No active attributes with values yet.{" "}
                  <Link to="/attributes/new" className="underline">
                    Create an attribute
                  </Link>{" "}
                  first.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-[12px] text-muted-foreground">
                    Tick the attributes this product varies by, then tick the values it comes in.
                  </p>
                  {attributes.map((a) => {
                    const on = !!attrSel[a.id];
                    return (
                      <div key={a.id} className="mb-3 rounded-lg border border-border p-3">
                        <label className="flex cursor-pointer items-center gap-2 text-[13.5px] font-medium">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleAttr(a.id)}
                            className="size-4 accent-[#0a0a0a]"
                          />
                          {a.name}
                          <span className="text-[11px] font-normal text-muted-foreground">
                            {a.previewType.toLowerCase()}
                          </span>
                        </label>
                        {on && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {a.values.map((v) => {
                              const sel = (attrSel[a.id] ?? []).includes(v.id);
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => toggleVal(a.id, v.id)}
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] transition",
                                    sel
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border hover:border-primary",
                                  )}
                                >
                                  {a.previewType === "COLOR" && v.color && (
                                    <span
                                      className="inline-block size-3 rounded-full border border-white/40"
                                      style={{ background: v.color }}
                                    />
                                  )}
                                  {v.value}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <Btn primary onClick={generate}>
                    {variants.length ? "Regenerate combinations" : "Generate combinations"}
                  </Btn>
                </>
              )}
            </Card>
            <Card title={`Variants${variants.length ? ` · ${variants.length}` : ""}`}>
              {variants.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  No combinations yet. Choose attributes and values above, then press Generate.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        {["Variant", "SKU", "Price (EGP)", "Offer price (EGP)", "Stock", ""].map(
                          (h, i) => (
                            <th
                              key={i}
                              className="whitespace-nowrap border-b border-border px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[.08em] text-muted-foreground"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v) => (
                        <tr key={v.key}>
                          <td className="border-b border-line-soft p-3 font-medium">{v.label}</td>
                          <td className="border-b border-line-soft p-3">
                            <input
                              value={v.sku}
                              onChange={(e) => setVar(v.key, { sku: e.target.value })}
                              className="w-full min-w-[130px] rounded-md border border-border bg-surface px-2 py-1.5"
                            />
                          </td>
                          <td className="border-b border-line-soft p-3">
                            <input
                              value={v.price}
                              onChange={(e) => setVar(v.key, { price: e.target.value })}
                              placeholder="Price"
                              className="w-full min-w-[90px] rounded-md border border-border bg-surface px-2 py-1.5"
                            />
                          </td>
                          <td className="border-b border-line-soft p-3">
                            <input
                              value={v.offer}
                              onChange={(e) => setVar(v.key, { offer: e.target.value })}
                              placeholder="Optional"
                              className="w-full min-w-[90px] rounded-md border border-border bg-surface px-2 py-1.5"
                            />
                          </td>
                          <td className="border-b border-line-soft p-3">
                            <input
                              value={v.stock}
                              onChange={(e) => setVar(v.key, { stock: e.target.value })}
                              className="w-full min-w-[70px] rounded-md border border-border bg-surface px-2 py-1.5"
                            />
                          </td>
                          <td className="border-b border-line-soft p-3">
                            <button
                              type="button"
                              className="text-muted-foreground"
                              onClick={() => setVariants((vs) => vs.filter((x) => x.key !== v.key))}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-[12px] text-muted-foreground">
                The product page shows “from” the lowest price. Offer price is optional per
                combination. Total stock: <b className="text-foreground">{totalStock}</b>
              </p>
              <ToggleRow initial label="Eligible for discount codes" />
              <ToggleRow initial label="Allow cash on delivery" />
            </Card>
          </>
        )}
        <Card title="When stock runs out">
          <ToggleRow initial={false} label="Allow orders when out of stock (pre-order)" />
          <ToggleRow initial label="Hide from site when out of stock" />
        </Card>
        <Card title="Automatic switching">
          <ToggleRow
            initial
            label="When stock hits 0 → switch to Enquiry"
            hint={"Keeps the product live and collects demand instead of showing “Out of stock”"}
          />
          <ToggleRow initial label="When restocked → switch back to Add to Cart" />
          <Field label="Enquiry minimum quantity">
            <Input defaultValue="1" />
          </Field>
          <ToggleRow
            key={p.mode}
            initial={!isCart}
            label="Also show on the Corporate Gifting page"
          />
        </Card>
      </>
    ),
    Images: (
      <>
        <Card title="Product images" extra={<Btn onClick={imgAdd}>Upload images</Btn>}>
          <div className="grid gap-[22px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div>
              <div className="mb-2.5 flex flex-col">
                <b className="text-[13.5px] font-medium">Hero image</b>
                <span className="text-[12px] text-muted-foreground">
                  Shown on the product card, listings and search
                </span>
              </div>
              {imgs[0] ? (
                <div {...dragProps(0)} className={imgBox(0, "w-full")} style={imgStyle(imgs[0])}>
                  <span className="absolute left-2.5 top-2.5 rounded bg-white px-[9px] py-[3px] text-[10.5px] font-semibold tracking-[.14em] text-black">
                    HERO
                  </span>
                  {imgActs(
                    <>
                      {imgAct("Replace", () => imgReplace(0))}
                      {imgAct("Remove", () => imgRemove(0))}
                    </>,
                  )}
                </div>
              ) : (
                <button type="button" onClick={imgAdd} className={cn(emptyBox, "w-full")}>
                  + Upload hero image
                </button>
              )}
            </div>
            <div>
              <div className="mb-2.5 flex flex-col">
                <b className="text-[13.5px] font-medium">Gallery</b>
                <span className="text-[12px] text-muted-foreground">
                  {Math.max(imgs.length - 1, 0)} of 5 · shown on the product page
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {imgs.slice(1).map((im, k) => {
                  const i = k + 1;
                  return (
                    <div
                      key={`${i}-${im.src?.slice(-24) ?? im.v}`}
                      {...dragProps(i)}
                      className={imgBox(i)}
                      style={imgStyle(im)}
                    >
                      <span className="absolute left-2 top-2 grid size-[22px] place-items-center rounded-full bg-white/90 text-[11px] text-black">
                        {i + 1}
                      </span>
                      {imgActs(
                        <>
                          {imgAct("★ Hero", () => imgHero(i), "Make this the hero")}
                          {imgAct("Replace", () => imgReplace(i))}
                          {imgAct("✕", () => imgRemove(i), "Remove")}
                        </>,
                      )}
                    </div>
                  );
                })}
                {imgs.length < 6 && (
                  <button type="button" onClick={imgAdd} className={emptyBox}>
                    + Add image<span className="text-[10.5px]">JPG · PNG · WebP</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-[18px] gap-y-2 border-t border-line-soft pt-3.5 text-[12px] text-muted-foreground">
            <span>✥ Drag to reorder</span>
            <span>
              ★ Drag any image onto the hero — or press &ldquo;★ Hero&rdquo; — to make it the main
              image
            </span>
            <span>Replace swaps one image without touching the rest</span>
            <span>Recommended: square, 2000 × 2000 px, white or lifestyle background</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
        </Card>
        <Card title="Image text (for Google & accessibility)">
          <Grid cols={2}>
            <Field label="Alt text (EN)">
              <Input key={`en-${p.en}`} defaultValue={p.en} />
            </Field>
            <Field label="Alt text (AR)">
              <Input key={`ar-${p.ar}`} defaultValue={p.ar} rtl />
            </Field>
          </Grid>
          <Field label="Product video (optional)">
            <Input placeholder="Upload MP4 or paste a link — plays after the images" />
          </Field>
        </Card>
      </>
    ),
    Shipping: (
      <>
        <Card title="Size & weight">
          <Grid cols={2}>
            <Field label="Weight (g)">
              <Input defaultValue="450" />
            </Field>
            <Field label="Length (cm)">
              <Input placeholder="e.g. 12" />
            </Field>
          </Grid>
          <Grid cols={2}>
            <Field label="Width (cm)">
              <Input placeholder="e.g. 8" />
            </Field>
            <Field label="Height (cm)">
              <Input placeholder="e.g. 15" />
            </Field>
          </Grid>
          <p className="text-[12px] text-muted-foreground">
            Packed size, used by the courier to price the parcel.
          </p>
        </Card>
        <Card title="Delivery & returns">
          <ToggleRow initial label="Returnable (per returns policy)" />
          {/* <ToggleRow initial={false} label="Engraving available" hint="Engraved items become non-returnable automatically" />
          <ToggleRow initial label="Gift wrapping available" /> */}
        </Card>
      </>
    ),
    SEO: (
      <Card title="Search engines & sharing">
        <Bilingual
          key={`t-${p.en}-${p.ar}`}
          label="Page title"
          en={`${p.en} | Zelliny`}
          ar={`${p.ar} | زيليني`}
        />
        <Bilingual
          key={`d-${p.en}-${p.ar}`}
          label="Meta description"
          rows={2}
          en={`Shop ${p.en} at Zelliny — authentic luxury, delivered across Egypt.`}
          ar={`تسوق ${p.ar} من زيليني — فخامة أصلية تصلك في جميع أنحاء مصر.`}
        />
        <Field label="URL">
          <Input
            key={p.sku}
            defaultValue={`zelliny.com/en/${(p.sku || "new-product").toLowerCase()}`}
          />
        </Field>
        <div className="rounded-lg border border-border bg-hover p-3.5">
          <div className="text-[12px] text-muted-foreground">
            zelliny.com › {p.category.toLowerCase()}
          </div>
          <div className="my-0.5 text-[17px] text-[#1a0dab]">{p.en} | Zelliny</div>
          <div className="text-[13px] text-muted-foreground">
            Shop {p.en} at Zelliny — authentic luxury, delivered across Egypt.
          </div>
        </div>
      </Card>
    ),
  };

  const modeLabel = isCart ? "Add to Cart" : "Enquiry only";
  const unitPrice = offer || price;
  return (
    <>
      <div className="mb-[22px]">
        <div className="mb-2 text-[12px] text-muted-foreground">
          <Link to="/products" className="underline underline-offset-[3px]">
            Products
          </Link>{" "}
          / {product?.id ?? "New"}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight">
              {isNew ? "Add product" : p.en || product.name}
            </h1>
            {isNew ? (
              <p className="mt-1 text-muted-foreground">
                Fill in English and Arabic side by side. Saved as Draft until you publish.
              </p>
            ) : (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                {p.sku || "No SKU"} ·{" "}
                <span
                  className={cn(
                    "rounded-lg border px-2 py-0.5 text-[11.5px]",
                    MODE_CHIP[modeLabel],
                  )}
                >
                  {modeLabel}
                </span>{" "}
                · <StatusBadge tone={live.tone}>{live.label}</StatusBadge>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={() => toast("Opens this page on zelliny.com in a new tab")}>
              Preview on site
            </Btn>
            {!isNew && <Btn onClick={duplicate}>Duplicate</Btn>}
            <Btn onClick={() => save(false)}>{isNew ? "Save draft" : "Save"}</Btn>
            <Btn primary onClick={() => save(true)}>
              {isNew ? "Publish" : "Save & publish"}
            </Btn>
          </div>
        </div>
      </div>

      <div className="mb-[18px] flex gap-1 overflow-x-auto border-b border-border">
        {PRODUCT_TABS.map((t) => (
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

      <div className="grid items-start gap-[18px] min-[981px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">{bodies[tab]}</div>
        <div className="min-w-0">
          <Card title="Visibility">
            <div className="flex items-center justify-between gap-3.5 border-b border-line-soft py-2.5">
              <div>
                <div className="text-[13.5px]">Visible on site</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  Off hides it from the website — nothing is deleted
                </div>
              </div>
              <Toggle
                on={p.visible}
                onChange={setVisible}
                label={p.visible ? "Visible on site — click to hide" : "Hidden — click to show"}
              />
            </div>
            {product?.hiddenBy && (
              <p className="mt-2 text-[12px] text-warn">Not on site — {product.hiddenBy}</p>
            )}
            <div className="mt-2.5" />
            <Field label="Status">
              <Select
                value={p.status}
                onChange={set("status")}
                options={["Published", "Draft", "Scheduled"]}
              />
            </Field>
            {p.status === "Scheduled" && (
              <Field label="Publish on" req hint="Goes live on the site automatically on this date">
                <input
                  type="date"
                  value={publishDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className={cn(inputCls, "cursor-pointer")}
                />
              </Field>
            )}
          </Card>
          <Card title="Sells as">
            <ModeSwitch<Mode>
              title="Change how this product sells"
              value={p.mode}
              onChange={setMode}
              options={[
                { value: "cart", label: "Add to Cart" },
                { value: "enq", label: "Enquiry" },
              ]}
            />
            <p className="mt-2 text-[12px] text-muted-foreground">
              One click to switch. Shortcuts in Selling control never lock this.
            </p>
          </Card>
          <Card
            title="Card preview"
            extra={
              <button
                type="button"
                onClick={() => setTab("Images")}
                className="text-[12.5px] text-muted-foreground underline underline-offset-[3px]"
              >
                Images
              </button>
            }
          >
            <div className="text-center">
              <span
                className="mb-3 block aspect-square w-full rounded-lg bg-cover bg-center"
                style={imgStyle(imgs[0] ?? { c: "#eee", v: 0 })}
              />
              <div className="text-[10.5px] tracking-[.16em] text-muted-foreground">
                {p.brand.toUpperCase()}
              </div>
              <div className="my-1 font-head">{p.en || "Product name"}</div>
              <div className="text-[13px]">{pricePreview}</div>
              <div className="mt-2.5 bg-primary p-2.5 text-[11px] tracking-[.14em] text-primary-foreground">
                {isCart ? "ADD TO BAG" : "MAKE AN ENQUIRY"}
              </div>
            </div>
          </Card>
          {product && (
            <Card title="Performance · 30 days">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
                {(
                  [
                    ["Page views", "1,284"],
                    [
                      isCart ? "Units sold" : "Enquiries",
                      String(isCart ? product.sold : product.enquiries),
                    ],
                    [isCart ? "Conversion" : "Enquiry rate", isCart ? "3.3%" : "1.1%"],
                    ["Revenue", isCart ? `${formatNumber(unitPrice * product.sold)} EGP` : "—"],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>
      </div>

      {product && (
        <section className="mt-[18px] rounded-[10px] border border-bad-bg bg-surface">
          <div className="border-b border-bad-bg px-5 py-3.5 text-[10.5px] uppercase tracking-[.16em] text-bad">
            Danger zone
          </div>
          <div className="flex flex-wrap items-center justify-between gap-5 px-5 py-4">
            <p className="max-w-[640px] text-[13px] text-muted-foreground">
              <b className="font-medium text-foreground">Delete this product permanently.</b> Only
              for products added by mistake or duplicated.{" "}
              {used
                ? `This product has ${product.sold ? `${product.sold} past orders` : `${product.enquiries} enquiries`} — it can't be deleted, because that would break your records. Switch "Visible on site" off instead.`
                : 'For anything you may sell again, just switch "Visible on site" off — it stays in your catalogue.'}
            </p>
            <Btn
              danger
              disabled={used}
              onClick={() => {
                setConfirmText("");
                setAskDelete(true);
              }}
            >
              Delete product
            </Btn>
          </div>
        </section>
      )}

      <Dialog open={askPrice} onOpenChange={setAskPrice}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Set a price first
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            {name} has no price yet. Add to Cart needs a price customers can pay.
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
            <Btn onClick={() => setAskPrice(false)}>Cancel</Btn>
            <Btn primary onClick={savePrice}>
              Save price &amp; switch
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={askDelete} onOpenChange={setAskDelete}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">Delete product?</DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            <b className="font-semibold">{product?.name}</b> and its images will be deleted
            permanently. This cannot be undone.
          </p>
          <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
            Type <b className="text-foreground">DELETE</b> to confirm
            <input
              autoFocus
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doDelete()}
              className={inputCls}
            />
          </label>
          <DialogFooter>
            <Btn onClick={() => setAskDelete(false)}>Cancel</Btn>
            <Btn danger disabled={confirmText.trim().toUpperCase() !== "DELETE"} onClick={doDelete}>
              Delete permanently
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
