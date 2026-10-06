// Shared pieces for Browsing & follow-up: intent badge, mail preview, send-offer dialog.
import { useState } from "react";
import { toast } from "sonner";
import type { BrowserRow } from "@/lib/api/section-types";
import { Button } from "@/components/admin/page";
import { Thumb } from "@/components/admin/primitives";
import { OFFERS, defaultSubject, firstName, recordSent } from "@/components/admin/BrowsingFlow";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const STOP_LABEL: Record<BrowserRow["stop"], string> = { home: "Homepage", category: "Category page", product: "Product page", bag: "Bag", checkout: "Checkout" };
const INTENT_CLS = { Hot: "bg-bad-bg text-bad", Warm: "bg-warn-bg text-warn", Cool: "bg-hover text-muted-foreground" } as const;
export const IntentBadge = ({ intent }: { intent: BrowserRow["intent"] }) => <span className={`rounded px-2 py-0.5 text-[11.5px] ${INTENT_CLS[intent]}`}>{intent}</span>;
export const egp = (n: number) => `${n.toLocaleString("en-US")} EGP`;

export function MailPreview({ b, offer }: { b: BrowserRow; offer?: string }) {
  const v = b.views[0]!;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="bg-[#0b0b0b] p-4 text-center font-head text-[14px] tracking-[.42em] text-white">ZELLINY</div>
      <div className="p-5 text-center text-[13px] text-[#333]">
        <h4 className="mb-1.5 text-[16px] font-normal">Still thinking about it, {firstName(b.name)}?</h4>
        <p className="mb-3">You were looking at something beautiful. It's still here for you.</p>
        <div className="mb-3 flex items-center justify-center gap-3 text-left">
          <Thumb color={v.color} />
          <div><b className="font-medium">{v.name}</b><div className="text-[12px] text-muted-foreground">{v.brand}</div><div>{v.price ? egp(v.price) : "Price on request"}</div></div>
        </div>
        {offer && offer !== "No discount" && <div className="mb-3 text-[12.5px] font-medium">{offer} · this week only</div>}
        <span className="inline-block bg-[#0b0b0b] px-4 py-2 text-[12px] text-white">Return to your selection</span>
      </div>
    </div>
  );
}

/** Send one personalised follow-up to a single person. */
export function SendOfferDialog({ b, open, onClose }: { b: BrowserRow; open: boolean; onClose: () => void }) {
  const [offer, setOffer] = useState(OFFERS[0]!);
  const subject = defaultSubject(b.name);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader><DialogTitle className="font-head text-[18px] font-normal">Send a follow-up to {b.name}</DialogTitle></DialogHeader>
        <div className="grid gap-3 text-[13px]">
          <div><div className="mb-1 text-[12px] text-muted-foreground">To</div>{b.email}</div>
          <div><div className="mb-1 text-[12px] text-muted-foreground">Subject</div>{subject}</div>
          <label className="grid gap-1"><span className="text-[12px] text-muted-foreground">Offer</span>
            <select value={offer} onChange={(e) => setOffer(e.target.value)} className="h-9 rounded-lg border border-border bg-surface px-3 text-[14px]">{OFFERS.map((o) => <option key={o}>{o}</option>)}</select>
          </label>
          <div className="text-[12px] text-muted-foreground">Preview</div>
          <MailPreview b={b} offer={offer} />
          <p className="text-[12px] text-muted-foreground">Sent in the customer's chosen language (English or Arabic) · recorded in the Activity log.</p>
        </div>
        <DialogFooter><Button onClick={onClose}>Cancel</Button><Button primary onClick={() => { recordSent(b.id, subject); toast(`Email sent to ${b.name}`); onClose(); }}>Send email</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
