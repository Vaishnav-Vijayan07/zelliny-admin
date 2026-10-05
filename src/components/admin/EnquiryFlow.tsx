// Corporate enquiries: local changes, stage colours, and every dialog (new enquiry,
// change stage / assign together, email, WhatsApp / SMS, export, quotation).
// Shared by the enquiries list and the single-enquiry page. Local for now — swap for API calls.
import { useMemo, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { toast } from "sonner";
import type { EnquiryRow, QuoteLine } from "@/lib/api/section-types";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/hooks/use-session";
import { Button } from "./page";
import { downloadCsv } from "./CustomerFlow";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const STAGES = ["New", "Contacted", "Quoted", "Negotiation", "Won", "Lost"];
export const STAGE_COLOR: Record<string, string> = { New: "#0A0A0A", Contacted: "#2B5A8C", Quoted: "#5B4F96", Negotiation: "#9A6200", Won: "#1F7A4D", Lost: "#B3261E" };
export const STAGE_HINT: Record<string, string> = {
  New: "Not contacted yet", Contacted: "We have called, emailed or messaged them", Quoted: "Quotation sent",
  Negotiation: "Still going on", Won: "Order confirmed", Lost: "Closed without order",
};
const TONE = { New: "warn", Contacted: "info", Quoted: "info", Negotiation: "warn", Won: "ok", Lost: "bad" } as const;
const CATEGORIES = ["Writing Instruments", "Leather Goods", "Smoking Accessories", "Watches", "Jewellery", "Bags", "Fragrance", "Beauty", "Mixed / not sure yet"];
const CAME_IN = ["Phone call", "WhatsApp", "Email", "Walk-in / event", "Referral", "Instagram message", "LinkedIn"];
const PERSONAL = ["None", "Logo engraving", "Initials engraving", "Embossing", "Logo printing", "Gift box only"];
const now = () => "Today, just now";
const first = (n: string) => n.split(" ")[0] ?? n;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
export const quoteTotal = (q: QuoteLine[]) => q.reduce((a, l) => a + (l.unit + l.pers) * l.qty, 0);

/* ---------- local store ---------- */
type Edit = Partial<Pick<EnquiryRow, "owner" | "followUp" | "quote" | "quoteRef" | "quoteSent" | "order" | "unread">> & { stage?: string; log?: EnquiryRow["log"] };
let created: EnquiryRow[] = [];
let edits: Record<string, Edit> = {};
const listeners = new Set<() => void>();
const sub = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const emit = () => listeners.forEach((l) => l());
const NO_ROWS: EnquiryRow[] = [];
const NO_EDITS: Record<string, Edit> = {};

export function useEnquiries(rows: EnquiryRow[]): EnquiryRow[] {
  const c = useSyncExternalStore(sub, () => created, () => NO_ROWS);
  const e = useSyncExternalStore(sub, () => edits, () => NO_EDITS);
  return useMemo(() => [...c, ...rows].map((r) => {
    const x = e[r.id];
    if (!x) return r;
    const { stage, log, ...rest } = x;
    return { ...r, ...rest, ...(stage && { stage: { label: stage, tone: TONE[stage as keyof typeof TONE] ?? "mute" } }), log: [...r.log, ...(log ?? [])] };
  }), [c, rows, e]);
}
/** Change fields and (optionally) add one history line. */
export function editEnquiry(id: string, e: Omit<Edit, "log">, line?: { via: string; text: string }) {
  const cur = edits[id] ?? {};
  edits = { ...edits, [id]: { ...cur, ...e, ...(line && { log: [...(cur.log ?? []), { ...line, when: now() }] }) } };
  emit();
}
export function setStage(r: EnquiryRow, to: string, who: string, note?: string) {
  if (r.stage.label === to) return;
  editEnquiry(r.id, { stage: to, unread: false }, { via: "System", text: `Stage changed from ${r.stage.label} to ${to} · by ${who}${note ? ` · ${note}` : ""}` });
}
export function setOwner(r: EnquiryRow, to: string, who: string) {
  if (r.owner === to) return;
  editEnquiry(r.id, { owner: to }, { via: "System", text: `Owner changed from ${r.owner} to ${to} · by ${who}` });
}

/* ---------- stage dropdown in the stage's colour ---------- */
export function StageSelect({ r, big, who }: { r: EnquiryRow; big?: boolean; who: string }) {
  const c = STAGE_COLOR[r.stage.label] ?? "#767676";
  return (
    <select
      value={r.stage.label} title="Change stage" onClick={(e) => e.stopPropagation()}
      onChange={(e) => { setStage(r, e.target.value, who); toast(`${r.company} · stage set to ${e.target.value}`); }}
      style={{ "--s": c, color: c, background: `color-mix(in srgb, ${c} 9%, #fff)`, borderColor: `color-mix(in srgb, ${c} 28%, #fff)` } as CSSProperties}
      className={cn("cursor-pointer rounded-full border font-medium outline-none hover:border-[var(--s)]", big ? "h-11 w-full px-4 text-[14px]" : "h-9 px-3 text-[13px]")}
    >
      {STAGES.map((s) => <option key={s}>{s}</option>)}
    </select>
  );
}

/* ---------- pieces ---------- */
const input = "h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary";
const Title = ({ children, sub: s }: { children: ReactNode; sub?: ReactNode }) => (
  <DialogHeader><DialogTitle className="font-head text-[18px] font-normal">{children}</DialogTitle>{s && <p className="text-[12.5px] text-muted-foreground">{s}</p>}</DialogHeader>
);
function Field({ label, req, children, hint, bad }: { label: string; req?: boolean; children: ReactNode; hint?: ReactNode; bad?: boolean }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5 text-[12px] text-muted-foreground", bad && "[&_input]:border-bad")}>
      <span>{label}{req && <em className="not-italic text-bad"> *</em>}</span>{children}{hint && <span className="text-[11.5px]">{hint}</span>}
    </label>
  );
}
const Primary = ({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: ReactNode }) => (
  <button type="button" disabled={disabled} onClick={onClick} className="rounded-lg border border-primary bg-primary px-4 py-2 text-[13px] text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35">{children}</button>
);
const Pills = ({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((o) => <button key={o} type="button" onClick={() => onChange(o)} className={cn("h-[34px] rounded-full border px-3.5 text-[12.5px]", value === o ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface")}>{o}</button>)}
  </div>
);
const Section = ({ children }: { children: ReactNode }) => <div className="mt-1 border-b border-line-soft pb-2 text-[10.5px] uppercase tracking-[.16em] text-muted-foreground">{children}</div>;

const EMAIL_TPL: Record<string, [string, string]> = {
  "Write my own": ["", ""],
  "Follow-up on your enquiry": ["Your gifting enquiry with Zelliny", "Dear {first name},\n\nThank you for your enquiry. We would be glad to prepare options for you. When would be a good time for a short call?\n\nKind regards,\n{my name}\nZelliny"],
  "Catalogue & engraving options": ["Zelliny corporate catalogue and engraving options", "Dear {first name},\n\nPlease find our corporate catalogue attached, with the engraving and gift box options.\n\nKind regards,\n{my name}\nZelliny"],
  "Year-end gifting reminder": ["Year-end gifts — order dates", "Dear {first name},\n\nA short note that orders for year-end gifts should be confirmed by early November to allow time for engraving.\n\nKind regards,\n{my name}\nZelliny"],
};
const WA_TPL: Record<string, string> = {
  "Enquiry follow-up": "Hello {first name}, this is {my name} from Zelliny about your gifting enquiry. Is now a good time to talk?",
  "Quotation reminder": "Hello {first name}, just checking you received our quotation. Happy to adjust quantities or options.",
  "Year-end reminder": "Hello {first name}, a reminder that year-end gift orders should be confirmed by early November for engraving.",
};
const EXPORT_COLS: [string, string, (e: EnquiryRow) => string | number][] = [
  ["id", "Enquiry", (e) => e.id], ["date", "Received", (e) => e.date], ["contact", "Client", (e) => e.contact], ["company", "Company", (e) => e.company],
  ["email", "Email", (e) => e.email], ["phone", "Mobile", (e) => e.phone], ["items", "Request", (e) => e.items], ["qty", "Quantity", (e) => e.qty],
  ["stage", "Stage", (e) => e.stage.label], ["owner", "Owner", (e) => e.owner], ["ch", "Came from", (e) => `${e.src.channel}${e.src.how ? ` · ${e.src.how}` : ""}`],
  ["page", "Landing page", (e) => e.src.page ?? ""], ["camp", "Campaign", (e) => e.src.campaign ?? ""],
];

type Kind = "new" | "stage" | "owner" | "email" | "message" | "export" | "line" | "quote";
type Products = { id: string; name: string; sku: string; brand: string; price: number | null }[];

/**
 * Opens the enquiry dialogs. Render `dialog` once on the page.
 * `onCreated(id)` runs after "New enquiry" is saved.
 */
export function useEnquiryActions(all: EnquiryRow[], owners: string[], products: Products, onCreated?: (id: string) => void) {
  const user = useSessionUser();
  const me = user?.name ?? "You";
  const [open, setOpen] = useState<{ kind: Kind; list: EnquiryRow[]; scope?: string } | null>(null);
  const [err, setErr] = useState("");
  const close = () => setOpen(null);
  const fillT = (t: string, e: EnquiryRow) => t.replace(/\{first name\}/g, first(e.contact)).replace(/\{my name\}/g, first(me));

  /* state for the various dialogs */
  const [to, setTo] = useState("Contacted");
  const [note, setNote] = useState("");
  const [owner, setOwnerSel] = useState(me);
  const [tpl, setTpl] = useState("Follow-up on your enquiry");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [via, setVia] = useState<"WhatsApp" | "SMS">("WhatsApp");
  const [waTpl, setWaTpl] = useState(Object.keys(WA_TPL)[0]!);
  const [sms, setSms] = useState(Object.values(WA_TPL)[0]!);
  const [cols, setCols] = useState(EXPORT_COLS.map((c) => c[0]));
  const [line, setLine] = useState({ productId: products[0]?.id ?? "", qty: "", unit: "", pers: "0" });
  const [qs, setQs] = useState({ to: "", subject: "", body: "", valid: "14 days" });
  const blankNew = { name: "", company: "", email: "", phone: "", src: "Phone call", cat: CATEGORIES[0]!, items: "", qty: "", budget: "", need: "", brand: "None", msg: "", owner: me, stage: "New", note: "" };
  const [nf, setNf] = useState(blankNew);
  const [bad, setBad] = useState<string[]>([]);

  const show = (kind: Kind, list: EnquiryRow[] = [], scope?: string) => { setErr(""); setOpen({ kind, list, ...(scope && { scope }) }); };
  const actions = {
    newEnquiry: () => { setNf({ ...blankNew, owner: me }); setBad([]); show("new"); },
    changeStage: (list: EnquiryRow[]) => { setTo("Contacted"); setNote(""); show("stage", list); },
    assign: (list: EnquiryRow[]) => { setOwnerSel(me); show("owner", list); },
    email: (list: EnquiryRow[]) => { const t = EMAIL_TPL["Follow-up on your enquiry"]!; setTpl("Follow-up on your enquiry"); setSubject(t[0]); setBody(t[1]); show("email", list); },
    message: (list: EnquiryRow[]) => { setVia("WhatsApp"); show("message", list); },
    exportTo: (list: EnquiryRow[], scope: string) => { setCols(EXPORT_COLS.map((c) => c[0])); show("export", list, scope); },
    addLine: (e: EnquiryRow) => { const p = products[0]; setLine({ productId: p?.id ?? "", qty: e.qty ? String(e.qty) : "", unit: p?.price ? formatNumber(p.price) : "", pers: "0" }); show("line", [e]); },
    sendQuote: (e: EnquiryRow) => {
      if (!e.quote.length) { toast("Add the products to the quotation first"); actions.addLine(e); return; }
      setQs({ to: e.email, subject: `Zelliny quotation ${e.quoteRef ?? ""} · ${e.company}`, body: `Dear ${first(e.contact)},\n\nThank you for your enquiry. Please find our quotation attached.\n\nKind regards,\n${me}\nZelliny`, valid: "14 days" });
      show("quote", [e]);
    },
  };

  const list = open?.list ?? [];
  const one = list.length === 1 ? list[0]! : null;
  const nEnq = (n: number) => plural(n, "enquiry").replace("enquirys", "enquiries");

  const done = () => {
    if (!open) return;
    const k = open.kind;
    if (k === "stage") { list.forEach((e) => setStage(e, to, me, note.trim() || undefined)); toast(`${nEnq(list.length)} moved to ${to}`); }
    if (k === "owner") { list.forEach((e) => setOwner(e, owner, me)); toast(`Assigned to ${owner}`); }
    if (k === "email") {
      if (!subject.trim() || !body.trim()) { setErr("Add a subject and a message."); return; }
      list.forEach((e) => { editEnquiry(e.id, { unread: false }, { via: "Email", text: `${me} — email “${subject.trim()}”` }); if (e.stage.label === "New") setStage(e, "Contacted", me); });
      toast(`Email sent to ${plural(list.length, "client")}`);
    }
    if (k === "message") {
      if (via === "SMS" && !sms.trim()) { setErr("Write the SMS text."); return; }
      list.forEach((e) => { editEnquiry(e.id, { unread: false }, { via, text: `${me} — ${via} ${via === "WhatsApp" ? `template “${waTpl}”` : `“${sms.slice(0, 60)}”`}` }); if (e.stage.label === "New") setStage(e, "Contacted", me); });
      toast(`${via} sent to ${plural(list.length, "client")}`);
    }
    if (k === "export") {
      const use = EXPORT_COLS.filter((c) => cols.includes(c[0]));
      if (!use.length) { toast("Choose at least one column"); return; }
      downloadCsv(`zelliny-corporate-enquiries-${list.length}.csv`, use.map((c) => c[1]), list.map((e) => use.map((c) => c[2](e))));
      toast(`Excel downloaded · ${plural(list.length, "row")}`);
    }
    if (k === "line" && one) {
      const n = (v: string) => Number(v.replace(/[^\d]/g, "")) || 0;
      const qty = n(line.qty), unit = n(line.unit);
      if (!qty || !unit) { setErr("Add the quantity and the unit price."); return; }
      const p = products.find((x) => x.id === line.productId)!;
      const quote = [...one.quote, { productId: p.id, name: p.name, sku: p.sku, qty, unit, pers: n(line.pers) }];
      editEnquiry(one.id, { quote, quoteRef: one.quoteRef ?? `Q-2026-0${420 + all.filter((x) => x.quoteRef).length}` });
      toast(`Line added · total ${formatMoney(quoteTotal(quote))}`);
    }
    if (k === "quote" && one) {
      if (!/^\S+@\S+\.\S+$/.test(qs.to)) { setErr("Check the email address."); return; }
      editEnquiry(one.id, { quoteSent: "Today", unread: false }, { via: "Email", text: `${me} — quotation ${one.quoteRef} sent to ${qs.to} · ${formatMoney(quoteTotal(one.quote))}` });
      if (["New", "Contacted"].includes(one.stage.label)) setStage(one, "Quoted", me);
      toast(`Quotation ${one.quoteRef} sent to ${one.contact}`);
    }
    if (k === "new") {
      const req: [keyof typeof nf, boolean][] = [["name", !nf.name.trim()], ["email", !/^\S+@\S+\.\S+$/.test(nf.email.trim())], ["phone", nf.phone.replace(/\D/g, "").length < 10], ["qty", !(Number(nf.qty.replace(/\D/g, "")) > 0)]];
      const b = req.filter((x) => x[1]).map((x) => x[0]);
      setBad(b);
      if (b.length) { setErr("Please fill in the fields marked in red"); return; }
      const id = `ENQ-${Math.max(0, ...all.map((e) => Number(e.id.split("-")[1]) || 0)) + 1}`;
      const chMap: Record<string, string> = { "Instagram message": "Instagram", "Walk-in / event": "Event / walk-in" };
      const viaMap: Record<string, string> = { "Phone call": "Phone", WhatsApp: "WhatsApp", Email: "Email" };
      created = [{
        id, company: nf.company.trim() || nf.name.trim(), contact: nf.name.trim(), email: nf.email.trim(), phone: nf.phone.trim(),
        items: nf.items.trim() || nf.cat, qty: Number(nf.qty.replace(/\D/g, "")), branding: nf.brand,
        stage: { label: nf.stage, tone: TONE[nf.stage as keyof typeof TONE] }, owner: nf.owner, date: "Today", time: "just now",
        interest: nf.cat, budget: nf.budget.trim(), needBy: nf.need.trim(), message: nf.msg.trim(),
        src: { channel: chMap[nf.src] ?? nf.src, how: "Added by hand", manual: true }, followUp: "", quote: [], quoteRef: null, quoteSent: null, order: null, unread: false,
        log: [
          { via: "System", text: `Enquiry added by hand by ${me} · came in by ${nf.src.toLowerCase()}`, when: now() },
          ...(nf.stage === "Contacted" ? [{ via: viaMap[nf.src] ?? "Phone", text: `${me} — spoke to ${first(nf.name)}`, when: now() }] : []),
          ...(nf.note.trim() ? [{ via: "Note", text: `${nf.note.trim()} — ${me}`, when: now() }] : []),
        ],
      }, ...created];
      emit(); close(); toast(`${id} saved · ${nf.company.trim() || nf.name.trim()}`); onCreated?.(id); return;
    }
    close();
  };

  const okLabel: Record<Kind, string> = {
    new: "Save enquiry", stage: "Change stage", owner: "Assign", email: `Send to ${list.length}`, message: `Send ${via} to ${list.length}`,
    export: "Download Excel", line: "Add to quotation", quote: "Send quotation",
  };
  const sel = (p: (typeof products)[number] | undefined) => p && setLine((l) => ({ ...l, productId: p.id, unit: p.price ? formatNumber(p.price) : "" }));
  const lp = products.find((p) => p.id === line.productId);

  const dialog = (
    <Dialog open={!!open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-h-[88vh] max-w-[760px] overflow-y-auto">
        {open?.kind === "new" && (
          <>
            <Title sub="For a client who phoned, messaged or met you — it joins the list like any website enquiry.">New enquiry</Title>
            <Section>Client</Section>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Client name" req bad={bad.includes("name")}><input autoFocus value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder="e.g. Aya Hamdy" className={input} /></Field>
              <Field label="Company"><input value={nf.company} onChange={(e) => setNf({ ...nf, company: e.target.value })} placeholder="e.g. Nile Ventures" className={input} /></Field>
              <Field label="Email" req bad={bad.includes("email")}><input value={nf.email} onChange={(e) => setNf({ ...nf, email: e.target.value })} placeholder="name@company.com" className={input} /></Field>
              <Field label="Phone" req bad={bad.includes("phone")}><input value={nf.phone} onChange={(e) => setNf({ ...nf, phone: e.target.value })} placeholder="+20 1xx xxx xxxx" className={input} /></Field>
            </div>
            <Field label="How did it come in?"><Pills value={nf.src} options={CAME_IN} onChange={(v) => setNf({ ...nf, src: v })} /></Field>
            <Section>Request</Section>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Category of interest"><select value={nf.cat} onChange={(e) => setNf({ ...nf, cat: e.target.value })} className={input}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Products / maisons"><input value={nf.items} onChange={(e) => setNf({ ...nf, items: e.target.value })} placeholder="e.g. Hugo Boss pens" className={input} /></Field>
            </div>
            <div className="grid gap-3.5 md:grid-cols-3">
              <Field label="Quantity" req bad={bad.includes("qty")}><input value={nf.qty} onChange={(e) => setNf({ ...nf, qty: e.target.value })} placeholder="e.g. 60" className={input} /></Field>
              <Field label="Budget (optional)"><input value={nf.budget} onChange={(e) => setNf({ ...nf, budget: e.target.value })} placeholder="per piece or total" className={input} /></Field>
              <Field label="Needed by"><input value={nf.need} onChange={(e) => setNf({ ...nf, need: e.target.value })} placeholder="e.g. 30 Oct 2026" className={input} /></Field>
            </div>
            <Field label="Personalisation"><Pills value={nf.brand} options={PERSONAL} onChange={(v) => setNf({ ...nf, brand: v })} /></Field>
            <Field label="Client's message / details"><textarea rows={3} value={nf.msg} onChange={(e) => setNf({ ...nf, msg: e.target.value })} placeholder="What exactly did they ask for?" className={cn(input, "h-auto py-2")} /></Field>
            <Section>Handling</Section>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Owner" hint="From Team & permissions"><select value={nf.owner} onChange={(e) => setNf({ ...nf, owner: e.target.value })} className={input}>{["Unassigned", ...owners].map((o) => <option key={o}>{o}</option>)}</select></Field>
              <Field label="Stage" hint='Choose "Contacted" if you already spoke to them'><select value={nf.stage} onChange={(e) => setNf({ ...nf, stage: e.target.value })} className={input}><option>New</option><option>Contacted</option></select></Field>
            </div>
            <Field label="Internal note (team only)"><textarea rows={2} value={nf.note} onChange={(e) => setNf({ ...nf, note: e.target.value })} className={cn(input, "h-auto py-2")} /></Field>
          </>
        )}

        {open?.kind === "stage" && (
          <>
            <Title>Change stage · {nEnq(list.length)}</Title>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">{list.map((e) => <div key={e.id} className="contents"><dt className="font-medium">{e.company}</dt><dd className="text-right text-muted-foreground">{e.stage.label}</dd></div>)}</dl>
            <Field label="Move all of them to" hint={STAGE_HINT[to]}><select value={to} onChange={(e) => setTo(e.target.value)} className={input}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Note for the record (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Called all five after the trade fair" className={input} /></Field>
            <p className="text-[12px] text-muted-foreground">Each enquiry records the change under <b className="text-foreground">{me}</b>.</p>
          </>
        )}

        {open?.kind === "owner" && (
          <>
            <Title>Assign {nEnq(list.length)}</Title>
            <Field label="Owner" hint="The list comes from Team & permissions — invite someone there and they appear here.">
              <select value={owner} onChange={(e) => setOwnerSel(e.target.value)} className={input}>{["Unassigned", ...owners].map((o) => <option key={o}>{o}</option>)}</select>
            </Field>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" defaultChecked className="accent-[#0a0a0a]" /> Email them the list of enquiries</label>
          </>
        )}

        {open?.kind === "email" && (
          <>
            <Title>{one ? `Email ${one.contact}` : `Email ${list.length} clients`}</Title>
            <p className="rounded-lg border border-border px-3.5 py-2.5 text-[13px]"><b className="text-[15px] font-medium">{list.length}</b> {list.length === 1 ? "client" : "clients"} · one separate email each, from you. Saved in each enquiry's history.</p>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="From"><select className={input}><option>Zelliny &lt;info@zelliny.com&gt;</option><option>{me}</option></select></Field>
              <Field label="Start from"><select value={tpl} onChange={(e) => { const t = EMAIL_TPL[e.target.value]!; setTpl(e.target.value); setSubject(t[0]); setBody(t[1]); }} className={input}>{Object.keys(EMAIL_TPL).map((t) => <option key={t}>{t}</option>)}</select></Field>
            </div>
            <Field label="Subject"><input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} /></Field>
            <Field label="Message" hint={<><b>{"{first name}"}</b> becomes each client's first name, <b>{"{my name}"}</b> yours.</>}><textarea rows={7} value={body} onChange={(e) => setBody(e.target.value)} className={cn(input, "h-auto py-2")} /></Field>
          </>
        )}

        {open?.kind === "message" && (
          <>
            <Title>{one ? `Message ${one.contact}` : `Message ${list.length} clients`}</Title>
            <Pills value={via} options={["WhatsApp", "SMS"]} onChange={(v) => setVia(v as "WhatsApp" | "SMS")} />
            {via === "WhatsApp" ? (
              <>
                <Field label="Message template" hint="WhatsApp only allows messages from templates approved by Meta.">
                  <select value={waTpl} onChange={(e) => setWaTpl(e.target.value)} className={input}>{Object.keys(WA_TPL).map((t) => <option key={t}>{t}</option>)}</select>
                </Field>
                <div className="rounded-lg bg-[#efe7dd] p-3.5">
                  <small className="mb-1.5 block text-[10.5px] uppercase tracking-[.1em] text-muted-foreground">Preview{list[0] ? ` · ${list[0].contact}` : ""}</small>
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-white px-3 py-2.5 text-[13px] shadow-sm">{list[0] ? fillT(WA_TPL[waTpl]!, list[0]) : ""}</div>
                </div>
                {one && <p className="text-[12px] text-muted-foreground">For a personal one-to-one chat instead, <a href={`https://wa.me/${one.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="underline">open WhatsApp with {first(one.contact)}</a>.</p>}
              </>
            ) : (
              <Field label="SMS text" hint={`Sent from the sender name ZELLINY · ${sms.length}/160`}><textarea rows={3} value={sms} onChange={(e) => setSms(e.target.value.slice(0, 160))} className={cn(input, "h-auto py-2")} /></Field>
            )}
          </>
        )}

        {open?.kind === "export" && (
          <>
            <Title sub={open.scope}>Export {nEnq(list.length)} to Excel</Title>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {EXPORT_COLS.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-[13px]"><input type="checkbox" className="accent-[#0a0a0a]" checked={cols.includes(k)} onChange={() => setCols((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))} /> {l}</label>)}
            </div>
            <p className="text-[12px] text-muted-foreground">Downloads a spreadsheet that opens in Excel.</p>
          </>
        )}

        {open?.kind === "line" && one && (
          <>
            <Title>Add a line · {one.company}</Title>
            <Field label="Product"><select value={line.productId} onChange={(e) => sel(products.find((p) => p.id === e.target.value))} className={input}>{products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.brand}{p.price ? "" : " · enquiry item"}</option>)}</select></Field>
            <div className="grid gap-3.5 md:grid-cols-3">
              <Field label="Quantity" req><input value={line.qty} onChange={(e) => setLine({ ...line, qty: e.target.value })} className={input} /></Field>
              <Field label="Unit price (EGP)" req><input value={line.unit} onChange={(e) => setLine({ ...line, unit: e.target.value })} placeholder="Price per piece" className={input} /></Field>
              <Field label="Personalisation per piece"><input value={line.pers} onChange={(e) => setLine({ ...line, pers: e.target.value })} className={input} /></Field>
            </div>
            <p className="text-[12px] text-muted-foreground">{lp?.price ? `Website price ${formatMoney(lp.price)} — change it for a corporate price.` : "Enquiry item — no website price. Type the corporate price."}</p>
          </>
        )}

        {open?.kind === "quote" && one && (
          <>
            <Title>Send quotation {one.quoteRef}</Title>
            <Field label="To"><input value={qs.to} onChange={(e) => setQs({ ...qs, to: e.target.value })} className={input} /></Field>
            <Field label="Subject"><input value={qs.subject} onChange={(e) => setQs({ ...qs, subject: e.target.value })} className={input} /></Field>
            <Field label="Message"><textarea rows={5} value={qs.body} onChange={(e) => setQs({ ...qs, body: e.target.value })} className={cn(input, "h-auto py-2")} /></Field>
            <div className="grid gap-3.5 md:grid-cols-2">
              <div className="text-[13px]"><span className="block text-[12px] text-muted-foreground">Attached</span>📎 <b className="font-medium">{one.quoteRef}.pdf</b> · {formatMoney(quoteTotal(one.quote))}</div>
              <Field label="Valid for"><select value={qs.valid} onChange={(e) => setQs({ ...qs, valid: e.target.value })} className={input}>{["7 days", "14 days", "30 days"].map((o) => <option key={o}>{o}</option>)}</select></Field>
            </div>
            <p className="text-[12px] text-muted-foreground">The stage moves to <b>Quoted</b> and the email is saved in the history.</p>
          </>
        )}

        {open && (
          <DialogFooter className="items-center">
            {err && <span className="mr-auto text-[12.5px] text-bad">{err}</span>}
            <Button onClick={close}>Cancel</Button>
            <Primary onClick={done}>{okLabel[open.kind]}</Primary>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
  return { ...actions, dialog, me };
}
