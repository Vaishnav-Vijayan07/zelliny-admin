// Inventory extras: back-in-stock waiting lists, pre-orders and the two site switches that live here.
// Shared by the Inventory tabs and the waiting-list / pre-order pages. Local for now — swap for API calls.
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import type { InventoryData, PreorderRow, ProductRow, WaitlistRow } from "@/lib/api/section-types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/hooks/use-session";
import { Button } from "./page";
import { Thumb } from "./primitives";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* ---------- local store ---------- */
type State = {
  notified: Record<string, string>; // waiting-customer id → "27 Sep 2026 · by Ramy"
  preorders: Record<string, Partial<PreorderRow>>;
  features: Partial<InventoryData["features"]>;
};
let state: State = { notified: {}, preorders: {}, features: {} };
const EMPTY: State = { notified: {}, preorders: {}, features: {} };
const listeners = new Set<() => void>();
const sub = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const set = (next: Partial<State>) => { state = { ...state, ...next }; listeners.forEach((l) => l()); };

/** API data with this browser's changes layered on top. */
export function useInventory(data: InventoryData) {
  const s = useSyncExternalStore(sub, () => state, () => EMPTY);
  return useMemo(() => ({
    features: { ...data.features, ...s.features },
    waitlists: data.waitlists.map((w): WaitlistRow => ({ ...w, customers: w.customers.map((c) => ({ ...c, notified: s.notified[c.id] ?? c.notified })) })),
    preorders: [
      ...data.preorders.map((p): PreorderRow => ({ ...p, ...s.preorders[p.productId] })),
      // Opened in this browser on a product that had no pre-orders yet.
      ...Object.entries(s.preorders).filter(([id]) => !data.preorders.some((p) => p.productId === id))
        .map(([productId, e]): PreorderRow => ({ productId, expected: "", limit: 5, open: true, payment: "Paid in full online", customers: [], ...e })),
    ],
  }), [data, s]);
}
export const setFeature = (k: keyof InventoryData["features"], on: boolean) => set({ features: { ...state.features, [k]: on } });
export const editPreorder = (productId: string, e: Partial<PreorderRow>) => set({ preorders: { ...state.preorders, [productId]: { ...state.preorders[productId], ...e } } });
const markNotified = (ids: string[], stamp: string) => set({ notified: { ...state.notified, ...Object.fromEntries(ids.map((id) => [id, stamp])) } });

/* ---------- site switch banner ---------- */
const FEATURE_TEXT = { backInStock: "Back-in-stock requests", preorders: "Pre-orders" } as const;
export function FeatureBanner({ k, live }: { k: keyof InventoryData["features"]; live: boolean }) {
  const name = FEATURE_TEXT[k];
  const flip = () => { setFeature(k, !live); toast(`${name} ${!live ? "is now live on zelliny.com" : "is switched off — hidden from customers"}`); };
  return (
    <div className={cn("mb-[18px] flex items-center gap-3.5 rounded-[10px] border px-4 py-3", live ? "border-transparent bg-good-bg" : "border-border bg-[repeating-linear-gradient(135deg,#FAFAFA_0_10px,#F4F4F4_10px_20px)]")}>
      <span className={cn("size-[9px] flex-none rounded-full", live ? "bg-good" : "border-2 border-muted-foreground")} />
      <div className="flex-1">
        <b className="block text-[13.5px] font-medium">{live ? `${name} is live` : `${name} is switched off`}</b>
        <span className="text-[12.5px] text-muted-foreground">{live ? "Customers can see and use this on zelliny.com." : "Everything here is built and can be prepared — customers won't see it until you switch it on."}</span>
      </div>
      <button type="button" onClick={flip} className={cn("h-9 rounded-lg border px-3.5 text-[13px]", live ? "border-border bg-surface hover:border-primary" : "border-primary bg-primary text-primary-foreground")}>{live ? "Switch off" : "Switch on"}</button>
    </div>
  );
}

/** Three short "how it works" cards at the top of a tab. */
export function HowItWorks({ steps }: { steps: [string, ReactNode][] }) {
  return (
    <div className="mb-[18px] grid gap-[18px] md:grid-cols-3">
      {steps.map(([t, d]) => <div key={t} className="rounded-[10px] border border-border bg-surface px-4 py-3.5 text-[13px] leading-snug"><b className="mb-1 block font-medium">{t}</b>{d}</div>)}
    </div>
  );
}

/* ---------- Notify customers ---------- */
function mail(p: ProductRow, lang: "English" | "Arabic") {
  const price = p.price ? `${formatNumber(p.offer || p.price)} EGP` : "";
  const merge = (t: string) => <span className="rounded border border-dashed border-info/45 bg-info-bg px-1.5 text-[12.5px] text-info">{t}</span>;
  return lang === "Arabic" ? (
    <div dir="rtl" className="rounded-lg border border-border px-[18px] py-4 text-[13.5px] leading-relaxed">
      <div className="mb-2 font-medium">عاد من جديد — {p.nameAr}</div>
      مرحبًا {merge("الاسم")}،<br />طلبت منا أن نبلغك عند توفر <b>{p.nameAr}</b>. لقد عاد الآن على زيليني{price && ` بسعر ${price}`}.<br />الكمية محدودة.<br />
      <span className="mt-2.5 inline-block rounded-lg bg-primary px-4 py-2 text-[12.5px] text-primary-foreground">تسوق الآن</span>
    </div>
  ) : (
    <div className="rounded-lg border border-border px-[18px] py-4 text-[13.5px] leading-relaxed">
      <div className="mb-2 font-medium">It's back — {p.name}</div>
      Hello {merge("first name")},<br />You asked us to tell you when <b>{p.name}</b> returned. It is back on Zelliny{price && ` at ${price}`}.<br />Quantities are limited.<br />
      <span className="mt-2.5 inline-block rounded-lg bg-primary px-4 py-2 text-[12.5px] text-primary-foreground">Shop now</span>
    </div>
  );
}

/** "It's back" email: pick who gets it, check the message, send — one separate email each. */
export function useNotifyDialog() {
  const user = useSessionUser();
  const [open, setOpen] = useState<{ p: ProductRow; w: WaitlistRow } | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [lang, setLang] = useState<"English" | "Arabic">("English");
  const wait = open ? open.w.customers.filter((c) => !c.notified) : [];
  const show = (p: ProductRow, w: WaitlistRow) => { setTicked(new Set(w.customers.filter((c) => !c.notified).map((c) => c.id))); setOpen({ p, w }); };
  const pick = (how: "all" | "none" | "customers" | number) => setTicked(new Set(wait.filter((c, i) => (how === "all" ? true : how === "none" ? false : how === "customers" ? c.account === "Customer" : i < how)).map((c) => c.id)));
  const send = () => {
    if (!open || !ticked.size) return;
    markNotified([...ticked], `27 Sep 2026 · by ${user?.name ?? "You"}`);
    toast(`"It's back" email sent to ${ticked.size} customer${ticked.size > 1 ? "s" : ""}`);
    setOpen(null);
  };
  const tight = open ? open.p.stock < wait.length : false;
  const allOn = wait.length > 0 && wait.every((c) => ticked.has(c.id));
  const quick = "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] hover:border-primary";
  const dialog = (
    <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className="max-h-[88vh] max-w-[860px] overflow-y-auto">
        {open && (
          <>
            <DialogHeader><DialogTitle className="font-head text-[18px] font-normal">Notify customers · {open.p.name}</DialogTitle></DialogHeader>
            <div className="flex items-center gap-3.5 border-b border-border pb-3.5">
              <Thumb color={open.p.color} />
              <div><b className="font-medium">{open.p.name}</b><div className="text-[13px] text-muted-foreground">SKU {open.p.sku} · {open.p.stock} in stock · {wait.length} waiting</div></div>
            </div>
            {tight && <div className="rounded-lg border border-border border-l-[3px] border-l-primary px-3 py-2.5 text-[13px]">Only <b>{open.p.stock}</b> in stock for <b>{wait.length}</b> people waiting. You can tell everyone, or only the first {open.p.stock} who asked.</div>}
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-muted-foreground">Select:</span>
              <button type="button" className={quick} onClick={() => pick("all")}>Everyone ({wait.length})</button>
              {tight && <button type="button" className={quick} onClick={() => pick(open.p.stock)}>First {open.p.stock} who asked</button>}
              <button type="button" className={quick} onClick={() => pick("customers")}>Customers with an account</button>
              <button type="button" className={quick} onClick={() => pick("none")}>Clear</button>
            </div>
            <div className="rounded-lg border border-border text-[13.5px]">
              <div className="grid grid-cols-[22px_1fr_90px] gap-3 border-b border-border px-3 py-2 text-[12px] text-muted-foreground md:grid-cols-[22px_1fr_1fr_110px_90px]">
                <input type="checkbox" className="accent-[#0a0a0a]" checked={allOn} onChange={() => pick(allOn ? "none" : "all")} />
                <span>Customer</span><span className="max-md:hidden">Email</span><span>Asked on</span><span className="max-md:hidden">Language</span>
              </div>
              {wait.map((c) => (
                <label key={c.id} className="grid cursor-pointer grid-cols-[22px_1fr_90px] items-center gap-3 border-b border-border px-3 py-2.5 last:border-0 md:grid-cols-[22px_1fr_1fr_110px_90px]">
                  <input type="checkbox" className="accent-[#0a0a0a]" checked={ticked.has(c.id)} onChange={() => setTicked((t) => { const n = new Set(t); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} />
                  <span><b className="font-medium">{c.name}</b>{c.account === "Guest" && <span className="text-muted-foreground"> · guest</span>}</span>
                  <span className="truncate text-muted-foreground max-md:hidden">{c.email}</span><span>{c.date}</span><span className="max-md:hidden">{c.language}</span>
                </label>
              ))}
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {(["English", "Arabic"] as const).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={cn("rounded-lg border px-3 py-1 text-[12.5px]", lang === l ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface")}>{l === "Arabic" ? "العربية" : "English"}</button>)}
                <span className="ml-1.5 text-[12.5px] text-muted-foreground">Each customer gets it in their own language</span>
              </div>
              {mail(open.p, lang)}
              <div className="mt-2.5 flex gap-2.5 rounded-lg bg-info-bg px-3 py-2.5 text-[12.5px] leading-normal">
                <span className="text-info">✉</span>
                <div><b className="font-medium">One separate email to each customer.</b> The highlighted name is filled in automatically, so Mariam receives "Hello Mariam". Nobody sees anyone else's name or email address.</div>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground">Sent as <b className="text-foreground">{user?.name ?? "you"}</b>. Anyone you leave unticked stays on the waiting list.</p>
            <DialogFooter>
              <Button onClick={() => setOpen(null)}>Cancel</Button>
              <button type="button" disabled={!ticked.size} onClick={send} className="rounded-lg border border-primary bg-primary px-4 py-2 text-[13px] text-primary-foreground disabled:opacity-35">{ticked.size ? `Send to ${ticked.size} customer${ticked.size > 1 ? "s" : ""}` : "Tick at least one customer"}</button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
  return { show, dialog };
}

/* ---------- Open / edit pre-orders ---------- */
const field = "h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] outline-none focus:border-primary";
/** `show(products, row?)` — no row opens "Open pre-orders on a product" for low or out-of-stock products. */
export function usePreorderDialog(onOpened?: (productId: string) => void) {
  const [open, setOpen] = useState<{ row: PreorderRow | null; options: ProductRow[] } | null>(null);
  const [f, setF] = useState({ productId: "", expected: "", limit: "5", payment: "Paid in full online" });
  const [err, setErr] = useState("");
  const show = (options: ProductRow[], row?: PreorderRow) => {
    setErr("");
    setF(row ? { productId: row.productId, expected: row.expected, limit: String(row.limit), payment: row.payment } : { productId: options[0]?.id ?? "", expected: "", limit: "5", payment: "Paid in full online" });
    setOpen({ row: row ?? null, options });
  };
  const save = () => {
    const limit = Number(f.limit.replace(/\D/g, ""));
    if (!f.productId) { setErr("Choose a product."); return; }
    if (!f.expected.trim()) { setErr("Add the expected arrival date."); return; }
    if (!limit) { setErr("Set the maximum number of pre-orders."); return; }
    editPreorder(f.productId, { expected: f.expected.trim(), limit, payment: f.payment, ...(open?.row ? {} : { open: true }) });
    toast(open?.row ? "Pre-order saved" : "Pre-orders opened");
    if (!open?.row) onOpened?.(f.productId);
    setOpen(null);
  };
  const p = open?.options.find((x) => x.id === f.productId);
  const dialog = (
    <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className="max-w-[560px]">
        {open && (
          <>
            <DialogHeader><DialogTitle className="font-head text-[18px] font-normal">{open.row ? `Pre-orders · ${p?.name ?? ""}` : "Open pre-orders on a product"}</DialogTitle></DialogHeader>
            {open.row ? (
              <div className="flex items-center gap-3.5 border-b border-border pb-3.5">{p && <Thumb color={p.color} />}<div><b className="font-medium">{p?.name}</b><div className="text-[13px] text-muted-foreground">SKU {p?.sku} · {p?.stock} in stock · {open.row.customers.length} pre-ordered</div></div></div>
            ) : (
              <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">Product
                <select value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value })} className={field}>{open.options.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.sku} · {x.stock} in stock</option>)}</select>
                <span className="text-[11.5px]">Only low or out-of-stock products are listed</span>
              </label>
            )}
            <div className="grid gap-3.5 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">Expected arrival<input value={f.expected} onChange={(e) => setF({ ...f, expected: e.target.value })} placeholder="e.g. 12 Oct 2026" className={field} /><span className="text-[11.5px]">Shown on the product page</span></label>
              <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">Maximum pre-orders<input value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} className={field} /><span className="text-[11.5px]">Closes by itself when reached</span></label>
            </div>
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">Payment
              <select value={f.payment} onChange={(e) => setF({ ...f, payment: e.target.value })} className={field}><option>Paid in full online</option><option>Cash on delivery not allowed for pre-orders</option></select>
            </label>
            <div>
              <div className="mb-1.5 text-[13px] font-medium">What the customer sees</div>
              <div className="rounded-lg border border-border px-4 py-3 text-[14px]">Pre-order · expected {f.expected || "[date]"}<br /><span className="text-[12.5px] text-muted-foreground">The button says "Pre-order" instead of "Add to Bag". The order confirmation repeats the expected date.</span></div>
            </div>
            <DialogFooter className="items-center">
              {err && <span className="mr-auto text-[12.5px] text-bad">{err}</span>}
              <Button onClick={() => setOpen(null)}>Cancel</Button>
              <Button primary onClick={save}>{open.row ? "Save" : "Open pre-orders"}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
  return { show, dialog };
}
