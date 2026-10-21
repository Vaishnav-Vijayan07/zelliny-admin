// Shared pieces for Browsing & follow-up: intent badge, mail preview, send-offer dialog.
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";
import { discountsQuery } from "@/lib/api/sections.functions";
import type { BrowserRow } from "@/lib/api/section-types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/admin/page";
import { Thumb } from "@/components/admin/primitives";
import { SearchSelect } from "@/components/admin/SearchSelect";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { benefit, statusOf, usePromotions } from "@/components/admin/DiscountFlow";
import {
  EXPIRY_DAYS,
  NO_OFFER,
  PERSONAL_OFFERS,
  defaultSubject,
  expiryLabel,
  firstName,
  personalCode,
  recordSent,
  whatsappSubject,
} from "@/components/admin/BrowsingFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const STOP_LABEL: Record<BrowserRow["stop"], string> = {
  home: "Homepage",
  category: "Category page",
  product: "Product page",
  bag: "Bag",
  checkout: "Checkout",
};
const INTENT_CLS = {
  Hot: "bg-bad-bg text-bad",
  Warm: "bg-warn-bg text-warn",
  Cool: "bg-hover text-muted-foreground",
} as const;
export const IntentBadge = ({ intent }: { intent: BrowserRow["intent"] }) => (
  <span className={`rounded px-2 py-0.5 text-[11.5px] ${INTENT_CLS[intent]}`}>{intent}</span>
);
export const egp = (n: number) => `${n.toLocaleString("en-US")} EGP`;

export function MailPreview({ b, offer }: { b: BrowserRow; offer?: string }) {
  const v = b.views[0]!;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="bg-[#0b0b0b] p-4 text-center font-head text-[14px] tracking-[.42em] text-white">
        ZELLINY
      </div>
      <div className="p-5 text-center text-[13px] text-[#333]">
        <h4 className="mb-1.5 text-[16px] font-normal">
          Still thinking about it, {firstName(b.name)}?
        </h4>
        <p className="mb-3">You were looking at something beautiful. It's still here for you.</p>
        <div className="mb-3 flex items-center justify-center gap-3 text-left">
          <Thumb color={v.color} />
          <div>
            <b className="font-medium">{v.name}</b>
            <div className="text-[12px] text-muted-foreground">{v.brand}</div>
            <div>{v.price ? egp(v.price) : "Price on request"}</div>
          </div>
        </div>
        {offer && offer !== "No discount" && (
          <div className="mb-3 text-[12.5px] font-medium">{offer} · this week only</div>
        )}
        <span className="inline-block bg-[#0b0b0b] px-4 py-2 text-[12px] text-white">
          Return to your selection
        </span>
      </div>
    </div>
  );
}

/** WhatsApp needs a mobile number; both channels need marketing consent. */
export const canEmail = (b: BrowserRow) => b.optin;
export const canWhatsApp = (b: BrowserRow) => b.optin && b.phone !== "—";

/** Offer picker: active promotions from Discounts & offers plus personal one-use offers. */
function OfferSelect({
  value,
  groups,
  onChange,
}: {
  value: string;
  groups: { title?: string; items: { value: string; label: string }[] }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = groups.flatMap((g) => g.items).find((i) => i.value === value)?.label ?? value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3 text-left text-[14px] outline-none hover:border-primary",
            open ? "border-primary" : "border-border",
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 flex-none opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        collisionPadding={16}
        className="flex max-h-[min(360px,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] flex-col rounded-xl p-1.5"
      >
        <div className="min-h-0 flex-1 overflow-auto">
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.title && (
                <div className="px-2.5 pb-1 pt-2.5 text-[10.5px] uppercase tracking-[.15em] text-muted-foreground">
                  {g.title}
                </div>
              )}
              {g.items.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[13.5px] hover:bg-hover",
                    o.value === value && "font-semibold",
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === value && <Check className="size-3.5 flex-none" />}
                </button>
              ))}
            </div>
          ))}
        </div>
        <Link
          to="/discounts"
          className="mt-1 border-t border-line-soft px-2.5 pb-1 pt-2.5 text-[12.5px] underline underline-offset-[3px]"
        >
          Manage offers in Discounts & offers
        </Link>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Send a personalised follow-up (email or WhatsApp) to one or more people. Nothing is sent
 * automatically — only when the team presses send here.
 */
export function SendDialog({
  people,
  onClose,
  onSent,
}: {
  people: BrowserRow[];
  onClose: () => void;
  onSent?: () => void;
}) {
  const { data } = useSuspenseQuery(discountsQuery());
  const promos = usePromotions(data).filter((p) => statusOf(p).label === "Active");
  const [channel, setChannel] = useState<"Email" | "WhatsApp">("Email");
  const [offer, setOffer] = useState(NO_OFFER);
  const [days, setDays] = useState("7");
  const [done, setDone] = useState<{ n: number; channel: string; names: string[] } | null>(null);

  const wa = channel === "WhatsApp";
  const sendable = people.filter(wa ? canWhatsApp : canEmail);
  const skipped = people.length - sendable.length;
  const first = sendable[0] ?? people[0]!;
  const personal = PERSONAL_OFFERS.includes(offer);

  const promoLabel = (p: (typeof promos)[number]) =>
    p.type === "coupon" ? `${benefit(p)} · ${p.code}` : `${p.name} · ${benefit(p)}`;
  const groups = [
    { items: [{ value: NO_OFFER, label: NO_OFFER }] },
    ...(promos.length
      ? [
          {
            title: "From Discounts & offers",
            items: promos.map((p) => ({ value: p.id, label: promoLabel(p) })),
          },
        ]
      : []),
    {
      title: "Personal code · one use",
      items: PERSONAL_OFFERS.map((o) => ({ value: o, label: o })),
    },
  ];
  const promo = promos.find((p) => p.id === offer);
  const offerText = promo ? promoLabel(promo) : offer;

  const send = () => {
    sendable.forEach((b) => {
      const text = personal
        ? `${offer} · code ${personalCode(b.name, offer)} · expires ${expiryLabel(Number(days))}`
        : offerText;
      recordSent(b.id, {
        channel,
        subject: wa ? whatsappSubject(b.name) : defaultSubject(b.name),
        offer: text,
      });
    });
    setDone({ n: sendable.length, channel, names: sendable.map((b) => b.name) });
    onSent?.();
  };

  const names = done?.names ?? [];
  const sentTo =
    names.length > 3
      ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`
      : names.length > 1
        ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
        : (names[0] ?? "");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[520px]">
        {done ? (
          <div className="grid justify-items-center gap-3 py-2 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-good-bg text-[20px] text-good">
              ✓
            </span>
            <DialogTitle className="font-head text-[18px] font-normal">
              {done.n} {done.channel === "WhatsApp" ? "WhatsApp message" : "email"}
              {done.n > 1 ? "s" : ""} sent
            </DialogTitle>
            <p className="text-[13.5px]">Sent to {sentTo}.</p>
            <p className="text-[12.5px] text-muted-foreground">
              You'll find {done.n > 1 ? "each one" : "it"} under "Follow-ups sent" on the person's
              page.
            </p>
            <Button primary onClick={onClose}>
              OK
            </Button>
          </div>
        ) : (
          <>
            <div className="inline-flex w-fit rounded-full border border-border p-0.5">
              {(["Email", "WhatsApp"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={cn(
                    "h-7 rounded-full px-4 text-[12.5px]",
                    channel === c ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <DialogHeader>
              <DialogTitle className="font-head text-[18px] font-normal">
                {wa ? "WhatsApp" : "Email"} {sendable.length}{" "}
                {sendable.length === 1 ? "person" : "people"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-[13.5px]">
              {wa ? (
                <>
                  Each person gets a WhatsApp message with the product <b>they</b> looked at, sent
                  from the Zelliny WhatsApp Business number.
                </>
              ) : (
                <>
                  Each person gets an email with the product <b>they</b> looked at — not the same
                  email for everyone.
                </>
              )}
            </p>
            <div className="grid gap-1">
              <span className="text-[12px] text-muted-foreground">Offer</span>
              <OfferSelect value={offer} groups={groups} onChange={setOffer} />
              {offer !== NO_OFFER && (
                <span className="text-[12px] text-muted-foreground">
                  {personal
                    ? "Each person gets their own one-use code. It can't be shared or used twice."
                    : "Uses the code from Discounts & offers, with its own dates and limits."}
                </span>
              )}
            </div>
            {personal && (
              <div className="grid gap-1">
                <span className="text-[12px] text-muted-foreground">Code expires after</span>
                <SearchSelect
                  value={days}
                  items={EXPIRY_DAYS.map((d) => ({ value: d, label: `${d} days` }))}
                  onChange={(v) => v && setDays(v)}
                  searchable={false}
                  className="w-[160px] text-[14px]"
                />
              </div>
            )}
            {sendable.length > 0 &&
              (wa ? (
                <div className="max-w-[340px] rounded-xl bg-[#e7f3e4] p-3 text-[13px]">
                  <div
                    className="h-[120px] rounded-lg"
                    style={{ background: first.views[0]!.color }}
                  />
                  <p className="mt-2.5 leading-normal">
                    Hi {firstName(first.name)}, your {first.views[0]!.name} is still waiting for you
                    at Zelliny.
                    {offer !== NO_OFFER &&
                      (personal ? ` ${offer} with your personal code.` : ` ${offerText}.`)}
                  </p>
                  <span className="mt-2.5 block border-t border-[#cfe3ca] pt-2 text-center text-[#1f6e8c]">
                    Return to your selection
                  </span>
                </div>
              ) : (
                <MailPreview b={first} offer={offer === NO_OFFER ? offer : offerText} />
              ))}
            {wa && sendable.length > 0 && (
              <p className="text-[12px] text-muted-foreground">
                Preview for {first.name} · sent to {first.phone}
              </p>
            )}
            {skipped > 0 && (
              <p className="text-[12px] text-muted-foreground">
                {skipped} selected {skipped > 1 ? "people" : "person"}{" "}
                {wa
                  ? "can't get WhatsApp (no marketing consent or no mobile number)"
                  : "didn't agree to marketing emails"}{" "}
                and will be skipped.
              </p>
            )}
            <DialogFooter>
              <Button onClick={onClose}>Cancel</Button>
              {sendable.length > 0 && (
                <Button primary onClick={send}>
                  {wa
                    ? `Send ${sendable.length} WhatsApp message${sendable.length === 1 ? "" : "s"}`
                    : `Send ${sendable.length} email${sendable.length === 1 ? "" : "s"}`}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
