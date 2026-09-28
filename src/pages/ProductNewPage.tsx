// "+ Add product" screen — the prototype's `P.product` editor for a new product (id = "new").
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { productsQuery } from "@/lib/api/sections.functions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ModeSwitch, Toggle } from "@/components/admin/primitives";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TABS = ["General", "Price & action", "Images", "Variants", "Inventory", "Gifting", "SEO"] as const;
type Tab = (typeof TABS)[number];
type Mode = "cart" | "enq";
const FEATURES = { giftwrap: "Gift wrapping", engraving: "Engraving & embossing" };
type Feature = keyof typeof FEATURES;

const inputCls = "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
const toNum = (v: string) => parseInt(v.replace(/[^0-9]/g, ""), 10) || 0;
const stockState = (n: number) => (n === 0 ? "Out of stock" : n <= 2 ? "Low stock" : "In stock");

/* ---------- small building blocks (prototype helpers) ---------- */

function Btn({ primary, children, onClick }: { primary?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("h-9 whitespace-nowrap rounded-lg border px-3.5 text-[13px] transition", primary ? "border-primary bg-primary text-primary-foreground hover:opacity-[.88]" : "border-border bg-surface hover:border-primary")}>
      {children}
    </button>
  );
}

function Card({ title, extra, children }: { title?: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-[18px] min-w-0 rounded-[10px] border border-border bg-surface">
      {title && <div className="flex items-center justify-between gap-2.5 px-5 pt-4"><h3 className="text-[15px]">{title}</h3><div>{extra}</div></div>}
      <div className={cn("px-5 pb-5", title ? "pt-3" : "pt-4")}>{children}</div>
    </section>
  );
}

function Field({ label, req, hint, children }: { label: ReactNode; req?: boolean; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-3.5 flex min-w-0 flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">{label}{req && <em className="not-italic text-bad">*</em>}</label>
      {children}
      {hint && <div className="mt-0.5 text-[12px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Input({ value, defaultValue, onChange, placeholder, rtl, readOnly }: { value?: string; defaultValue?: string; onChange?: (v: string) => void; placeholder?: string; rtl?: boolean; readOnly?: boolean }) {
  return <input value={value} defaultValue={defaultValue} readOnly={readOnly} onChange={onChange && ((e) => onChange(e.target.value))} placeholder={placeholder} dir={rtl ? "rtl" : undefined} className={cn(inputCls, rtl && "text-right")} />;
}

function Select({ value, defaultValue, onChange, options }: { value?: string; defaultValue?: string; onChange?: (v: string) => void; options: string[] }) {
  return (
    <select value={value} defaultValue={defaultValue} onChange={onChange && ((e) => onChange(e.target.value))} className={cn(inputCls, "cursor-pointer")}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

/** English + Arabic side by side (prototype `bi`). */
function Bilingual({ label, en, ar, rows, onEn, onAr }: { label: string; en: string; ar: string; rows?: number; onEn?: (v: string) => void; onAr?: (v: string) => void }) {
  const lang = (t: string, dark: boolean) => <span className={cn("rounded-[3px] px-1.5 py-px text-[10px] font-semibold tracking-[.08em]", dark ? "bg-primary text-primary-foreground" : "bg-[#f0f0f0] text-foreground")}>{t}</span>;
  const box = (v: string, on: ((v: string) => void) | undefined, ar: boolean) => {
    const common = { dir: ar ? "rtl" : undefined, ...(on ? { value: v, onChange: (e: { target: { value: string } }) => on(e.target.value) } : { defaultValue: v }) };
    return rows
      ? <textarea rows={rows} {...common} className={cn("w-full min-w-0 resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] leading-normal outline-none focus:border-primary", ar && "text-right")} />
      : <input {...common} className={cn(inputCls, ar && "text-right")} />;
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
      <div><div className="text-[13.5px]">{label}</div>{hint && <div className="mt-0.5 text-[12px] text-muted-foreground">{hint}</div>}</div>
      <Toggle on={on} onChange={() => setOn(!on)} label={label} />
    </div>
  );
}

/** "X is live / switched off" banner (prototype `featBanner`). */
function FeatureBanner({ name, live, onToggle }: { name: string; live: boolean; onToggle: () => void }) {
  return (
    <div className={cn("mb-[18px] flex items-center gap-3.5 rounded-[10px] border px-4 py-3", live ? "border-transparent bg-good-bg" : "border-border bg-[repeating-linear-gradient(135deg,#FAFAFA_0_10px,#F4F4F4_10px_20px)]")}>
      <span className={cn("size-[9px] flex-none rounded-full", live ? "bg-good" : "border-2 border-muted-foreground")} />
      <div className="flex-1">
        <b className="block text-[13.5px] font-medium">{live ? `${name} is live` : `${name} is switched off`}</b>
        <span className="text-[12.5px] text-muted-foreground">{live ? "Customers can see and use this on zelliny.com." : "Everything here is built and can be prepared — customers won't see it until you switch it on."}</span>
      </div>
      <Btn primary={!live} onClick={onToggle}>{live ? "Switch off" : "Switch on"}</Btn>
    </div>
  );
}

const Grid = ({ cols, children }: { cols: 2 | 3; children: ReactNode }) => <div className={cn("grid gap-3.5", cols === 2 ? "sm:grid-cols-2" : "lg:grid-cols-3")}>{children}</div>;
const gradient = (c: string) => ({ background: `linear-gradient(145deg, ${c}, color-mix(in srgb, ${c} 55%, #000))` });

/* ---------- page ---------- */

export default function ProductNewPage() {
  const { data } = useSuspenseQuery(productsQuery());
  const [tab, setTab] = useState<Tab>("General");
  const [p, setP] = useState({ en: "", ar: "", brand: data.brands.includes("Hermès") ? "Hermès" : data.brands[0] ?? "", category: data.categories.includes("Fragrance") ? "Fragrance" : data.categories[0] ?? "", mode: "cart" as Mode, price: "", offer: "", sku: "", stock: "0", visible: false });
  const set = <K extends keyof typeof p>(k: K) => (v: (typeof p)[K]) => setP((x) => ({ ...x, [k]: v }));
  const [imgs, setImgs] = useState<string[]>([]);
  const [feat, setFeat] = useState<Record<Feature, boolean>>({ giftwrap: true, engraving: false });
  const [variants, setVariants] = useState([["50 ml", "—", "5,450 EGP", "—", "8"], ["100 ml", "—", "—", "—", "0"], ["200 ml", "—", "10,900 EGP", "—", "3"]]);
  const [askPrice, setAskPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<(srcs: string[]) => void>(() => {});
  const dragFrom = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const price = toNum(p.price), offer = toNum(p.offer), isCart = p.mode === "cart";

  const setMode = (m: Mode) => {
    if (m === "cart" && !price) { setPriceInput(""); setAskPrice(true); return; }
    set("mode")(m);
    toast(`${p.en} → ${m === "cart" ? "Add to Cart" : "Enquiry"}`);
  };
  const savePrice = () => {
    const v = toNum(priceInput);
    if (!v) { toast("Enter a price"); return; }
    setP((x) => ({ ...x, price: formatNumber(v), mode: "cart" }));
    setAskPrice(false);
    toast(`${p.en} now Add to Cart at ${formatNumber(v)} EGP`);
  };
  const toggleFeat = (k: Feature) => {
    const on = !feat[k];
    setFeat((f) => ({ ...f, [k]: on }));
    toast(`${FEATURES[k]} ${on ? "is now LIVE on the site" : "switched off — hidden from customers"}`);
  };

  /* images */
  const pickFiles = (multi: boolean, cb: (srcs: string[]) => void) => {
    const el = fileRef.current; if (!el) return;
    el.multiple = multi; pickRef.current = cb; el.value = ""; el.click();
  };
  const onFiles = (files: FileList | null) => {
    Promise.all([...(files ?? [])].map((f) => new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result)); fr.readAsDataURL(f); }))).then(pickRef.current);
  };
  const imgAdd = () => pickFiles(true, (srcs) => {
    const room = 6 - imgs.length;
    setImgs((x) => [...x, ...srcs.slice(0, room)]);
    toast(`${Math.min(srcs.length, room)} image(s) added${srcs.length > room ? " · max 6 per product" : ""}`);
  });
  const imgReplace = (i: number) => pickFiles(false, (srcs) => {
    const src = srcs[0];
    if (!src) return;
    setImgs((x) => x.map((s, k) => (k === i ? src : s)));
    toast(i === 0 ? "Hero image replaced" : `Image ${i + 1} replaced`);
  });
  const imgRemove = (i: number) => { setImgs((x) => x.filter((_, k) => k !== i)); toast(i === 0 ? "Hero removed — next image is now the hero" : "Image removed"); };
  const move = (from: number, to: number) => setImgs((x) => { const n = [...x]; const [im] = n.splice(from, 1); if (im) n.splice(to, 0, im); return n; });
  const imgHero = (i: number) => { move(i, 0); toast("New hero image set"); };
  const dragProps = (i: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => { dragFrom.current = i; e.dataTransfer.effectAllowed = "move"; },
    onDragOver: (e: DragEvent) => { if (dragFrom.current !== null) { e.preventDefault(); setOver(i); } },
    onDragEnd: () => { dragFrom.current = null; setOver(null); },
    onDrop: (e: DragEvent) => {
      if (dragFrom.current === null) return;
      e.preventDefault(); move(dragFrom.current, i); dragFrom.current = null; setOver(null);
      toast(i === 0 ? "New hero image set" : "Image order saved");
    },
  });
  const imgBox = (i: number, extra?: string) => cn("group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-border bg-cover bg-center transition hover:shadow-[0_6px_20px_rgba(0,0,0,.12)]", dragFrom.current === i && "opacity-40", over === i && "scale-[1.02] outline-2 outline-dashed outline-offset-[3px] outline-primary", extra);
  const imgActs = (children: ReactNode) => <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-1 bg-gradient-to-b from-transparent to-black/55 p-2 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">{children}</div>;
  const imgAct = (label: ReactNode, onClick: () => void, title?: string) => <button type="button" title={title} onClick={onClick} className="rounded-full bg-white px-[9px] py-1 text-[11px] text-black hover:bg-black hover:text-white">{label}</button>;
  const emptyBox = "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-[#c9c9c9] bg-hover text-[13px] text-muted-foreground hover:border-primary hover:text-foreground";

  const pricePreview = !isCart ? "Price on request" : offer ? <>{formatNumber(offer)} EGP <s className="ml-1.5 text-muted-foreground">{formatNumber(price)} EGP</s></> : price ? `${formatNumber(price)} EGP` : "—";

  const bodies: Record<Tab, ReactNode> = {
    General: (
      <>
        <Card title="Name & description">
          <Bilingual label="Product name" en={p.en} ar={p.ar} onEn={set("en")} onAr={set("ar")} />
          <Bilingual label="Short description (under the title)" en="" ar="" rows={2} />
          <Bilingual label="Full description" en="" ar="" rows={5} />
          <Bilingual label="Notes / key details (bullet list)" en="" ar="" rows={3} />
        </Card>
        <Card title="Organisation">
          <Grid cols={2}>
            <Field label="Maison" req><Select value={p.brand} onChange={set("brand")} options={data.brands} /></Field>
            <Field label="Category" req><Select value={p.category} onChange={set("category")} options={data.categories} /></Field>
          </Grid>
          <Grid cols={2}>
            <Field label="Gender" hint="Unisex products appear under both Women and Men on the site"><Select defaultValue="Unisex" options={["Women", "Men", "Unisex"]} /></Field>
            <Field label="Sub-category"><Select defaultValue="Eau de Toilette" options={["Eau de Parfum", "Eau de Toilette", "Parfum", "Cologne", "Gift set"]} /></Field>
          </Grid>
          <Field label="Collections / tags" hint="Controls where it appears: homepage rows, mega-menu, New Arrivals"><Input defaultValue="Curated for You, Bestseller" /></Field>
        </Card>
      </>
    ),
    "Price & action": (
      <>
        <Card title="How this product sells">
          <div className="mb-2.5 grid gap-3 lg:grid-cols-2">
            {([["cart", "Add to Cart", "Price shown · customers buy online"], ["enq", "Enquiry", "“Price on request” and a “Make an Enquiry” button · arrives in Corporate enquiries"]] as const).map(([m, t, d]) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={cn("relative flex flex-col gap-1.5 rounded-[10px] border px-[18px] py-4 text-left transition", p.mode === m ? "border-primary shadow-[inset_0_0_0_1px_#0a0a0a]" : "border-border")}>
                <b className="font-head text-[18px] font-normal">{t}</b>
                <span className="text-[12.5px] text-muted-foreground">{d}</span>
                {p.mode === m && <span className="absolute right-4 top-3.5 rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">✓ Current</span>}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground">Set per product. To switch a whole maison or category at once, use Selling control — you can always flip one product back here.</p>
        </Card>
        <Card title="Price">
          <Grid cols={3}>
            <Field label="Price" hint={"Shown as “7,850 EGP”"}><Input value={p.price} onChange={set("price")} /></Field>
            <Field label="Offer price" hint="Empty = no offer"><Input value={p.offer} onChange={set("offer")} /></Field>
            <Field label="Cost price (private)" hint="For margin reports only"><Input defaultValue="" /></Field>
          </Grid>
          <Grid cols={2}>
            <Field label="Offer starts"><Input defaultValue="1 Sep 2026" /></Field>
            <Field label="Offer ends"><Input defaultValue="31 Oct 2026" /></Field>
          </Grid>
          <ToggleRow initial label="Eligible for discount codes" />
          <ToggleRow initial label="Allow cash on delivery" />
        </Card>
        <Card title="Automatic switching">
          <ToggleRow initial label="When stock hits 0 → switch to Enquiry" hint={"Keeps the product live and collects demand instead of showing “Out of stock”"} />
          <ToggleRow initial label="When restocked → switch back to Add to Cart" />
          <Field label="Enquiry minimum quantity"><Input defaultValue="1" /></Field>
          <ToggleRow key={p.mode} initial={!isCart} label="Also show on the Corporate Gifting page" />
        </Card>
      </>
    ),
    Images: (
      <>
        <Card title="Product images" extra={<Btn onClick={imgAdd}>Upload images</Btn>}>
          <div className="grid gap-[22px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div>
              <div className="mb-2.5 flex flex-col"><b className="text-[13.5px] font-medium">Hero image</b><span className="text-[12px] text-muted-foreground">Shown on the product card, listings and search</span></div>
              {imgs[0] ? (
                <div {...dragProps(0)} className={imgBox(0, "w-full")} style={{ backgroundImage: `url('${imgs[0]}')` }}>
                  <span className="absolute left-2.5 top-2.5 rounded bg-white px-[9px] py-[3px] text-[10.5px] font-semibold tracking-[.14em] text-black">HERO</span>
                  {imgActs(<>{imgAct("Replace", () => imgReplace(0))}{imgAct("Remove", () => imgRemove(0))}</>)}
                </div>
              ) : <button type="button" onClick={imgAdd} className={cn(emptyBox, "w-full")}>+ Upload hero image</button>}
            </div>
            <div>
              <div className="mb-2.5 flex flex-col"><b className="text-[13.5px] font-medium">Gallery</b><span className="text-[12px] text-muted-foreground">{Math.max(imgs.length - 1, 0)} of 5 · shown on the product page</span></div>
              <div className="grid grid-cols-3 gap-2.5">
                {imgs.slice(1).map((src, k) => {
                  const i = k + 1;
                  return (
                    <div key={`${i}-${src.slice(-24)}`} {...dragProps(i)} className={imgBox(i)} style={{ backgroundImage: `url('${src}')` }}>
                      <span className="absolute left-2 top-2 grid size-[22px] place-items-center rounded-full bg-white/90 text-[11px] text-black">{i + 1}</span>
                      {imgActs(<>{imgAct("★ Hero", () => imgHero(i), "Make this the hero")}{imgAct("Replace", () => imgReplace(i))}{imgAct("✕", () => imgRemove(i), "Remove")}</>)}
                    </div>
                  );
                })}
                {imgs.length < 6 && <button type="button" onClick={imgAdd} className={emptyBox}>+ Add image<span className="text-[10.5px]">JPG · PNG · WebP</span></button>}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-[18px] gap-y-2 border-t border-line-soft pt-3.5 text-[12px] text-muted-foreground">
            <span>✥ Drag to reorder</span><span>★ Drag any image onto the hero — or press &ldquo;★ Hero&rdquo; — to make it the main image</span><span>Replace swaps one image without touching the rest</span><span>Recommended: square, 2000 × 2000 px, white or lifestyle background</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFiles(e.target.files)} />
        </Card>
        <Card title="Image text (for Google & accessibility)">
          <Grid cols={2}>
            <Field label="Alt text (EN)"><Input key={`en-${p.en}`} defaultValue={p.en} /></Field>
            <Field label="Alt text (AR)"><Input key={`ar-${p.ar}`} defaultValue={p.ar} rtl /></Field>
          </Grid>
          <Field label="Product video (optional)"><Input placeholder="Upload MP4 or paste a link — plays after the images" /></Field>
        </Card>
      </>
    ),
    Variants: (
      <Card title="Sizes / colours / variants">
        <p className="text-[12px] text-muted-foreground">One product page, several options. Each variant has its own SKU, price and stock.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>{["Variant", "SKU", "Price", "Offer", "Stock", ""].map((h, i) => <th key={i} className={cn("whitespace-nowrap border-b border-border px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[.08em] text-muted-foreground", i >= 2 && i <= 4 && "text-right")}>{h}</th>)}</tr></thead>
            <tbody>
              {variants.map((r, ri) => (
                <tr key={ri}>
                  {r.map((x, ci) => <td key={ci} className="border-b border-line-soft p-3"><input defaultValue={x} className="w-full rounded-md border border-border bg-surface px-2 py-1.5" /></td>)}
                  <td className="border-b border-line-soft p-3"><button type="button" className="text-muted-foreground" onClick={() => setVariants((v) => v.filter((_, k) => k !== ri))}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-2"><Btn onClick={() => { setVariants((v) => [...v, ["", "", "", "", ""]]); toast("Variant row added"); }}>+ Add variant</Btn></div>
      </Card>
    ),
    Inventory: (
      <>
        <Card title="Stock">
          <Grid cols={3}>
            <Field label="SKU" req><Input value={p.sku} onChange={set("sku")} /></Field>
            <Field label="Barcode (EAN)"><Input defaultValue="3346131400423" /></Field>
            <Field label="Stock on hand"><Input value={p.stock} onChange={set("stock")} /></Field>
          </Grid>
          <Grid cols={3}>
            <Field label="Stock status" hint="Low stock = 2 pieces or fewer · Out of stock = 0"><Input value={stockState(toNum(p.stock))} readOnly /></Field>
            <Field label="Warehouse"><Select defaultValue="Cairo — Nozha" options={["Cairo — Nozha", "Dubai"]} /></Field>
            <Field label="Weight (g)"><Input defaultValue="450" /></Field>
          </Grid>
          <ToggleRow initial={false} label="Allow orders when out of stock (pre-order)" />
          <ToggleRow initial label="Hide from site when out of stock" />
        </Card>
        <Card title="Delivery & returns">
          <ToggleRow initial={false} label="Deliver by appointment only" hint="For watches and fine jewellery — handed over in person, not by courier" />
          <ToggleRow initial label="Returnable (per returns policy)" />
          <ToggleRow initial={false} label="Engraving available" hint="Engraved items become non-returnable automatically" />
          <ToggleRow initial label="Gift wrapping available" />
        </Card>
      </>
    ),
    Gifting: (
      <>
        <FeatureBanner name={FEATURES.giftwrap} live={feat.giftwrap} onToggle={() => toggleFeat("giftwrap")} />
        <Card title="Gift wrapping">
          <ToggleRow initial label="Gift wrapping available for this product" />
          <ToggleRow initial label="Gift message card" />
          <ToggleRow initial label={"“Hide prices on invoice” option"} />
          <Field label="Wrapping style"><Select defaultValue="Signature black box with ribbon" options={["Signature black box with ribbon", "Ribbon only", "Brand original box only (no wrap)"]} /></Field>
        </Card>
        <FeatureBanner name={FEATURES.engraving} live={feat.engraving} onToggle={() => toggleFeat("engraving")} />
        <Card title="Engraving & embossing">
          <div className={cn(!feat.engraving && "opacity-55")}>
            <ToggleRow initial={false} label="Engraving available on this product" hint="Pens, lighters, watches, jewellery" />
            <Grid cols={3}>
              <Field label="Max characters"><Input defaultValue="20" /></Field>
              <Field label="Engraving price" hint="0 = complimentary"><Input defaultValue="350 EGP" /></Field>
              <Field label="Lines"><Select defaultValue="1" options={["1", "2"]} /></Field>
            </Grid>
            <Grid cols={2}>
              <Field label="Fonts offered" hint="Customer chooses on the product page"><Input defaultValue="Serif caps, Script" /></Field>
              <Field label="Extra production time"><Input defaultValue="+2 working days" /></Field>
            </Grid>
            <ToggleRow initial={false} label="Embossing (initials on leather)" hint="Up to 3 letters · 250 EGP" />
            <div className="mt-2.5 flex flex-col gap-2.5 rounded-lg border border-border p-3.5">
              <span className="text-muted-foreground">Customer preview</span>
              <div className="grid h-[46px] place-items-center rounded-[23px] bg-[linear-gradient(90deg,#1a1a1a,#3b3b3b,#1a1a1a)] font-head text-[15px] tracking-[.4em] text-[#d8d8d8]">R . B</div>
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">Engraved or embossed items are automatically marked non-returnable at checkout.</p>
          </div>
        </Card>
      </>
    ),
    SEO: (
      <Card title="Search engines & sharing">
        <Bilingual key={`t-${p.en}-${p.ar}`} label="Page title" en={`${p.en} | Zelliny`} ar={`${p.ar} | زيليني`} />
        <Bilingual key={`d-${p.en}-${p.ar}`} label="Meta description" rows={2} en={`Shop ${p.en} at Zelliny — authentic luxury, delivered across Egypt.`} ar={`تسوق ${p.ar} من زيليني — فخامة أصلية تصلك في جميع أنحاء مصر.`} />
        <Field label="URL"><Input key={p.sku} defaultValue={`zelliny.com/en/${(p.sku || "new-product").toLowerCase()}`} /></Field>
        <div className="rounded-lg border border-border bg-hover p-3.5">
          <div className="text-[12px] text-muted-foreground">zelliny.com › {p.category.toLowerCase()}</div>
          <div className="my-0.5 text-[17px] text-[#1a0dab]">{p.en} | Zelliny</div>
          <div className="text-[13px] text-muted-foreground">Shop {p.en} at Zelliny — authentic luxury, delivered across Egypt.</div>
        </div>
      </Card>
    ),
  };

  return (
    <>
      <div className="mb-[22px]">
        <div className="mb-2 text-[12px] text-muted-foreground"><Link to="/products" className="underline underline-offset-[3px]">Products</Link> / New</div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight">Add product</h1>
            <p className="mt-1 text-muted-foreground">Fill in English and Arabic side by side. Saved as Draft until you publish.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={() => toast("Opens this page on zelliny.com in a new tab")}>Preview on site</Btn>
            <Btn onClick={() => toast("Saved as draft")}>Save draft</Btn>
            <Btn primary onClick={() => toast("Product published")}>Publish</Btn>
          </div>
        </div>
      </div>

      <div className="mb-[18px] flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px]", t === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground")}>{t}</button>
        ))}
      </div>

      <div className="grid items-start gap-[18px] min-[981px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">{bodies[tab]}</div>
        <div className="min-w-0">
          <Card title="Visibility">
            <div className="flex items-center justify-between gap-3.5 border-b border-line-soft py-2.5">
              <div><div className="text-[13.5px]">Visible on site</div><div className="mt-0.5 text-[12px] text-muted-foreground">Off hides it from the website — nothing is deleted</div></div>
              <Toggle on={p.visible} onChange={() => { set("visible")(!p.visible); toast(`${p.en} ${!p.visible ? "is visible on the site" : "is hidden from the site"}`); }} label={p.visible ? "Visible on site — click to hide" : "Hidden — click to show"} />
            </div>
            <div className="mt-2.5" />
            <Field label="Status"><Select defaultValue="Draft" options={["Published", "Draft", "Scheduled"]} /></Field>
            <Field label="Publish date"><Input defaultValue="Immediately" /></Field>
          </Card>
          <Card title="Sells as">
            <ModeSwitch<Mode> title="Change how this product sells" value={p.mode} onChange={setMode} options={[{ value: "cart", label: "Add to Cart" }, { value: "enq", label: "Enquiry" }]} />
            <p className="mt-2 text-[12px] text-muted-foreground">One click to switch. Shortcuts in Selling control never lock this.</p>
          </Card>
          <Card title="Card preview" extra={<button type="button" onClick={() => setTab("Images")} className="text-[12.5px] text-muted-foreground underline underline-offset-[3px]">Images</button>}>
            <div className="text-center">
              <span className="mb-3 block aspect-square w-full rounded-lg bg-cover bg-center" style={imgs[0] ? { backgroundImage: `url('${imgs[0]}')` } : gradient("#eee")} />
              <div className="text-[10.5px] tracking-[.16em] text-muted-foreground">{p.brand.toUpperCase()}</div>
              <div className="my-1 font-head">{p.en || "Product name"}</div>
              <div className="text-[13px]">{pricePreview}</div>
              <div className="mt-2.5 bg-primary p-2.5 text-[11px] tracking-[.14em] text-primary-foreground">{isCart ? "ADD TO BAG" : "MAKE AN ENQUIRY"}</div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={askPrice} onOpenChange={setAskPrice}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader><DialogTitle className="font-head text-[18px] font-normal">Set a price first</DialogTitle></DialogHeader>
          <p className="text-[13.5px]">{p.en} has no price yet. Add to Cart needs a price customers can pay.</p>
          <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">Price
            <div className="flex overflow-hidden rounded-lg border border-border">
              <input autoFocus value={priceInput} onChange={(e) => setPriceInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && savePrice()} placeholder="e.g. 3,450" className="h-9 flex-1 bg-surface px-3 text-[13px] text-foreground outline-none" />
              <span className="grid place-items-center bg-hover px-3 text-[12px]">EGP</span>
            </div>
          </label>
          <DialogFooter>
            <Btn onClick={() => setAskPrice(false)}>Cancel</Btn>
            <Btn primary onClick={savePrice}>Save price &amp; switch</Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
