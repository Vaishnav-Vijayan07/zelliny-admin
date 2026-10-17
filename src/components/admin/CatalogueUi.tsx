// Shared pieces for Categories, Maisons and Selling control: mix bar, hide/show with a warning, bulk mode switch.
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { ProductRow } from "@/lib/api/section-types";
import { formatNumber } from "@/lib/format";
import { Toggle } from "@/components/admin/primitives";
import { Button } from "@/components/admin/page";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  bulkMode,
  isCart,
  mix,
  setBrandVisible,
  setCategoryVisible,
  type LiveBrand,
  type LiveCategory,
} from "@/components/admin/CatalogueFlow";

export function MixBar({ list, total }: { list: ProductRow[]; total: number }) {
  const [c, e] = mix(list, total);
  return (
    <span className="flex min-w-[150px] flex-col gap-[5px] text-[11.5px] text-muted-foreground">
      <span className="block h-[5px] overflow-hidden rounded-[3px] bg-border">
        <span
          className="block h-full bg-primary"
          style={{ width: `${(c / (c + e || 1)) * 100}%` }}
        />
      </span>
      <span>
        <b className="font-semibold text-foreground">{c}</b> Add to Cart ·{" "}
        <b className="font-semibold text-foreground">{e}</b> Enquiry
      </span>
    </span>
  );
}

type Target = { kind: "category"; row: LiveCategory } | { kind: "maison"; row: LiveBrand };

/** On/off switch for a whole category or maison — hiding asks first. */
export function useVisibility() {
  const [ask, setAsk] = useState<Target | null>(null);
  const apply = (t: Target, v: boolean) =>
    t.kind === "category" ? setCategoryVisible(t.row.id, v) : setBrandVisible(t.row.id, v);
  const request = (t: Target) => {
    if (t.row.visible) {
      setAsk(t);
      return;
    }
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
        <DialogHeader>
          <DialogTitle className="font-head text-[18px] font-normal">
            Hide {ask?.row.name} from the site?
          </DialogTitle>
        </DialogHeader>
        <p className="text-[13.5px]">
          <b className="font-semibold">{formatNumber(ask?.row.count ?? 0)} products</b> in this{" "}
          {ask?.kind} will disappear from the site — its page, menu link and search too.
        </p>
        <p className="text-[12.5px] text-muted-foreground">
          Nothing is deleted. Prices, stock and each product's own settings are kept. Switch it back
          on any time.
        </p>
        <DialogFooter>
          <Button onClick={() => setAsk(null)}>Cancel</Button>
          <Button primary onClick={confirm}>
            Hide {formatNumber(ask?.row.count ?? 0)} products
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const toggle = (t: Target): ReactNode => (
    <Toggle
      on={t.row.visible}
      onChange={() => request(t)}
      label={t.row.visible ? "On site — click to hide" : "Hidden — click to show"}
    />
  );
  return { toggle, dialog };
}

/** "All → Add to Cart / Enquiry" for a whole category or maison, with a confirmation. */
export function useBulkMode() {
  const [ask, setAsk] = useState<{ name: string; list: ProductRow[]; mode: "cart" | "enq" } | null>(
    null,
  );
  // Exactly how many change, how many are already in that mode, and how many have no price.
  const toCart = ask?.mode === "cart";
  const already = ask ? ask.list.filter((p) => (toCart ? isCart(p) : !isCart(p))).length : 0;
  const noPrice = ask && toCart ? ask.list.filter((p) => !isCart(p) && !p.price).length : 0;
  const willSwitch = ask ? ask.list.length - already - noPrice : 0;
  const modeName = toCart ? "Add to Cart" : "Enquiry";
  const pr = (n: number) => `${formatNumber(n)} product${n === 1 ? "" : "s"}`;
  const confirm = () => {
    if (!ask) return;
    bulkMode(ask.list, ask.mode);
    toast(`${pr(willSwitch)} switched to ${modeName}`);
    setAsk(null);
  };
  const dialog = (
    <Dialog open={!!ask} onOpenChange={(o) => !o && setAsk(null)}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-head text-[18px] font-normal">
            All {ask?.name} → {ask?.mode === "cart" ? "Add to Cart" : "Enquiry"}
          </DialogTitle>
        </DialogHeader>
        {willSwitch > 0 ? (
          <p className="text-[13.5px]">
            This switches <b className="font-semibold">{pr(willSwitch)}</b> in {ask?.name} to{" "}
            {modeName} in one go
            {already > 0 ? ` — the other ${formatNumber(already)} are already ${modeName}` : ""}.
            You can still flip single products back afterwards.
          </p>
        ) : noPrice > 0 ? (
          <p className="text-[13.5px]">
            No product in {ask?.name} can switch to Add to Cart right now.
          </p>
        ) : (
          <p className="text-[13.5px]">
            All {pr(ask?.list.length ?? 0)} in {ask?.name} are already {modeName}.
          </p>
        )}
        {noPrice > 0 && (
          <div className="rounded-lg border border-[#e8d3ae] bg-warn-bg px-3 py-2.5 text-[13px] leading-normal text-warn">
            <b className="font-semibold">
              {formatNumber(noPrice)} product{noPrice === 1 ? "" : "s"}{" "}
              {noPrice === 1 ? "has" : "have"} no price
            </b>{" "}
            and will stay on Enquiry until you add one.
          </div>
        )}
        <DialogFooter>
          {willSwitch > 0 ? (
            <>
              <Button onClick={() => setAsk(null)}>Cancel</Button>
              <Button primary onClick={confirm}>
                Switch {pr(willSwitch)}
              </Button>
            </>
          ) : (
            <Button primary onClick={() => setAsk(null)}>
              OK
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  return {
    ask: (name: string, list: ProductRow[], mode: "cart" | "enq") => setAsk({ name, list, mode }),
    dialog,
  };
}
