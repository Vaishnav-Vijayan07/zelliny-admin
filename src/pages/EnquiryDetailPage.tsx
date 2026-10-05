import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { enquiriesQuery } from "@/lib/api/sections.functions";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/admin/primitives";
import { Button, DataTable, PageHeader } from "@/components/admin/page";
import { STAGE_HINT, StageSelect, editEnquiry, quoteTotal, setOwner, useEnquiries, useEnquiryActions } from "@/components/admin/EnquiryFlow";

const Fact = ({ k, children }: { k: string; children: ReactNode }) => <div><span className="mb-0.5 block text-[11.5px] text-muted-foreground">{k}</span><b className="text-[14.5px] font-medium">{children}</b></div>;
const field = "h-11 w-full rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";

export default function EnquiryDetailPage({ enquiryId }: { enquiryId: string }) {
  const { data } = useSuspenseQuery(enquiriesQuery());
  const navigate = useNavigate();
  const all = useEnquiries(data.rows);
  const act = useEnquiryActions(all, data.owners, data.products);
  const e = all.find((x) => x.id === enquiryId);
  const [fu, setFu] = useState(e?.followUp ?? "");
  const [note, setNote] = useState("");
  // Opening an enquiry marks it read.
  useEffect(() => { if (e?.unread) editEnquiry(e.id, { unread: false }); }, [e?.id, e?.unread]);

  if (!e) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-[28px]">Enquiry not found</h1>
        <p className="mt-2 text-muted-foreground">There is no enquiry {enquiryId}. <Link to="/$section" params={{ section: "enquiries" }} className="underline">Back to Corporate enquiries</Link></p>
      </div>
    );
  }
  const s = e.src;
  const won = e.stage.label === "Won";
  const total = quoteTotal(e.quote);
  const convert = () => {
    if (!e.quote.length) { toast("Add the products to the quotation first — they are copied into the order"); act.addLine(e); return; }
    navigate({ to: "/orders/new", search: { enquiry: e.id } });
  };
  const addNote = () => {
    if (!note.trim()) { toast("Write the note first"); return; }
    editEnquiry(e.id, {}, { via: "Note", text: `${note.trim()} — ${act.me}` }); setNote(""); toast("Note added");
  };

  return (
    <div className="text-[14.5px]">
      <div className="mb-2 text-[12px] text-muted-foreground">
        <Link to="/$section" params={{ section: "enquiries" }} className="underline underline-offset-[3px]">Corporate enquiries</Link> / {e.id}
      </div>
      <PageHeader
        title={e.company}
        subtitle={`${e.id} · received ${e.date}${e.time ? `, ${e.time}` : ""} · came from ${s.channel}`}
        actions={won
          ? (e.order && e.order.startsWith("ZL-") && !e.order.includes("-C-") ? <Button primary onClick={() => navigate({ to: "/orders/$orderId", params: { orderId: e.order! } })}>Open order {e.order}</Button> : null)
          : <><Button onClick={() => act.sendQuote(e)}>Send quotation</Button><Button primary onClick={convert}>Convert to order</Button></>}
      />
      {won && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-good bg-good-bg px-4 py-3 text-[13px]">
          <span><b className="font-semibold">Deal closed.</b> {e.order ? `Confirmed as order ${e.order}.` : "Confirmed as an order."}</span>
        </div>
      )}

      {/* Stage, owner and follow-up — the three things that change most */}
      <section className="mb-6 grid gap-6 rounded-[10px] border border-border bg-surface p-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div><span className="mb-1.5 block text-[11.5px] text-muted-foreground">Stage</span><StageSelect r={e} big who={act.me} /><div className="mt-1.5 text-[12px] text-muted-foreground">{STAGE_HINT[e.stage.label]}</div></div>
        <label className="block"><span className="mb-1.5 block text-[11.5px] text-muted-foreground">Owner</span>
          <select value={e.owner} onChange={(x) => { setOwner(e, x.target.value, act.me); toast(`${e.company} · assigned to ${x.target.value}`); }} className={field}>
            {["Unassigned", ...data.owners].map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label className="block"><span className="mb-1.5 block text-[11.5px] text-muted-foreground">Next follow-up</span>
          <input value={fu} onChange={(x) => setFu(x.target.value)} placeholder="e.g. Mon 28 Sep, 10:00" className={field}
            onBlur={() => { if (fu.trim() === e.followUp) return; editEnquiry(e.id, { followUp: fu.trim() }, fu.trim() ? { via: "System", text: `Follow-up set for ${fu.trim()} · by ${act.me}` } : undefined); toast(fu.trim() ? `Follow-up saved · ${fu.trim()}` : "Follow-up cleared"); }} />
        </label>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Client">
            <h4 className="font-head text-[22px] font-normal leading-tight">{e.contact}</h4>
            <div className="text-[13px] text-muted-foreground">{e.company}</div>
            <div className="mt-[18px] grid gap-[18px] rounded-lg bg-hover px-[18px] py-4 md:grid-cols-[1fr_1.4fr]">
              <div><span className="mb-0.5 block text-[11.5px] text-muted-foreground">Mobile</span><b className="select-all text-[15.5px] font-medium">{e.phone}</b></div>
              <div><span className="mb-0.5 block text-[11.5px] text-muted-foreground">Email</span><b className="select-all break-words text-[15.5px] font-medium">{e.email}</b></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`tel:${e.phone.replace(/\s/g, "")}`} className="rounded-lg border border-border px-4 py-2 text-[13px] hover:bg-hover">Call</a>
              <Button onClick={() => act.message([e])}>WhatsApp / SMS</Button>
              <Button onClick={() => act.email([e])}>Email</Button>
            </div>
            <div className="mt-[22px] grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
              <Fact k="What they want">{e.items}</Fact><Fact k="Quantity">{e.qty} pieces</Fact><Fact k="Personalisation">{e.branding || "—"}</Fact>
              <Fact k="Category">{e.interest || "—"}</Fact><Fact k="Budget">{e.budget || "Not given"}</Fact><Fact k="Needed by">{e.needBy || "Not given"}</Fact>
            </div>
            {e.message && <div className="mt-3.5 rounded-lg bg-hover px-4 py-3.5 text-[13px] leading-relaxed"><small className="mb-1.5 block text-[10.5px] uppercase tracking-[.14em] text-muted-foreground">Client's message</small>“{e.message}”</div>}
            <div className="mt-4 border-t border-line-soft pt-3.5">
              <small className="mb-2 block text-[10.5px] uppercase tracking-[.2em] text-muted-foreground">Where they came from</small>
              {s.manual ? (
                <>
                  <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13px]"><span><span className="text-muted-foreground">Came in by</span> <b className="font-medium">{s.channel}</b></span><span><span className="text-muted-foreground">How</span> <b className="font-medium">{s.how || "Added by hand"}</b></span></div>
                  <p className="mt-1.5 text-[12px] text-muted-foreground">Not from the website form, so there is no online source to record.</p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13px]">
                    <span><span className="text-muted-foreground">Channel</span> <b className="font-medium">{s.channel}</b>{s.how && ` · ${s.how}`}</span>
                    <span><span className="text-muted-foreground">Landing page</span> <b className="font-medium">{s.page ?? "—"}</b></span>
                    {s.campaign && <span><span className="text-muted-foreground">Campaign</span> <b className="font-medium">{s.campaign}</b></span>}
                    <span><span className="text-muted-foreground">Device</span> <b className="font-medium">{s.device ?? "—"}</b></span>
                    <span><span className="text-muted-foreground">Visits before enquiring</span> <b className="font-medium">{s.visits ?? 1}</b></span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-muted-foreground">Recorded automatically when the website form is sent — nothing to fill in.</p>
                </>
              )}
            </div>
          </Panel>

          <Panel title="Quotation" action={e.quoteRef ? <span className="text-[12.5px] text-muted-foreground">{e.quoteRef}{e.quoteSent ? ` · sent ${e.quoteSent}` : " · not sent yet"}</span> : undefined}>
            {e.quote.length ? (
              <>
                <DataTable rows={e.quote.map((l, i) => ({ ...l, i }))} rowKey={(l) => `${l.productId}-${l.i}`} columns={[
                  { header: "Product", cell: (l) => <><b className="font-medium">{l.name}</b><div className="text-[12px] text-muted-foreground">{l.sku}</div></> },
                  { header: "Qty", align: "right", cell: (l) => formatNumber(l.qty) },
                  { header: "Unit price", align: "right", cell: (l) => <span className="whitespace-nowrap">{formatMoney(l.unit)}</span> },
                  { header: "Personalisation", align: "right", cell: (l) => (l.pers ? <span className="whitespace-nowrap">{formatMoney(l.pers)}</span> : "—") },
                  { header: "Line total", align: "right", cell: (l) => <b className="whitespace-nowrap font-medium">{formatMoney((l.unit + l.pers) * l.qty)}</b> },
                  { header: "rm", headerNode: "", cell: (l) => (won ? null : <button type="button" title="Remove line" onClick={() => { editEnquiry(e.id, { quote: e.quote.filter((_, j) => j !== l.i) }); toast("Line removed"); }} className="px-1 text-muted-foreground hover:text-bad">✕</button>) },
                ]} />
                <div className="flex items-baseline justify-end gap-3.5 px-3 pt-3 text-[13px] text-muted-foreground">Total · {formatNumber(e.quote.reduce((a, l) => a + l.qty, 0))} pieces<b className="font-head text-[22px] font-normal text-foreground">{formatMoney(total)}</b></div>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {!won && <Button onClick={() => act.addLine(e)}>+ Add line</Button>}
                  <Button onClick={() => toast(`${e.quoteRef}.pdf ready · EN / AR on the Zelliny letterhead`)}>Download quote PDF</Button>
                  {!won && <Button primary onClick={() => act.sendQuote(e)}>Send quotation</Button>}
                </div>
              </>
            ) : (
              <>
                <p className="pb-3.5 text-[13.5px] text-muted-foreground">No quotation yet. Add the products and prices — then send it to the client as a PDF, or turn it straight into an order.</p>
                <Button primary onClick={() => act.addLine(e)}>+ Add first line</Button>
              </>
            )}
          </Panel>
        </div>

        <Panel title="History" action={<span className="text-[12.5px] text-muted-foreground">{e.log.length}</span>}>
          <div className="mb-3.5 flex gap-2">
            <input value={note} onChange={(x) => setNote(x.target.value)} onKeyDown={(x) => x.key === "Enter" && addNote()} placeholder="Add a note for the team…" className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-[13px] outline-none focus:border-primary" />
            <Button onClick={addNote}>Add</Button>
          </div>
          <ol className="flex flex-col">
            {e.log.slice().reverse().map((t, i) => (
              <li key={i} className="flex gap-3 border-b border-line-soft py-3.5 last:border-0">
                <i className={cn("mt-[5px] size-[9px] flex-none rounded-full", t.via === "System" ? "bg-muted-foreground" : "bg-primary")} />
                <div>
                  <b className="block text-[13px] font-normal">{t.via !== "System" && <span className={cn("mr-1.5 inline-block rounded-[3px] px-1.5 py-px align-[1px] text-[10px] uppercase tracking-[.1em]", t.via === "Note" ? "bg-[#f4efe6]" : "bg-hover")}>{t.via}</span>}{t.text}</b>
                  <span className="text-[12px] text-muted-foreground">{t.when}</span>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      {act.dialog}
    </div>
  );
}
