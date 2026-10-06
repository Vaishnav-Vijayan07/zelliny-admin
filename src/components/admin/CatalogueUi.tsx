// Shared pieces for Categories, Maisons and Selling control: mix bar, hide/show with a warning, bulk mode switch.
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { ProductRow } from "@/lib/api/section-types";
import { formatNumber } from "@/lib/format";
import { Toggle } from "@/components/admin/primitives";
import { Button } from "@/components/admin/page";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { bulkMode, mix, setBrandVisible, setCategoryVisible, type LiveBrand, type LiveCategory } from "@/components/admin/CatalogueFlow";

export function MixBar({ list, total }: { list: ProductRow[]; total: number }) {
  const [c, e] = mix(list, total);
  return (
    <span className="flex min-w-[150px] flex-col gap-[5px] text-[11.5px] text-muted-foreground">
      <span className="block h-[5px] overflow-hidden rounded-[3px] bg-border"><span className="block h-full bg-primary" style={{ width: `${(c / (c + e || 1)) * 100}%` }} /></span>
      <span><b className="font-semibold text-foreground">{c}</b> Add to Cart · <b className="font-semibold text-foreground">{e}</b> Enquiry</span>
    </span>
  );
}

type Target = { kind: "category"; row: LiveCategory } | { kind: "maison"; row: LiveBrand };

/** On/off switch for a whole category or maison — hiding asks first. */
export function useVisibility() {
  const [ask, setAsk] = useState<Target | null>(null);
  const apply = (t: Target, v: boolean) => (t.kind === "category" ? setCategoryVisible(t.row.id, v) : setBrandVisible(t.row.id, v));
  const request = (t: Target) => {
    if (t.row.visible) { setAsk(t); return; }
    apply(t, true);
    toast(`${t.row.name} is back on the site`);
  };
  const confirm = () => {
    if (!ask) return;
    apply(ask, false);
    toast(`${ask.row.name} is hidden from the site`);
    setAsk(null);
  };
  const dialog = (
    <Dialog open={!!ask} onOpenChange={(o) => !o && setAsk(null)}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader><DialogTitle className="font-head text-[18px] font-normal">Hide {ask?.row.name} from the site?</DialogTitle></DialogHeader>
        <p className="text-[13.5px]"><b className="font-semibold">{formatNumber(ask?.row.count ?? 0)} products</b> in this {ask?.kind} will disappear from the site — its page, menu link and search too.</p>
        <p className="text-[12.5px] text-muted-foreground">Nothing is deleted. Prices, stock and each product's own settings are kept. Switch it back on any time.</p>
        <DialogFooter><Button onClick={() => setAsk(null)}>Cancel</Button><Button primary onClick={confirm}>Hide {formatNumber(ask?.row.count ?? 0)} products</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const toggle = (t: Target): ReactNode => (
    <Toggle on={t.row.visible} onChange={() => request(t)} label={t.row.visible ? "On site — click to hide" : "Hidden — click to show"} />
  );
  return { toggle, dialog };
}

/** "All → Add to Cart / Enquiry" for a whole category or maison, with a confirmation. */
export function useBulkMode() {
  const [ask, setAsk] = useState<{ name: string; list: ProductRow[]; mode: "cart" | "enq" } | null>(null);
  const noPrice = ask && ask.mode === "cart" ? ask.list.filter((p) => !p.price).length : 0;
  const confirm = () => {
    if (!ask) return;
    const { n } = bulkMode(ask.list, ask.mode);
    toast(`${n} products switched`);
    setAsk(null);
  };
  const dialog = (
    <Dialog open={!!ask} onOpenChange={(o) => !o && setAsk(null)}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader><DialogTitle className="font-head text-[18px] font-normal">All {ask?.name} → {ask?.mode === "cart" ? "Add to Cart" : "Enquiry"}</DialogTitle></DialogHeader>
        <p className="text-[13.5px]">This switches <b className="font-semibold">every product</b> in {ask?.name} to {ask?.mode === "cart" ? "Add to Cart" : "Enquiry"} in one go. You can still flip single products back afterwards.</p>
        {noPrice > 0 && <p className="text-[13px] text-warn">{noPrice} product(s) have no price and will stay on Enquiry until you add one.</p>}
        <DialogFooter><Button onClick={() => setAsk(null)}>Cancel</Button><Button primary onClick={confirm}>Apply to all</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
  return { ask: (name: string, list: ProductRow[], mode: "cart" | "enq") => setAsk({ name, list, mode }), dialog };
}
