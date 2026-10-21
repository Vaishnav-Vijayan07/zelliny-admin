import { StickyCol } from "@/components/admin/StickyCol";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { enquiriesQuery } from "@/lib/api/sections.functions";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Panel, Thumb } from "@/components/admin/primitives";
import { Dropdown } from "@/components/admin/Dropdown";
import { Button, DataTable, PageHeader } from "@/components/admin/page";
import { useStickyFit } from "@/components/admin/useStickyFit";
import {
  FollowUpPicker,
  STAGE_HINT,
  StageSelect,
  dealValue,
  editEnquiry,
  quoteTotal,
  setOwner,
  useEnquiries,
  useEnquiryActions,
} from "@/components/admin/EnquiryFlow";
import { useSessionUser } from "@/hooks/use-session";
import { canDo } from "@/lib/team-store";

const NOTE_TYPES = ["Note", "Phone", "Email", "WhatsApp", "Meeting"];

/** Order numbers in a history line open the order. */
function withOrderLinks(text: string, from: string) {
  return text.split(/(ZL-[A-Z0-9-]+)/).map((part, i) =>
    /^ZL-[A-Z0-9-]+$/.test(part) ? (
      <Link
        key={i}
        to="/orders/$orderId"
        params={{ orderId: part }}
        search={{ from }}
        className="underline underline-offset-[3px]"
      >
        {part}
      </Link>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

const Fact = ({ k, children }: { k: string; children: ReactNode }) => (
  <div>
    <span className="mb-0.5 block text-[11.5px] text-muted-foreground">{k}</span>
    <b className="text-[14.5px] font-medium">{children}</b>
  </div>
);
const field =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";

export default function EnquiryDetailPage({ enquiryId }: { enquiryId: string }) {
  const { data } = useSuspenseQuery(enquiriesQuery());
  const navigate = useNavigate();
  const all = useEnquiries(data.rows);
  const user = useSessionUser();
  const seeValues = canDo(user?.role, "values");
  const act = useEnquiryActions(all, data.owners, data.products, undefined, (id) =>
    navigate({ to: "/orders/new", search: { enquiry: id } }),
  );
  const e = all.find((x) => x.id === enquiryId);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("Note");
  const sideRef = useStickyFit(84);
  // Opening an enquiry marks it read.
  useEffect(() => {
    if (e?.unread) editEnquiry(e.id, { unread: false });
  }, [e?.id, e?.unread]);

  if (!e) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-[28px]">Enquiry not found</h1>
        <p className="mt-2 text-muted-foreground">
          There is no enquiry {enquiryId}.{" "}
          <Link to="/$section" params={{ section: "enquiries" }} className="underline">
            Back to Corporate enquiries
          </Link>
        </p>
      </div>
    );
  }
  const s = e.src;
  const won = e.stage.label === "Won";
  const total = quoteTotal(e.quote);
  const closed = won || e.stage.label === "Lost";
  const convert = () => {
    if (!e.quote.length) {
      toast("Add the products to the quotation first — they are copied into the order");
      act.addLine(e);
      return;
    }
    navigate({ to: "/orders/new", search: { enquiry: e.id } });
  };
  const addNote = () => {
    if (!note.trim()) {
      toast("Write the note first");
      return;
    }
    editEnquiry(e.id, {}, { via: noteType, text: `${note.trim()} — ${act.me}` });
    setNote("");
    if (e.stage.label === "New" && noteType !== "Note") act.askContacted(e, noteType);
    else toast("Note added");
    setNoteType("Note");
  };

  return (
    <div className="text-[14.5px]">
      <div className="mb-2 text-[12px] text-muted-foreground">
        <Link
          to="/$section"
          params={{ section: "enquiries" }}
          className="underline underline-offset-[3px]"
        >
          Corporate enquiries
        </Link>{" "}
        / {e.id} · {e.company}
      </div>
      <PageHeader
        title={e.company}
        subtitle={`${e.id} · received ${e.date}${e.time ? `, ${e.time}` : ""} · came from ${s.channel}`}
        actions={
          won ? null : (
            <>
              <Button onClick={() => act.sendQuote(e)}>Send quotation</Button>
              <Button primary onClick={convert}>
                Convert to order
              </Button>
            </>
          )
        }
      />
      {won && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-good bg-good-bg px-4 py-3 text-[13px]">
          <span>
            <b className="font-semibold">Deal closed.</b>{" "}
            {e.order ? (
              <>
                Confirmed as order{" "}
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: e.order }}
                  search={{ from: e.id }}
                  className="underline underline-offset-[3px]"
                >
                  {e.order}
                </Link>
                {seeValues && dealValue(e) ? ` · ${formatMoney(dealValue(e))}` : ""}.
              </>
            ) : (
              "Confirmed as an order."
            )}
          </span>
        </div>
      )}
      {e.stage.label === "Lost" && (
        <div className="mb-5 rounded-lg border border-bad bg-bad-bg px-4 py-3 text-[13px]">
          <b className="font-semibold">Deal lost.</b> Reason: {e.lostReason ?? "not given"}.
        </div>
      )}

      {/* Stage, owner and follow-up — the three things that change most */}
      <section className="mb-6 grid gap-6 rounded-[10px] border border-border bg-surface p-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <span className="mb-1.5 block text-[11.5px] text-muted-foreground">Stage</span>
          <StageSelect r={e} big onPick={(v) => act.stageTo(e, v)} />
          <div className="mt-1.5 text-[12px] text-muted-foreground">
            {STAGE_HINT[e.stage.label]}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-[11.5px] text-muted-foreground">Owner</span>
          <Dropdown
            value={e.owner}
            onChange={(v) => {
              setOwner(e, v, act.me);
              toast(`${e.company} · assigned to ${v}`);
            }}
            className="h-11 w-full px-3.5 text-[14px] text-foreground"
            options={["Unassigned", ...data.owners].map((o) => ({ value: o, label: o }))}
          />
        </div>
        <div>
          <span className="mb-1.5 block text-[11.5px] text-muted-foreground">Next follow-up</span>
          <FollowUpPicker
            value={closed ? "" : e.followUp}
            disabled={closed}
            onChange={(v) => {
              editEnquiry(
                e.id,
                { followUp: v },
                {
                  via: "System",
                  text: v
                    ? `Follow-up set for ${v} · by ${act.me}`
                    : `Follow-up cleared · by ${act.me}`,
                },
              );
              toast(v ? `Follow-up saved · ${v}` : "Follow-up cleared");
            }}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Client">
            <h4 className="font-head text-[22px] font-normal leading-tight">{e.contact}</h4>
            <div className="text-[13px] text-muted-foreground">{e.company}</div>
            <div className="mt-[18px] grid gap-[18px] rounded-lg bg-hover px-[18px] py-4 md:grid-cols-[1fr_1.4fr]">
              <div>
                <span className="mb-0.5 block text-[11.5px] text-muted-foreground">Mobile</span>
                <b className="select-all text-[15.5px] font-medium">{e.phone}</b>
              </div>
              <div>
                <span className="mb-0.5 block text-[11.5px] text-muted-foreground">Email</span>
                <b className="select-all break-words text-[15.5px] font-medium">{e.email}</b>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => act.message([e])}>WhatsApp / SMS</Button>
              <Button onClick={() => act.email([e])}>Email</Button>
            </div>
            {e.product && (
              <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-border px-4 py-3">
                <Thumb color={e.product.color} className="size-14 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <span className="block text-[11.5px] text-muted-foreground">
                    Product they enquired about
                  </span>
                  <b className="block text-[15px] font-semibold">{e.product.name}</b>
                  <small className="text-[12.5px] text-muted-foreground">
                    {[
                      e.product.brand,
                      e.product.category,
                      e.product.sku && `Model ${e.product.sku}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </div>
                <div className="text-right text-[13px]">
                  {e.product.price
                    ? `Website price ${formatMoney(e.product.price)}`
                    : "Enquiry item"}
                  {e.product.id && (
                    <Link
                      to="/products/$productId"
                      params={{ productId: e.product.id }}
                      className="mt-1 block underline underline-offset-[3px]"
                    >
                      View product ↗
                    </Link>
                  )}
                </div>
              </div>
            )}
            <div className="mt-[22px] grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
              <Fact k="What they want">{e.items}</Fact>
              <Fact k="Quantity">{e.qty} pieces</Fact>
              <Fact k="Personalisation">{e.branding || "—"}</Fact>
              <Fact k="Category">{e.interest || "—"}</Fact>
              <Fact k="Budget">{e.budget || "Not given"}</Fact>
              <Fact k="Needed by">{e.needBy || "Not given"}</Fact>
            </div>
            {e.message && (
              <div className="mt-3.5 rounded-lg bg-hover px-4 py-3.5 text-[13px] leading-relaxed">
                <small className="mb-1.5 block text-[10.5px] uppercase tracking-[.14em] text-muted-foreground">
                  Client's message
                </small>
                “{e.message}”
              </div>
            )}
          </Panel>

          <Panel
            className="lg:flex-1"
            title="Quotation"
            action={
              e.quoteRef ? (
                <span className="text-[12.5px] text-muted-foreground">
                  {e.quoteRef}
                  {e.quoteSent ? ` · sent ${e.quoteSent}` : " · not sent yet"}
                </span>
              ) : undefined
            }
          >
            {e.quote.length ? (
              <>
                <DataTable
                  rows={e.quote.map((l, i) => ({ ...l, i }))}
                  rowKey={(l) => `${l.productId}-${l.i}`}
                  columns={[
                    {
                      header: "Product",
                      cell: (l) => (
                        <>
                          <b className="font-medium">{l.name}</b>
                          <div className="text-[12px] text-muted-foreground">{l.sku}</div>
                        </>
                      ),
                    },
                    { header: "Qty", align: "right", cell: (l) => formatNumber(l.qty) },
                    {
                      header: "Unit price",
                      align: "right",
                      cell: (l) => <span className="whitespace-nowrap">{formatMoney(l.unit)}</span>,
                    },
                    {
                      header: "Personalisation",
                      align: "right",
                      cell: (l) =>
                        l.pers ? (
                          <span className="whitespace-nowrap">{formatMoney(l.pers)}</span>
                        ) : (
                          "—"
                        ),
                    },
                    {
                      header: "Line total",
                      align: "right",
                      cell: (l) => (
                        <b className="whitespace-nowrap font-medium">
                          {formatMoney((l.unit + l.pers) * l.qty)}
                        </b>
                      ),
                    },
                    {
                      header: "rm",
                      headerNode: "",
                      cell: (l) =>
                        won ? null : (
                          <button
                            type="button"
                            title="Remove line"
                            onClick={() => {
                              editEnquiry(e.id, { quote: e.quote.filter((_, j) => j !== l.i) });
                              toast("Line removed");
                            }}
                            className="px-1 text-muted-foreground hover:text-bad"
                          >
                            ✕
                          </button>
                        ),
                    },
                  ]}
                />
                <div className="flex items-baseline justify-end gap-3.5 px-3 pt-3 text-[13px] text-muted-foreground">
                  Total · {formatNumber(e.quote.reduce((a, l) => a + l.qty, 0))} pieces
                  <b className="font-head text-[22px] font-normal text-foreground">
                    {formatMoney(total)}
                  </b>
                </div>
                {won && e.order && (
                  <div className="mt-3.5 rounded-lg bg-hover px-4 py-2.5 text-[13px]">
                    🔒 Locked — this quotation was copied into order{" "}
                    <Link
                      to="/orders/$orderId"
                      params={{ orderId: e.order }}
                      search={{ from: e.id }}
                      className="underline underline-offset-[3px]"
                    >
                      {e.order}
                    </Link>
                    .
                  </div>
                )}
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {!won && <Button onClick={() => act.addLine(e)}>+ Add line</Button>}
                  <Button
                    onClick={() =>
                      toast(`${e.quoteRef}.pdf ready · EN / AR on the Zelliny letterhead`)
                    }
                  >
                    Download quote PDF
                  </Button>
                  {!won && (
                    <Button primary onClick={() => act.sendQuote(e)}>
                      Send quotation
                    </Button>
                  )}
                </div>
              </>
            ) : won ? (
              <p className="text-[13.5px] text-muted-foreground">
                No quotation was made — the order was entered in Orders by hand.
              </p>
            ) : (
              <>
                <p className="pb-3.5 text-[13.5px] text-muted-foreground">
                  No quotation yet. Add the products and prices — then send it to the client as a
                  PDF, or turn it straight into an order.
                </p>
                <Button primary onClick={() => act.addLine(e)}>
                  + Add first line
                </Button>
              </>
            )}
          </Panel>
        </div>

        <StickyCol>
          <div ref={sideRef} className="lg:sticky lg:top-[84px]">
            <Panel
              title="History"
              action={<span className="text-[12.5px] text-muted-foreground">{e.log.length}</span>}
            >
              <div className="mb-2 flex gap-2">
                <input
                  value={note}
                  onChange={(x) => setNote(x.target.value)}
                  onKeyDown={(x) => x.key === "Enter" && addNote()}
                  placeholder="Add a note for the team…"
                  className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-[13px] outline-none focus:border-primary"
                />
                <Button onClick={addNote}>Add</Button>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {NOTE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNoteType(t)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11.5px]",
                      noteType === t
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <ol className="flex max-h-[calc(100vh-300px)] flex-col overflow-y-auto">
                {e.log
                  .slice()
                  .reverse()
                  .map((t, i) => (
                    <li
                      key={i}
                      className="flex gap-3 border-b border-line-soft py-3.5 last:border-0"
                    >
                      <i
                        className={cn(
                          "mt-[5px] size-[9px] flex-none rounded-full",
                          t.via === "System" ? "bg-muted-foreground" : "bg-primary",
                        )}
                      />
                      <div>
                        <b className="block text-[13px] font-normal">
                          {t.via !== "System" && (
                            <span
                              className={cn(
                                "mr-1.5 inline-block rounded-[3px] px-1.5 py-px align-[1px] text-[10px] uppercase tracking-[.1em]",
                                t.via === "Note" ? "bg-[#f4efe6]" : "bg-hover",
                              )}
                            >
                              {t.via}
                            </span>
                          )}
                          {withOrderLinks(t.text, e.id)}
                        </b>
                        <span className="text-[12px] text-muted-foreground">{t.when}</span>
                      </div>
                    </li>
                  ))}
              </ol>
            </Panel>
          </div>
        </StickyCol>
      </div>
      {act.dialog}
    </div>
  );
}
