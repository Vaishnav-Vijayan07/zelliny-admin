// Corporate enquiries: local changes, stage colours, and every dialog (new enquiry,
// change stage / assign together, email, WhatsApp / SMS, export, quotation).
// Shared by the enquiries list and the single-enquiry page. Local for now — swap for API calls.
import { useMemo, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import type { EnquiryProduct, EnquiryRow, QuoteLine } from "@/lib/api/section-types";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/hooks/use-session";
import { Button } from "./page";
import { Dropdown } from "./Dropdown";
import { Thumb } from "./primitives";
import { downloadCsv } from "./CustomerFlow";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const STAGES = ["New", "Contacted", "Quoted", "Negotiation", "Won", "Lost"];
export const STAGE_COLOR: Record<string, string> = {
  New: "#0A0A0A",
  Contacted: "#2B5A8C",
  Quoted: "#5B4F96",
  Negotiation: "#9A6200",
  Won: "#1F7A4D",
  Lost: "#B3261E",
};
export const STAGE_HINT: Record<string, string> = {
  New: "Not contacted yet",
  Contacted: "We have called, emailed or messaged them",
  Quoted: "Quotation sent",
  Negotiation: "Still going on",
  Won: "Order confirmed",
  Lost: "Closed without order",
};
const TONE = {
  New: "warn",
  Contacted: "info",
  Quoted: "info",
  Negotiation: "warn",
  Won: "ok",
  Lost: "bad",
} as const;
const CATEGORIES = [
  "Writing Instruments",
  "Leather Goods",
  "Smoking Accessories",
  "Watches",
  "Jewellery",
  "Bags",
  "Fragrance",
  "Beauty",
  "Mixed / not sure yet",
];
const CAME_IN = [
  "Phone call",
  "WhatsApp",
  "Email",
  "Walk-in / event",
  "Referral",
  "Instagram message",
  "LinkedIn",
];
export const LOST_REASONS = [
  "Price too high",
  "Chose another supplier",
  "Budget cancelled",
  "Delivery date too tight",
  "No reply from client",
  "Other",
];
/** The website is split in two: a product page's Enquire now, or the corporate form. */
export const CAME_FROM_EXTRA = ["Product page", "Corporate form", "Phone call", "Referral"];
export function cameFrom(e: EnquiryRow) {
  if (e.src.manual) return e.src.channel;
  return e.product || e.src.page?.startsWith("Product page") ? "Product page" : "Corporate form";
}
export function matchesCameFrom(e: EnquiryRow, v: string) {
  if (v === "Product page" || v === "Corporate form") return !e.src.manual && cameFrom(e) === v;
  return e.src.channel === v;
}
/** "24 Sep" + "20:15" → a real date (the list shows no year). */
export function enquiryWhen(e: EnquiryRow) {
  const y = new Date().getFullYear();
  const m = /^(\d{1,2}) ([A-Za-z]{3})/.exec(e.date);
  const t = /(\d{1,2}):(\d{2})/.exec(e.time);
  const d = m ? new Date(`${m[1]} ${m[2]} ${y}`) : new Date();
  if (t) d.setHours(+t[1]!, +t[2]!);
  return d;
}
/** Dateless text the sort and date filter use, e.g. "24 Sep 2026". */
export const enquiryDay = (e: EnquiryRow) =>
  /^\d{1,2} [A-Za-z]{3}$/.test(e.date) ? `${e.date} ${new Date().getFullYear()}` : e.date;
/** What a won deal is worth — the total of the quotation that became the order. */
export const dealValue = (e: EnquiryRow) => quoteTotal(e.quote);
const PERSONAL = [
  "None",
  "Logo engraving",
  "Initials engraving",
  "Embossing",
  "Logo printing",
  "Gift box only",
];
const now = () => "Today, just now";
const first = (n: string) => n.split(" ")[0] ?? n;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
export const quoteTotal = (q: QuoteLine[]) => q.reduce((a, l) => a + (l.unit + l.pers) * l.qty, 0);

/* ---------- local store ---------- */
type Edit = Partial<
  Pick<
    EnquiryRow,
    "owner" | "followUp" | "quote" | "quoteRef" | "quoteSent" | "order" | "unread" | "lostReason"
  >
> & { stage?: string; log?: EnquiryRow["log"] };
let created: EnquiryRow[] = [];
let edits: Record<string, Edit> = {};
const listeners = new Set<() => void>();
const sub = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const emit = () => listeners.forEach((l) => l());
const NO_ROWS: EnquiryRow[] = [];
const NO_EDITS: Record<string, Edit> = {};

export function useEnquiries(rows: EnquiryRow[]): EnquiryRow[] {
  const c = useSyncExternalStore(
    sub,
    () => created,
    () => NO_ROWS,
  );
  const e = useSyncExternalStore(
    sub,
    () => edits,
    () => NO_EDITS,
  );
  return useMemo(
    () =>
      [...c, ...rows].map((r) => {
        const x = e[r.id];
        if (!x) return r;
        const { stage, log, ...rest } = x;
        return {
          ...r,
          ...rest,
          ...(stage && {
            stage: { label: stage, tone: TONE[stage as keyof typeof TONE] ?? "mute" },
          }),
          log: [...r.log, ...(log ?? [])],
        };
      }),
    [c, rows, e],
  );
}
/** Change fields and (optionally) add one history line. */
export function editEnquiry(
  id: string,
  e: Omit<Edit, "log">,
  line?: { via: string; text: string },
) {
  const cur = edits[id] ?? {};
  edits = {
    ...edits,
    [id]: { ...cur, ...e, ...(line && { log: [...(cur.log ?? []), { ...line, when: now() }] }) },
  };
  emit();
}
export function setStage(r: EnquiryRow, to: string, who: string, note?: string) {
  if (r.stage.label === to) return;
  editEnquiry(
    r.id,
    { stage: to, unread: false },
    {
      via: "System",
      text: `Stage changed from ${r.stage.label} to ${to} · by ${who}${note ? ` · ${note}` : ""}`,
    },
  );
}
export function setOwner(r: EnquiryRow, to: string, who: string) {
  if (r.owner === to) return;
  editEnquiry(
    r.id,
    { owner: to },
    { via: "System", text: `Owner changed from ${r.owner} to ${to} · by ${who}` },
  );
}

/* ---------- stage dropdown in the stage's colour ---------- */
export function StageSelect({
  r,
  big,
  onPick,
}: {
  r: EnquiryRow;
  big?: boolean;
  /** Receives the chosen stage — Lost and Won open a window first. */
  onPick: (to: string) => void;
}) {
  const c = STAGE_COLOR[r.stage.label] ?? "#767676";
  return (
    <Dropdown
      value={r.stage.label}
      ariaLabel="Change stage"
      onChange={onPick}
      options={STAGES.map((st) => ({ value: st, label: st, dot: STAGE_COLOR[st] ?? "#767676" }))}
      style={
        {
          color: c,
          background: `color-mix(in srgb, ${c} 9%, #fff)`,
          borderColor: `color-mix(in srgb, ${c} 28%, #fff)`,
        } as CSSProperties
      }
      className={cn(
        "rounded-full font-medium hover:opacity-90",
        big ? "h-11 w-full px-5 text-[14px]" : "h-9 px-3 text-[13px]",
      )}
    />
  );
}

/* ---------- date + time picker for the next follow-up ---------- */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const p2 = (n: number) => String(n).padStart(2, "0");
export const fmtFollowUp = (d: Date) =>
  `${DAYS[d.getDay()]} ${d.getDate()} ${MONS[d.getMonth()]}, ${p2(d.getHours())}:${p2(d.getMinutes())}`;
function parseFollowUp(t: string): Date | null {
  const m = /(\d{1,2}) ([A-Za-z]{3}),? (\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  const mi = MONS.indexOf(m[2]!);
  if (mi < 0) return null;
  return new Date(new Date().getFullYear(), mi, +m[1]!, +m[3]!, +m[4]!);
}
const TIMES = Array.from(
  { length: 23 },
  (_, i) => `${p2(9 + Math.floor(i / 2))}:${i % 2 ? "30" : "00"}`,
);

export function FollowUpPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const base = parseFollowUp(value);
  const [day, setDay] = useState<Date | undefined>(base ?? undefined);
  const [time, setTime] = useState(
    base ? `${p2(base.getHours())}:${p2(base.getMinutes())}` : "10:00",
  );
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const quick = (n: number, t: string) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    setDay(d);
    setTime(t);
  };
  const set = () => {
    if (!day) return;
    const [h, m] = time.split(":").map(Number);
    onChange(fmtFollowUp(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)));
    setOpen(false);
  };
  const toMonday = (8 - today.getDay()) % 7 || 7;
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (disabled) return;
        setOpen(o);
        if (o) setDay(base ?? undefined);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={!!disabled}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-lg border border-border bg-surface px-3.5 text-left text-[14px] outline-none hover:border-primary disabled:cursor-default disabled:text-muted-foreground disabled:opacity-60",
            !value && "text-muted-foreground",
            open && "border-primary",
          )}
        >
          <span>{value || "Pick a date and time"}</span>
          <span className="text-muted-foreground">▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto rounded-xl p-4">
        <div className="mb-3 text-[13.5px] font-medium">Next follow-up</div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(
            [
              ["Today 17:00", () => quick(0, "17:00")],
              ["Tomorrow 10:00", () => quick(1, "10:00")],
              ["In 3 days", () => quick(3, "10:00")],
              ["Next Monday", () => quick(toMonday, "10:00")],
            ] as [string, () => void][]
          ).map(([l, f]) => (
            <button
              key={l}
              type="button"
              onClick={f}
              className="rounded-full border border-border px-3 py-1 text-[12px] hover:border-primary"
            >
              {l}
            </button>
          ))}
        </div>
        <Calendar
          mode="single"
          selected={day}
          onSelect={setDay}
          {...(day ? { defaultMonth: day } : {})}
          disabled={{ before: today }}
          className="p-0"
        />
        <div className="mt-3 grid max-h-[112px] grid-cols-5 gap-1.5 overflow-auto">
          {TIMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTime(t)}
              className={cn(
                "h-8 rounded-lg border text-[12.5px]",
                time === t ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setDay(undefined);
              setOpen(false);
            }}
            className="text-[12.5px] text-muted-foreground underline"
          >
            Clear
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-8 rounded-lg border border-border px-3 text-[12.5px]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!day}
              onClick={set}
              className="h-8 rounded-lg bg-primary px-3 text-[12.5px] text-primary-foreground disabled:opacity-40"
            >
              Set follow-up
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type ProductOpt = {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  color: string;
  price: number | null;
};
/** Type a product or maison — pick from the list. Starts empty. */
export function ProductSearch({
  products,
  value,
  onPick,
  onClear,
  placeholder = "Type a product or maison — e.g. Cerruti, pen, wallet",
}: {
  products: ProductOpt[];
  value: ProductOpt | null;
  onPick: (p: ProductOpt) => void;
  onClear: () => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  if (value)
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-primary bg-surface px-3 py-2 text-[13px]">
        <span className="flex min-w-0 items-center gap-2.5">
          <Thumb color={value.color} className="size-8 rounded-md" />
          <span className="min-w-0">
            <b className="block truncate font-medium text-foreground">{value.name}</b>
            <small className="text-muted-foreground">
              {value.brand} · {value.sku}
            </small>
          </span>
        </span>
        <button type="button" onClick={onClear} className="text-[12.5px] underline">
          Change
        </button>
      </div>
    );
  const t = q.trim().toLowerCase();
  const hits = t
    ? products.filter((x) => `${x.name} ${x.brand} ${x.sku}`.toLowerCase().includes(t)).slice(0, 8)
    : [];
  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={input}
      />
      {t && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-[260px] overflow-auto rounded-xl border border-border bg-surface p-1.5 shadow-[0_14px_34px_rgba(0,0,0,.12)]">
          {hits.length ? (
            hits.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => {
                  onPick(x);
                  setQ("");
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-hover"
              >
                <Thumb color={x.color} className="size-8 rounded-md" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate font-medium text-foreground">{x.name}</b>
                  <small className="text-muted-foreground">
                    {x.brand} · {x.sku}
                  </small>
                </span>
                <span className="whitespace-nowrap text-muted-foreground">
                  {x.price ? formatMoney(x.price) : "—"}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2.5 text-[13px] text-muted-foreground">
              No product found — check the spelling or the maison name.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- pieces ---------- */
const input =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary";
const Title = ({ children, sub: s }: { children: ReactNode; sub?: ReactNode }) => (
  <DialogHeader>
    <DialogTitle className="font-head text-[18px] font-normal">{children}</DialogTitle>
    {s && <p className="text-[12.5px] text-muted-foreground">{s}</p>}
  </DialogHeader>
);
function Field({
  label,
  req,
  children,
  hint,
  bad,
}: {
  label: ReactNode;
  req?: boolean;
  children: ReactNode;
  hint?: ReactNode;
  bad?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5 text-[12px] text-muted-foreground",
        bad && "[&_input]:border-bad",
      )}
    >
      <span>
        {label}
        {req && <em className="not-italic text-bad"> *</em>}
      </span>
      {children}
      {hint && <span className="text-[11.5px]">{hint}</span>}
    </div>
  );
}
const Primary = ({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="rounded-lg border border-primary bg-primary px-4 py-2 text-[13px] text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
  >
    {children}
  </button>
);
const Pills = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => (
      <button
        key={o}
        type="button"
        onClick={() => onChange(o)}
        className={cn(
          "h-[34px] rounded-full border px-3.5 text-[12.5px]",
          value === o
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-surface",
        )}
      >
        {o}
      </button>
    ))}
  </div>
);
const Section = ({ children }: { children: ReactNode }) => (
  <div className="mt-1 border-b border-line-soft pb-2 text-[10.5px] uppercase tracking-[.16em] text-muted-foreground">
    {children}
  </div>
);

const EMAIL_TPL: Record<string, [string, string]> = {
  "Write my own": ["", ""],
  "Thank you for your enquiry": [
    "Thank you for your enquiry — Zelliny",
    "Dear {first name},\n\nThank you for contacting Zelliny. We have received your enquiry and will be in touch shortly with options for you.\n\nKind regards,\n{my name}\nZelliny",
  ],
  "Follow-up on your enquiry": [
    "Your gifting enquiry with Zelliny",
    "Dear {first name},\n\nThank you for your enquiry. We would be glad to prepare options for you. When would be a good time for a short call?\n\nKind regards,\n{my name}\nZelliny",
  ],
  "Quotation sent": [
    "Your quotation from Zelliny",
    "Dear {first name},\n\nPlease find your quotation attached. Prices include the personalisation shown. We are happy to adjust quantities or items.\n\nKind regards,\n{my name}\nZelliny",
  ],
  "Order confirmed": [
    "Your order is confirmed",
    "Dear {first name},\n\nThank you for your order. It is confirmed and we will share the delivery date with you shortly.\n\nKind regards,\n{my name}\nZelliny",
  ],
  "Catalogue & engraving options": [
    "Zelliny corporate catalogue and engraving options",
    "Dear {first name},\n\nPlease find our corporate catalogue attached, with the engraving and gift box options.\n\nKind regards,\n{my name}\nZelliny",
  ],
  "Year-end gifting reminder": [
    "Year-end gifts — order dates",
    "Dear {first name},\n\nA short note that orders for year-end gifts should be confirmed by early November to allow time for engraving.\n\nKind regards,\n{my name}\nZelliny",
  ],
};
const WA_TPL: Record<string, string> = {
  "Thank you for your enquiry":
    "Hello {first name}, thank you for contacting Zelliny. We have your enquiry and {my name} will be in touch shortly.",
  "Enquiry follow-up":
    "Hello {first name}, this is {my name} from Zelliny about your gifting enquiry. Is now a good time to talk?",
  "Quotation sent":
    "Hello {first name}, we have emailed your quotation from Zelliny. Happy to go through it on a call.",
  "Order confirmed":
    "Hello {first name}, your Zelliny corporate order is confirmed. We will share the delivery date shortly.",
  "Quotation reminder":
    "Hello {first name}, just checking you received our quotation. Happy to adjust quantities or options.",
  "Year-end reminder":
    "Hello {first name}, a reminder that year-end gift orders should be confirmed by early November for engraving.",
};
const EXPORT_COLS: [string, string, (e: EnquiryRow) => string | number][] = [
  ["id", "Enquiry", (e) => e.id],
  ["date", "Received", (e) => e.date],
  ["contact", "Client", (e) => e.contact],
  ["company", "Company", (e) => e.company],
  ["email", "Email", (e) => e.email],
  ["phone", "Mobile", (e) => e.phone],
  ["items", "Request", (e) => e.items],
  ["qty", "Quantity", (e) => e.qty],
  ["stage", "Stage", (e) => e.stage.label],
  ["owner", "Owner", (e) => e.owner],
  ["ch", "Came from", (e) => `${e.src.channel}${e.src.how ? ` · ${e.src.how}` : ""}`],
  ["page", "Landing page", (e) => e.src.page ?? ""],
  ["camp", "Campaign", (e) => e.src.campaign ?? ""],
];

type Kind =
  | "new"
  | "stage"
  | "owner"
  | "email"
  | "message"
  | "export"
  | "line"
  | "quote"
  | "lost"
  | "won"
  | "contacted";
type Products = ProductOpt[];

/** A dropdown that fills the width of its field, in the panel's own style. */
function Pick({
  value,
  options,
  onChange,
  dots,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  dots?: boolean;
}) {
  return (
    <Dropdown
      value={value}
      onChange={onChange}
      className="w-full text-foreground"
      options={options.map((o) => ({
        value: o,
        label: o,
        ...(dots && { dot: STAGE_COLOR[o] ?? "#767676" }),
      }))}
    />
  );
}

/**
 * Opens the enquiry dialogs. Render `dialog` once on the page.
 * `onCreated(id)` runs after "New enquiry" is saved; `onConvert(id)` opens the new-order page
 * for a won deal's quotation.
 */
export function useEnquiryActions(
  all: EnquiryRow[],
  owners: string[],
  products: Products,
  onCreated?: (id: string) => void,
  onConvert?: (id: string) => void,
) {
  const user = useSessionUser();
  const me = user?.name ?? "You";
  const [open, setOpen] = useState<{ kind: Kind; list: EnquiryRow[]; scope?: string } | null>(null);
  const [err, setErr] = useState("");
  const close = () => setOpen(null);
  const fillT = (t: string, e: EnquiryRow) =>
    t.replace(/\{first name\}/g, first(e.contact)).replace(/\{my name\}/g, first(me));

  /* state for the various dialogs */
  const [to, setTo] = useState("Contacted");
  const [note, setNote] = useState("");
  const [why, setWhy] = useState("");
  const [wonHow, setWonHow] = useState<"convert" | "existing">("convert");
  const [wonOrder, setWonOrder] = useState("");
  const [via2, setVia2] = useState("phone");
  const [moveC, setMoveC] = useState(true);
  const [owner, setOwnerSel] = useState(me);
  const [tpl, setTpl] = useState("Follow-up on your enquiry");
  const [fromAddr, setFromAddr] = useState("Zelliny <info@zelliny.com>");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [via, setVia] = useState<"WhatsApp" | "SMS">("WhatsApp");
  const [waTpl, setWaTpl] = useState("Enquiry follow-up");
  const [waBody, setWaBody] = useState("");
  const [sms, setSms] = useState(Object.values(WA_TPL)[0]!);
  const [cols, setCols] = useState(EXPORT_COLS.map((c) => c[0]));
  const [line, setLine] = useState({ qty: "", unit: "", pers: "0" });
  const [lineProd, setLineProd] = useState<ProductOpt | null>(null);
  const [nProd, setNProd] = useState<ProductOpt | null>(null);
  const [qs, setQs] = useState({ to: "", subject: "", body: "", valid: "14 days" });
  const blankNew = {
    name: "",
    company: "",
    email: "",
    phone: "",
    src: "Phone call",
    cat: CATEGORIES[0]!,
    items: "",
    qty: "",
    budget: "",
    need: "",
    brand: "None",
    msg: "",
    owner: me,
    stage: "New",
    note: "",
  };
  const [nf, setNf] = useState(blankNew);
  const [bad, setBad] = useState<string[]>([]);

  const show = (kind: Kind, list: EnquiryRow[] = [], scope?: string) => {
    setErr("");
    setOpen({ kind, list, ...(scope && { scope }) });
  };
  const markLost = (e: EnquiryRow, reason: string, extra: string) => {
    const full = reason + (extra.trim() ? ` — ${extra.trim()}` : "");
    setStage(e, "Lost", me, full);
    editEnquiry(e.id, { lostReason: full, followUp: "" });
  };
  const actions = {
    newEnquiry: () => {
      setNf({ ...blankNew, owner: me });
      setNProd(null);
      setBad([]);
      show("new");
    },
    changeStage: (list: EnquiryRow[]) => {
      setTo("Contacted");
      setNote("");
      setWhy("");
      show("stage", list);
    },
    /** Stage picked in a row or on the enquiry page — Lost and Won ask a question first. */
    stageTo: (e: EnquiryRow, v: string) => {
      if (v === e.stage.label) return;
      if (v === "Lost") {
        setWhy("");
        setNote("");
        show("lost", [e]);
      } else if (v === "Won") {
        setWonHow("convert");
        setWonOrder("");
        show("won", [e]);
      } else {
        setStage(e, v, me);
        toast(`${e.company} · stage set to ${v}`);
      }
    },
    /** After a call, email, WhatsApp or meeting is logged on a New enquiry. */
    askContacted: (e: EnquiryRow, how: string) => {
      setVia2(how.toLowerCase());
      show("contacted", [e]);
    },
    assign: (list: EnquiryRow[]) => {
      setOwnerSel(me);
      show("owner", list);
    },
    email: (list: EnquiryRow[]) => {
      const t = EMAIL_TPL["Follow-up on your enquiry"]!;
      setTpl("Follow-up on your enquiry");
      setSubject(t[0]);
      setBody(t[1]);
      setMoveC(true);
      show("email", list);
    },
    message: (list: EnquiryRow[]) => {
      setVia("WhatsApp");
      setWaTpl("Enquiry follow-up");
      setWaBody(WA_TPL["Enquiry follow-up"]!);
      setMoveC(true);
      show("message", list);
    },
    exportTo: (list: EnquiryRow[], scope: string) => {
      setCols(EXPORT_COLS.map((c) => c[0]));
      show("export", list, scope);
    },
    addLine: (e: EnquiryRow) => {
      setLineProd(null);
      setLine({ qty: e.qty ? String(e.qty) : "", unit: "", pers: "0" });
      show("line", [e]);
    },
    sendQuote: (e: EnquiryRow) => {
      if (!e.quote.length) {
        toast("Add the products to the quotation first");
        actions.addLine(e);
        return;
      }
      setQs({
        to: e.email,
        subject: `Zelliny quotation ${e.quoteRef ?? ""} · ${e.company}`,
        body: `Dear ${first(e.contact)},\n\nThank you for your enquiry. Please find our quotation attached.\n\nKind regards,\n${me}\nZelliny`,
        valid: "14 days",
      });
      show("quote", [e]);
    },
  };

  const list = open?.list ?? [];
  const one = list.length === 1 ? list[0]! : null;
  const nEnq = (n: number) => plural(n, "enquiry").replace("enquirys", "enquiries");
  const newOnes = list.filter((e) => e.stage.label === "New");
  const n = (v: string) => Number(v.replace(/[^\d]/g, "")) || 0;

  const done = () => {
    if (!open) return;
    const k = open.kind;
    if (k === "stage") {
      if (to === "Lost" && !why) {
        setErr("Choose a reason for Lost.");
        return;
      }
      list.forEach((e) => {
        if (to === "Lost") markLost(e, why, note);
        else setStage(e, to, me, note.trim() || undefined);
      });
      toast(`${nEnq(list.length)} moved to ${to}`);
    }
    if (k === "lost" && one) {
      if (!why) {
        setErr("Choose a reason first.");
        return;
      }
      markLost(one, why, note);
      toast(`Marked as lost · ${why}`);
    }
    if (k === "won" && one) {
      if (wonHow === "existing") {
        const no = wonOrder.trim();
        if (!no) {
          setErr("Enter the order number.");
          return;
        }
        setStage(one, "Won", me, `order ${no}`);
        editEnquiry(
          one.id,
          { order: no, followUp: "" },
          { via: "System", text: `Order confirmed · ${no}` },
        );
        toast(`${one.company} marked as won · ${no}`);
      } else if (one.quote.length) {
        close();
        onConvert?.(one.id);
        return;
      } else {
        close();
        toast("Add the products to the quotation first — they are copied into the order");
        actions.addLine(one);
        return;
      }
    }
    if (k === "contacted" && one) {
      setStage(one, "Contacted", me, `by ${via2}`);
      toast("Moved to Contacted");
    }
    if (k === "owner") {
      list.forEach((e) => setOwner(e, owner, me));
      toast(`Assigned to ${owner}`);
    }
    if (k === "email") {
      if (!subject.trim() || !body.trim()) {
        setErr("Add a subject and a message.");
        return;
      }
      list.forEach((e) => {
        editEnquiry(
          e.id,
          { unread: false },
          { via: "Email", text: `${me} — email “${subject.trim()}”` },
        );
        if (moveC && e.stage.label === "New") setStage(e, "Contacted", me, "by email");
      });
      toast(
        one ? `Email sent to ${one.contact}` : `Email sent to ${plural(list.length, "client")}`,
      );
    }
    if (k === "message") {
      if ((via === "SMS" && !sms.trim()) || (via === "WhatsApp" && !waBody.trim())) {
        setErr(via === "SMS" ? "Write the SMS text." : "Write the message.");
        return;
      }
      list.forEach((e) => {
        editEnquiry(
          e.id,
          { unread: false },
          {
            via,
            text: `${me} — ${via} “${(via === "WhatsApp" ? fillT(waBody, e) : sms).slice(0, 60)}”`,
          },
        );
        if (moveC && e.stage.label === "New") setStage(e, "Contacted", me, `by ${via}`);
      });
      toast(
        one ? `${via} sent to ${one.contact}` : `${via} sent to ${plural(list.length, "client")}`,
      );
    }
    if (k === "export") {
      const use = EXPORT_COLS.filter((c) => cols.includes(c[0]));
      if (!use.length) {
        toast("Choose at least one column");
        return;
      }
      downloadCsv(
        `zelliny-corporate-enquiries-${list.length}.csv`,
        use.map((c) => c[1]),
        list.map((e) => use.map((c) => c[2](e))),
      );
      toast(`Excel downloaded · ${plural(list.length, "row")}`);
    }
    if (k === "line" && one) {
      const qty = n(line.qty),
        unit = n(line.unit);
      if (!lineProd) {
        setErr("Pick a product first.");
        return;
      }
      if (!qty || !unit) {
        setErr("Add the quantity and the unit price.");
        return;
      }
      const quote = [
        ...one.quote,
        {
          productId: lineProd.id,
          name: lineProd.name,
          sku: lineProd.sku,
          qty,
          unit,
          pers: n(line.pers),
        },
      ];
      editEnquiry(one.id, {
        quote,
        quoteRef: one.quoteRef ?? `Q-2026-0${420 + all.filter((x) => x.quoteRef).length}`,
      });
      toast(`Line added · total ${formatMoney(quoteTotal(quote))}`);
    }
    if (k === "quote" && one) {
      if (!/^\S+@\S+\.\S+$/.test(qs.to)) {
        setErr("Check the email address.");
        return;
      }
      editEnquiry(
        one.id,
        { quoteSent: "Today", unread: false },
        {
          via: "Email",
          text: `${me} — quotation ${one.quoteRef} sent to ${qs.to} · ${formatMoney(quoteTotal(one.quote))}`,
        },
      );
      if (["New", "Contacted"].includes(one.stage.label)) setStage(one, "Quoted", me);
      toast(`Quotation ${one.quoteRef} sent to ${one.contact}`);
    }
    if (k === "new") {
      const req: [keyof typeof nf, boolean][] = [
        ["name", !nf.name.trim()],
        ["email", !/^\S+@\S+\.\S+$/.test(nf.email.trim())],
        ["phone", nf.phone.replace(/\D/g, "").length < 10],
        ["qty", !(Number(nf.qty.replace(/\D/g, "")) > 0)],
      ];
      const b = req.filter((x) => x[1]).map((x) => x[0]);
      setBad(b);
      if (b.length) {
        setErr("Please fill in the fields marked in red");
        return;
      }
      const id = `ENQ-${Math.max(0, ...all.map((e) => Number(e.id.split("-")[1]) || 0)) + 1}`;
      const chMap: Record<string, string> = {
        "Instagram message": "Instagram",
        "Walk-in / event": "Event / walk-in",
      };
      const viaMap: Record<string, string> = {
        "Phone call": "Phone",
        WhatsApp: "WhatsApp",
        Email: "Email",
      };
      const product: EnquiryProduct | null = nProd
        ? {
            id: nProd.id,
            name: nProd.name,
            brand: nProd.brand,
            category: nProd.category,
            sku: nProd.sku,
            price: nProd.price,
            color: nProd.color,
          }
        : null;
      created = [
        {
          id,
          company: nf.company.trim() || nf.name.trim(),
          contact: nf.name.trim(),
          email: nf.email.trim(),
          phone: nf.phone.trim(),
          items: nf.items.trim() || product?.name || nf.cat,
          qty: Number(nf.qty.replace(/\D/g, "")),
          branding: nf.brand,
          stage: { label: nf.stage, tone: TONE[nf.stage as keyof typeof TONE] },
          owner: nf.owner,
          date: "Today",
          time: "just now",
          interest: nf.cat,
          budget: nf.budget.trim(),
          needBy: nf.need.trim(),
          message: nf.msg.trim(),
          src: {
            channel: chMap[nf.src] ?? nf.src,
            how: "Added by hand",
            manual: true,
            ...(product && { page: `Product page · ${product.name}` }),
          },
          followUp: "",
          quote: [],
          quoteRef: null,
          quoteSent: null,
          order: null,
          product,
          lostReason: null,
          unread: false,
          log: [
            {
              via: "System",
              text: `Enquiry added by hand by ${me} · came in by ${nf.src.toLowerCase()}`,
              when: now(),
            },
            ...(nf.stage === "Contacted"
              ? [
                  {
                    via: viaMap[nf.src] ?? "Phone",
                    text: `${me} — spoke to ${first(nf.name)}`,
                    when: now(),
                  },
                ]
              : []),
            ...(nf.note.trim()
              ? [{ via: "Note", text: `${nf.note.trim()} — ${me}`, when: now() }]
              : []),
          ],
        },
        ...created,
      ];
      emit();
      close();
      toast(`${id} saved · ${nf.company.trim() || nf.name.trim()}`);
      onCreated?.(id);
      return;
    }
    close();
  };

  const okLabel: Record<Kind, string> = {
    new: "Save enquiry",
    stage: "Change stage",
    owner: "Assign",
    email: one ? "Send email" : `Send to ${list.length}`,
    message: one ? `Send ${via}` : `Send ${via} to ${list.length}`,
    export: "Download Excel",
    line: "Add to quotation",
    quote: "Send quotation",
    lost: "Mark as lost",
    won:
      wonHow === "existing"
        ? "Mark as won"
        : one?.quote.length
          ? "Continue to convert"
          : "Add the products",
    contacted: "Move to Contacted",
  };
  const pickLine = (p: ProductOpt) => {
    setLineProd(p);
    setLine((l) => ({ ...l, unit: l.unit || (p.price ? formatNumber(p.price) : "") }));
  };
  const lq = n(line.qty),
    lu = n(line.unit),
    lpers = n(line.pers);
  const manageTemplates = (
    <Link
      to="/settings"
      search={{ tab: "templates" }}
      className="text-[12px] text-muted-foreground underline"
    >
      Manage templates
    </Link>
  );
  const moveBox = newOnes.length > 0 && (
    <label className="flex items-start gap-2.5 text-[13px]">
      <input
        type="checkbox"
        checked={moveC}
        onChange={(e) => setMoveC(e.target.checked)}
        className="mt-0.5 accent-[#0a0a0a]"
      />
      <span>
        Move {newOnes.length > 1 ? `${newOnes.length} new enquiries` : "this enquiry"} to Contacted
        <small className="block text-[12px] text-muted-foreground">
          {newOnes.length > 1
            ? "They are still New — not contacted yet."
            : "It is still New — not contacted yet."}
        </small>
      </span>
    </label>
  );
  const reasonPills = (
    <Field label="Reason" req>
      <Pills value={why} options={LOST_REASONS} onChange={setWhy} />
    </Field>
  );

  const dialog = (
    <Dialog open={!!open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-h-[88vh] max-w-[760px] overflow-y-auto">
        {open?.kind === "new" && (
          <>
            <Title sub="For a client who phoned, messaged or met you — it joins the list like any website enquiry.">
              New enquiry
            </Title>
            <Section>Client</Section>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Client name" req bad={bad.includes("name")}>
                <input
                  autoFocus
                  value={nf.name}
                  onChange={(e) => setNf({ ...nf, name: e.target.value })}
                  placeholder="e.g. Aya Hamdy"
                  className={input}
                />
              </Field>
              <Field label="Company">
                <input
                  value={nf.company}
                  onChange={(e) => setNf({ ...nf, company: e.target.value })}
                  placeholder="e.g. Nile Ventures"
                  className={input}
                />
              </Field>
              <Field label="Email" req bad={bad.includes("email")}>
                <input
                  value={nf.email}
                  onChange={(e) => setNf({ ...nf, email: e.target.value })}
                  placeholder="name@company.com"
                  className={input}
                />
              </Field>
              <Field label="Phone" req bad={bad.includes("phone")}>
                <input
                  value={nf.phone}
                  onChange={(e) => setNf({ ...nf, phone: e.target.value })}
                  placeholder="+20 1xx xxx xxxx"
                  className={input}
                />
              </Field>
            </div>
            <Field label="How did it come in?">
              <Pills value={nf.src} options={CAME_IN} onChange={(v) => setNf({ ...nf, src: v })} />
            </Field>
            <Section>Request</Section>
            <Field
              label="Product (optional)"
              hint="If they called about a specific item, pick it — the enquiry then shows the product card, like a website enquiry."
            >
              <ProductSearch
                products={products}
                value={nProd}
                onClear={() => setNProd(null)}
                onPick={(p) => {
                  setNProd(p);
                  setNf((f) => ({
                    ...f,
                    items: f.items || p.name,
                    cat: CATEGORIES.includes(p.category) ? p.category : f.cat,
                  }));
                }}
              />
            </Field>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Category of interest">
                <Pick
                  value={nf.cat}
                  options={CATEGORIES}
                  onChange={(v) => setNf({ ...nf, cat: v })}
                />
              </Field>
              <Field label="Products / maisons">
                <input
                  value={nf.items}
                  onChange={(e) => setNf({ ...nf, items: e.target.value })}
                  placeholder="e.g. Hugo Boss pens"
                  className={input}
                />
              </Field>
            </div>
            <div className="grid gap-3.5 md:grid-cols-3">
              <Field label="Quantity" req bad={bad.includes("qty")}>
                <input
                  value={nf.qty}
                  onChange={(e) => setNf({ ...nf, qty: e.target.value })}
                  placeholder="e.g. 60"
                  className={input}
                />
              </Field>
              <Field label="Budget (optional)">
                <input
                  value={nf.budget}
                  onChange={(e) => setNf({ ...nf, budget: e.target.value })}
                  placeholder="per piece or total"
                  className={input}
                />
              </Field>
              <Field label="Needed by">
                <input
                  value={nf.need}
                  onChange={(e) => setNf({ ...nf, need: e.target.value })}
                  placeholder="e.g. 30 Oct 2026"
                  className={input}
                />
              </Field>
            </div>
            <Field label="Personalisation">
              <Pills
                value={nf.brand}
                options={PERSONAL}
                onChange={(v) => setNf({ ...nf, brand: v })}
              />
            </Field>
            <Field label="Client's message / details">
              <textarea
                rows={3}
                value={nf.msg}
                onChange={(e) => setNf({ ...nf, msg: e.target.value })}
                placeholder="What exactly did they ask for?"
                className={cn(input, "h-auto py-2")}
              />
            </Field>
            <Section>Handling</Section>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Owner" hint="From Team & permissions">
                <Pick
                  value={nf.owner}
                  options={["Unassigned", ...owners]}
                  onChange={(v) => setNf({ ...nf, owner: v })}
                />
              </Field>
              <Field label="Stage" hint='Choose "Contacted" if you already spoke to them'>
                <Pick
                  value={nf.stage}
                  options={["New", "Contacted"]}
                  dots
                  onChange={(v) => setNf({ ...nf, stage: v })}
                />
              </Field>
            </div>
            <Field label="Internal note (team only)">
              <textarea
                rows={2}
                value={nf.note}
                onChange={(e) => setNf({ ...nf, note: e.target.value })}
                className={cn(input, "h-auto py-2")}
              />
            </Field>
          </>
        )}

        {open?.kind === "stage" && (
          <>
            <Title>Change stage · {nEnq(list.length)}</Title>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
              {list.map((e) => (
                <div key={e.id} className="contents">
                  <dt className="font-medium">{e.company}</dt>
                  <dd className="text-right text-muted-foreground">{e.stage.label}</dd>
                </div>
              ))}
            </dl>
            <Field label="Move all of them to" hint={STAGE_HINT[to]}>
              <Dropdown
                value={to}
                onChange={(v) => {
                  setTo(v);
                  setWhy("");
                }}
                className="w-full text-foreground"
                options={STAGES.map((st) => ({
                  value: st,
                  label: st,
                  dot: STAGE_COLOR[st] ?? "#767676",
                  disabled: st === "Won",
                  ...(st === "Won" && { hint: "one at a time" }),
                }))}
              />
            </Field>
            {to === "Lost" && reasonPills}
            <Field label="Note for the record (optional)">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Called all five after the trade fair"
                className={input}
              />
            </Field>
            <p className="text-[12px] text-muted-foreground">
              Each enquiry records the change under <b className="text-foreground">{me}</b>. Won is
              set one enquiry at a time, because each won deal needs its own order.
            </p>
          </>
        )}

        {open?.kind === "lost" && one && (
          <>
            <Title sub="The reason is kept in History and in Reports.">
              Mark as lost · {one.company}
            </Title>
            {reasonPills}
            <Field label="Note (optional)">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. They went with a local supplier at 1,100 EGP"
                className={input}
              />
            </Field>
          </>
        )}

        {open?.kind === "won" && one && (
          <>
            <Title sub="A won deal needs its order. Choose how this one was confirmed.">
              Mark as won · {one.company}
            </Title>
            {(
              [
                [
                  "convert",
                  "Convert the quotation to an order",
                  one.quote.length
                    ? `${one.quoteRef ?? "Quotation"} · ${plural(one.quote.length, "line")} · ${formatMoney(quoteTotal(one.quote))} — the products are copied into the order.`
                    : "There is no quotation yet — add the products first.",
                ],
                [
                  "existing",
                  "The order already exists",
                  "The order was entered in Orders by hand. Type its number here.",
                ],
              ] as const
            ).map(([v, t, h]) => (
              <label
                key={v}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-[13.5px]",
                  wonHow === v ? "border-primary" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="won-how"
                  checked={wonHow === v}
                  onChange={() => setWonHow(v)}
                  className="mt-1 accent-[#0a0a0a]"
                />
                <span>
                  <b className="font-medium">{t}</b>
                  <small className="mt-0.5 block text-[12.5px] text-muted-foreground">{h}</small>
                </span>
              </label>
            ))}
            {wonHow === "existing" && (
              <Field label="Order number" req>
                <input
                  autoFocus
                  value={wonOrder}
                  onChange={(e) => setWonOrder(e.target.value)}
                  placeholder="e.g. ZL-C-0032"
                  className={input}
                />
              </Field>
            )}
          </>
        )}

        {open?.kind === "contacted" && one && (
          <>
            <Title>Move to Contacted?</Title>
            <p className="text-[13.5px] text-muted-foreground">
              You logged a {via2} with {one.contact}. This enquiry is still New — not contacted yet.
            </p>
          </>
        )}

        {open?.kind === "owner" && (
          <>
            <Title>Assign {nEnq(list.length)}</Title>
            <Field
              label="Owner"
              hint="The list comes from Team & permissions — invite someone there and they appear here."
            >
              <Pick value={owner} options={["Unassigned", ...owners]} onChange={setOwnerSel} />
            </Field>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" defaultChecked className="accent-[#0a0a0a]" /> Email them the
              list of enquiries
            </label>
          </>
        )}

        {open?.kind === "email" && (
          <>
            <Title>{one ? `Email ${one.contact}` : `Email ${list.length} clients`}</Title>
            <p className="rounded-lg border border-border px-3.5 py-2.5 text-[13px]">
              {one ? (
                <>
                  To <b className="font-medium">{one.email}</b> · saved in this enquiry's history.
                </>
              ) : (
                <>
                  <b className="text-[15px] font-medium">{list.length}</b> clients · one separate
                  email each, from you. Saved in each enquiry's history.
                </>
              )}
            </p>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="From">
                <Pick
                  value={fromAddr}
                  options={["Zelliny <info@zelliny.com>", me]}
                  onChange={setFromAddr}
                />
              </Field>
              <Field
                label={<span className="flex justify-between">Start from {manageTemplates}</span>}
              >
                <Pick
                  value={tpl}
                  options={Object.keys(EMAIL_TPL)}
                  onChange={(v) => {
                    const t = EMAIL_TPL[v]!;
                    setTpl(v);
                    setSubject(t[0]);
                    setBody(t[1]);
                  }}
                />
              </Field>
            </div>
            <Field label="Subject">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={input}
              />
            </Field>
            <Field
              label="Message"
              hint={
                <>
                  You can change the wording before sending — it changes this message only.{" "}
                  <b>{"{first name}"}</b> becomes each client's first name, <b>{"{my name}"}</b>{" "}
                  yours.
                </>
              }
            >
              <textarea
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className={cn(input, "h-auto py-2")}
              />
            </Field>
            {moveBox}
          </>
        )}

        {open?.kind === "message" && (
          <>
            <Title>{one ? `Message ${one.contact}` : `Message ${list.length} clients`}</Title>
            <Pills
              value={via}
              options={["WhatsApp", "SMS"]}
              onChange={(v) => setVia(v as "WhatsApp" | "SMS")}
            />
            {via === "WhatsApp" ? (
              <>
                <Field
                  label={
                    <span className="flex justify-between">Message template {manageTemplates}</span>
                  }
                  hint="WhatsApp only allows messages from templates approved by Meta."
                >
                  <Pick
                    value={waTpl}
                    options={Object.keys(WA_TPL)}
                    onChange={(v) => {
                      setWaTpl(v);
                      setWaBody(WA_TPL[v]!);
                    }}
                  />
                </Field>
                <Field
                  label="Message"
                  hint="You can change the wording before sending — it changes this message only."
                >
                  <textarea
                    rows={3}
                    value={waBody}
                    onChange={(e) => setWaBody(e.target.value)}
                    className={cn(input, "h-auto py-2")}
                  />
                </Field>
                <div className="rounded-lg bg-[#efe7dd] p-3.5">
                  <small className="mb-1.5 block text-[10.5px] uppercase tracking-[.1em] text-muted-foreground">
                    Preview{list[0] ? ` · ${list[0].contact}` : ""}
                  </small>
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-white px-3 py-2.5 text-[13px] shadow-sm">
                    {list[0] ? fillT(waBody, list[0]) : ""}
                  </div>
                </div>
                {one && (
                  <p className="text-[12px] text-muted-foreground">
                    For a personal one-to-one chat instead,{" "}
                    <a
                      href={`https://wa.me/${one.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      open WhatsApp with {first(one.contact)}
                    </a>
                    .
                  </p>
                )}
              </>
            ) : (
              <Field
                label="SMS text"
                hint={`Sent from the sender name ZELLINY · ${sms.length}/160`}
              >
                <textarea
                  rows={3}
                  value={sms}
                  onChange={(e) => setSms(e.target.value.slice(0, 160))}
                  className={cn(input, "h-auto py-2")}
                />
              </Field>
            )}
            {moveBox}
          </>
        )}

        {open?.kind === "export" && (
          <>
            <Title sub={open.scope}>Export {nEnq(list.length)} to Excel</Title>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {EXPORT_COLS.map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    className="accent-[#0a0a0a]"
                    checked={cols.includes(k)}
                    onChange={() =>
                      setCols((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))
                    }
                  />{" "}
                  {l}
                </label>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground">
              Downloads a spreadsheet that opens in Excel.
            </p>
          </>
        )}

        {open?.kind === "line" && one && (
          <>
            <Title>Add a line · {one.company}</Title>
            <Field label="Product" req>
              <ProductSearch
                products={products}
                value={lineProd}
                onClear={() => setLineProd(null)}
                onPick={pickLine}
              />
            </Field>
            <div className="grid gap-3.5 md:grid-cols-3">
              <Field label="Quantity" req>
                <input
                  value={line.qty}
                  onChange={(e) => setLine({ ...line, qty: e.target.value })}
                  className={input}
                />
              </Field>
              <Field label="Unit price (EGP)" req>
                <input
                  value={line.unit}
                  onChange={(e) => setLine({ ...line, unit: e.target.value })}
                  placeholder="Price per piece"
                  className={input}
                />
              </Field>
              <Field label="Personalisation per piece">
                <input
                  value={line.pers}
                  onChange={(e) => setLine({ ...line, pers: e.target.value })}
                  className={input}
                />
              </Field>
            </div>
            <p className="text-[12px] text-muted-foreground">
              {lineProd
                ? lineProd.price
                  ? `Website price ${formatMoney(lineProd.price)} — change it for a corporate price.`
                  : "Enquiry item — no website price. Type the corporate price."
                : "Pick a product to see its website price."}
            </p>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-[13px]">
              <span className="text-muted-foreground">
                {lq && lu
                  ? `Line total · ${formatNumber(lq)} × (${formatNumber(lu)} + ${formatNumber(lpers)} personalisation)`
                  : "Line total"}
              </span>
              <b className="text-[16px] font-semibold">
                {lq && lu ? formatMoney(lq * (lu + lpers)) : "—"}
              </b>
            </div>
          </>
        )}

        {open?.kind === "quote" && one && (
          <>
            <Title>Send quotation {one.quoteRef}</Title>
            <Field label="To">
              <input
                value={qs.to}
                onChange={(e) => setQs({ ...qs, to: e.target.value })}
                className={input}
              />
            </Field>
            <Field label="Subject">
              <input
                value={qs.subject}
                onChange={(e) => setQs({ ...qs, subject: e.target.value })}
                className={input}
              />
            </Field>
            <Field label="Message">
              <textarea
                rows={5}
                value={qs.body}
                onChange={(e) => setQs({ ...qs, body: e.target.value })}
                className={cn(input, "h-auto py-2")}
              />
            </Field>
            <div className="grid gap-3.5 md:grid-cols-2">
              <div className="text-[13px]">
                <span className="block text-[12px] text-muted-foreground">Attached</span>📎{" "}
                <b className="font-medium">{one.quoteRef}.pdf</b> ·{" "}
                {formatMoney(quoteTotal(one.quote))}
              </div>
              <Field label="Valid for">
                <Pick
                  value={qs.valid}
                  options={["7 days", "14 days", "30 days"]}
                  onChange={(v) => setQs({ ...qs, valid: v })}
                />
              </Field>
            </div>
            <p className="text-[12px] text-muted-foreground">
              The stage moves to <b>Quoted</b> and the email is saved in the history.
            </p>
          </>
        )}

        {open && (
          <DialogFooter className="items-center">
            {err && <span className="mr-auto text-[12.5px] text-bad">{err}</span>}
            <Button onClick={close}>{open.kind === "contacted" ? "Keep as New" : "Cancel"}</Button>
            <Primary onClick={done}>{okLabel[open.kind]}</Primary>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
  return { ...actions, dialog, me };
}
