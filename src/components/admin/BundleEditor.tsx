// Create / edit a bundle (gift set). Saves go to the shared bundle store (BundleFlow) — swap for API mutations later.
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { bundlesQuery, productsQuery } from "@/lib/api/sections.functions";
import type { BundleLine } from "@/lib/api/section-types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ModeSwitch, Thumb, Toggle } from "@/components/admin/primitives";
import { Button } from "@/components/admin/page";
import { addBundle, editBundle, unitPrice, useBundles } from "@/components/admin/BundleFlow";
import { useProducts } from "@/components/admin/ProductFlow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
const areaCls =
  "w-full min-w-0 resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] leading-normal outline-none focus:border-primary";
const OCCASIONS = ["For Her", "For Him", "Corporate", "Ramadan", "Mother's Day", "Graduation"];

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
function Bi({
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
function Row({ label, init }: { label: string; init: boolean }) {
  const [on, setOn] = useState(init);
  return (
    <div className="flex items-center justify-between gap-3.5 border-b border-line-soft py-2.5 last:border-b-0">
      <div className="text-[13.5px]">{label}</div>
      <Toggle on={on} onChange={() => setOn(!on)} label={label} />
    </div>
  );
}
const toNum = (v: string) => parseInt(v.replace(/[^0-9]/g, ""), 10) || 0;

export function BundleEditor({ id }: { id?: string | undefined }) {
  const { data } = useSuspenseQuery(bundlesQuery());
  const { data: prods } = useSuspenseQuery(productsQuery());
  const bundles = useBundles(data);
  const products = useProducts(prods.rows);
  const navigate = useNavigate();
  const b = id ? bundles.find((x) => x.id === id) : undefined;
  const isNew = !id;

  const [en, setEn] = useState(b?.name ?? "");
  const [ar, setAr] = useState(b?.nameAr ?? "");
  const [descEn, setDescEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [lines, setLines] = useState<BundleLine[]>(b?.lines ?? []);
  const [mode, setMode] = useState<"cart" | "enq">(
    b ? (b.mode === "Add to Cart" ? "cart" : "enq") : "cart",
  );
  const [price, setPrice] = useState(b?.price ? formatNumber(b.price) : "");
  const [visible, setVisible] = useState(b?.visible ?? false);
  const [occasion, setOccasion] = useState(b?.occasion ?? OCCASIONS[0]!);
  const [pick, setPick] = useState(false);
  const [q, setQ] = useState("");

  if (!isNew && !b)
    return <p className="py-24 text-center text-muted-foreground">This gift set was not found.</p>;

  const rows = lines
    .map((l) => ({ l, p: products.find((x) => x.id === l.productId) }))
    .filter((x) => x.p);
  const full = rows.reduce((a, x) => a + unitPrice(x.p) * x.l.qty, 0);
  const setPriceN = toNum(price);
  const minStock = rows.length
    ? Math.min(...rows.map((x) => Math.floor((x.p!.stock || 0) / x.l.qty)))
    : 0;
  const color = b?.color ?? rows[0]?.p?.color ?? "#ddd";

  const addLine = (pid: string) => {
    setLines((ls) =>
      ls.some((l) => l.productId === pid)
        ? ls.map((l) => (l.productId === pid ? { ...l, qty: l.qty + 1 } : l))
        : [...ls, { productId: pid, qty: 1 }],
    );
    setPick(false);
    setQ("");
  };
  const setQty = (pid: string, d: number) =>
    setLines((ls) =>
      ls.map((l) => (l.productId === pid ? { ...l, qty: Math.max(1, l.qty + d) } : l)),
    );

  const save = () => {
    if (!en.trim()) {
      toast("Add the English gift set name first");
      return;
    }
    if (!lines.length) {
      toast("Add at least one product to the set");
      return;
    }
    if (mode === "cart" && !setPriceN) {
      toast("Add to Cart needs a set price — or switch to Enquiry");
      return;
    }
    const fields = {
      name: en.trim(),
      nameAr: ar.trim(),
      items: rows.map((x) => x.p!.name),
      lines,
      mode: mode === "cart" ? "Add to Cart" : "Enquiry only",
      price: mode === "cart" ? setPriceN : 0,
      occasion,
      color,
      visible,
    };
    if (b) {
      editBundle(b.id, fields);
      toast("Gift set saved");
      return;
    }
    const nid = `B${100 + Math.floor(Math.random() * 899)}`;
    addBundle({ id: nid, ...fields });
    toast("Gift set created");
    navigate({ to: "/bundles/$bundleId", params: { bundleId: nid } });
  };

  const results = products
    .filter((p) => !q || `${p.name}${p.sku}${p.brand}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 30);

  return (
    <>
      <div className="mb-[22px]">
        <div className="mb-2 text-[12px] text-muted-foreground">
          <Link to="/bundles" className="underline underline-offset-[3px]">
            Bundles & gift sets
          </Link>{" "}
          / {b?.name ?? "New"}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight">{isNew ? "Create gift set" : b!.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {isNew
                ? "Pick the products, name the set, set one price."
                : `${rows.length} products`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => toast("Opens this gift set on the site in a new tab")}>
              Preview on site
            </Button>
            <Button primary onClick={save}>
              {isNew ? "Create gift set" : "Save"}
            </Button>
          </div>
        </div>
      </div>
      <div className="grid items-start gap-[18px] min-[981px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Card title="Name & story">
            <Bi label="Gift set name" en={en} ar={ar} onEn={setEn} onAr={setAr} req />
            <Bi
              label="Description"
              en={descEn}
              ar={descAr}
              onEn={setDescEn}
              onAr={setDescAr}
              rows={3}
            />
          </Card>
          <Card title="Products in this set">
            {rows.length === 0 ? (
              <p className="py-2 text-[13px] text-muted-foreground">No products yet.</p>
            ) : (
              rows.map(({ l, p }) => (
                <div
                  key={l.productId}
                  className="flex items-center gap-3 border-b border-line-soft py-2.5 last:border-b-0"
                >
                  <Thumb color={p!.color} />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-[13.5px] font-medium">{p!.name}</b>
                    <span className="text-[12px] text-muted-foreground">
                      {p!.sku} · {p!.price ? `${formatNumber(unitPrice(p))} EGP` : "On request"} ·
                      stock {p!.stock}
                    </span>
                  </div>
                  <div className="inline-flex h-8 overflow-hidden rounded-lg border border-border">
                    <button type="button" onClick={() => setQty(l.productId, -1)} className="w-7">
                      −
                    </button>
                    <em className="grid min-w-8 place-items-center border-x border-border text-[13px] not-italic">
                      {l.qty}
                    </em>
                    <button type="button" onClick={() => setQty(l.productId, 1)} className="w-7">
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLines((ls) => ls.filter((x) => x.productId !== l.productId))}
                    className="text-[12px] text-muted-foreground hover:text-bad"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
            <div className="mt-3.5">
              <Button onClick={() => setPick(true)}>+ Add product to set</Button>
            </div>
            <p className="mt-2.5 text-[12px] text-muted-foreground">
              Set stock = the lowest stock of its products. Selling a set deducts each product.
            </p>
          </Card>
          <Card title="Set images">
            <div className="grid max-w-[420px] grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => toast("Image upload connects to your API later")}
                className="relative aspect-square rounded-lg border border-border"
                style={{
                  background: `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 55%, #000))`,
                }}
              >
                <span className="absolute left-2.5 top-2.5 rounded bg-white px-2 py-0.5 text-[10px] font-semibold tracking-[.14em] text-black">
                  HERO
                </span>
              </button>
              <button
                type="button"
                onClick={() => toast("Image upload connects to your API later")}
                className="flex aspect-square flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed border-[#c9c9c9] text-[12px] text-muted-foreground hover:border-primary"
              >
                + Add
              </button>
            </div>
          </Card>
        </div>
        <div className="min-w-0">
          <Card title="Price">
            <div className="mb-3">
              <ModeSwitch<"cart" | "enq">
                value={mode}
                onChange={setMode}
                options={[
                  { value: "cart", label: "Add to Cart" },
                  { value: "enq", label: "Enquiry" },
                ]}
              />
            </div>
            <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
              <dt className="text-muted-foreground">Products bought separately</dt>
              <dd className="text-right">{full ? `${formatNumber(full)} EGP` : "—"}</dd>
              <dt className="text-muted-foreground">Sets available</dt>
              <dd className="text-right">{minStock}</dd>
            </dl>
            <Field
              label="Set price"
              hint={
                mode === "cart"
                  ? setPriceN && full > setPriceN
                    ? `Customer saves ${formatNumber(full - setPriceN)} EGP (${Math.round(((full - setPriceN) / full) * 100)}%)`
                    : "Leave empty for Enquiry"
                  : "Shown as “Price on request”"
              }
            >
              <input
                value={mode === "cart" ? price : ""}
                disabled={mode !== "cart"}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 9,400"
                className={cn(inputCls, "disabled:opacity-50")}
              />
            </Field>
          </Card>
          <Card title="Placement">
            <div className="flex items-center justify-between gap-3.5 border-b border-line-soft pb-3">
              <div className="text-[13.5px]">Visible on site</div>
              <Toggle on={visible} onChange={() => setVisible(!visible)} label="Visible on site" />
            </div>
            <div className="mt-3">
              <Field label="Occasion">
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className={cn(inputCls, "cursor-pointer")}
                >
                  {OCCASIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Row label="Show in “Gifts” menu" init />
            <Row label="Show on homepage" init={false} />
          </Card>
        </div>
      </div>

      <Dialog open={pick} onOpenChange={setPick}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Add a product to the set
            </DialogTitle>
          </DialogHeader>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, SKU or maison"
            className={inputCls}
          />
          <div className="max-h-[320px] overflow-auto rounded-lg border border-border">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addLine(p.id)}
                className="flex w-full items-center gap-3 border-b border-line-soft px-3 py-2 text-left last:border-b-0 hover:bg-hover"
              >
                <Thumb color={p.color} className="size-8" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13px] font-medium">{p.name}</b>
                  <span className="text-[11.5px] text-muted-foreground">
                    {p.brand} · {p.price ? `${formatNumber(unitPrice(p))} EGP` : "On request"}
                  </span>
                </span>
              </button>
            ))}
            {!results.length && (
              <p className="p-4 text-[13px] text-muted-foreground">No product matches.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
