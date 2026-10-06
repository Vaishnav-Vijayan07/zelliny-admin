import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { returnsQuery } from "@/lib/api/sections.functions";
import type { OrderEvent } from "@/lib/api/section-types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Panel, StatusBadge, Thumb } from "@/components/admin/primitives";
import { Button, PageHeader } from "@/components/admin/page";
import {
  RETURN_STAGES,
  STAGE_HINT,
  TEAM_STAGES,
  editReturn,
  nextReturnLabel,
  useReturnActions,
  useReturns,
} from "@/components/admin/ReturnFlow";
import { soon } from "@/hooks/use-toast-lite";

function Kv({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
const Own = ({ kind, children }: { kind: "team" | "courier" | "closed"; children: ReactNode }) => (
  <span
    className={cn(
      "rounded-full px-2.5 py-0.5 text-[10.5px] normal-case tracking-[.08em]",
      kind === "team"
        ? "bg-primary text-primary-foreground"
        : kind === "courier"
          ? "bg-info-bg text-info"
          : "bg-hover text-muted-foreground",
    )}
  >
    {children}
  </span>
);

export default function ReturnDetailPage({ returnId }: { returnId: string }) {
  const { data } = useSuspenseQuery(returnsQuery());
  const all = useReturns(data.rows);
  const actions = useReturnActions();
  const [note, setNote] = useState("");
  const r = all.find((x) => x.id === returnId);

  if (!r) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-[28px]">Return not found</h1>
        <p className="mt-2 text-muted-foreground">
          There is no return {returnId}.{" "}
          <Link to="/$section" params={{ section: "returns" }} className="underline">
            Back to Returns
          </Link>
        </p>
      </div>
    );
  }
  const s = r.status.label;
  const idx = s === "Rejected" ? -1 : RETURN_STAGES.indexOf(s);
  const next = nextReturnLabel(r, actions.owner);
  const addNote = () => {
    if (!note.trim()) return;
    editReturn(r.id, {}, {
      text: `Note: ${note.trim()}`,
      when: "Just now",
      who: actions.who,
    } satisfies OrderEvent);
    setNote("");
    toast("Note added");
  };
  const lastRejection = r.log
    .filter((x) => x.text.includes("Rejected") || x.text.includes("refund not accepted"))
    .pop();

  return (
    <>
      <div className="mb-2 text-[12px] text-muted-foreground">
        <Link
          to="/$section"
          params={{ section: "returns" }}
          className="underline underline-offset-[3px]"
        >
          Returns & refunds
        </Link>{" "}
        / {r.id}
      </div>
      <PageHeader
        title={`Return ${r.id}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            Order{" "}
            <Link
              to="/orders/$orderId"
              params={{ orderId: r.order }}
              className="underline underline-offset-[3px]"
            >
              {r.order}
            </Link>{" "}
            · <StatusBadge tone={r.status.tone}>{s}</StatusBadge> · {r.kind}
          </span>
        }
        actions={<Button onClick={soon("Return label")}>Print return label</Button>}
      />

      {/* What happens next — or the refund record once it is paid */}
      {s === "Refunded" ? (
        <div className="mb-5 rounded-[10px] border border-good bg-good-bg px-5 py-[18px]">
          <small className="mb-1.5 block text-[10.5px] uppercase tracking-[.2em] text-good">
            Refunded · closed
          </small>
          <h3 className="mb-3 font-head text-[24px] font-normal">
            {formatMoney(r.refund?.amount ?? r.amount)} returned to the customer
          </h3>
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-5">
            {(
              [
                ["Refund reference", r.refund?.ref],
                ["Method", r.refund?.method],
                ["Amount", r.refund ? formatMoney(r.refund.amount) : formatMoney(r.amount)],
                ["Issued by", r.refund?.by],
                ["Date", r.refund?.when],
              ] as [string, string | undefined][]
            ).map(([k, v]) => (
              <div key={k}>
                <span className="mb-0.5 block text-[11px] text-muted-foreground">{k}</span>
                <b className="text-[13.5px] font-medium">{v ?? "—"}</b>
              </div>
            ))}
          </div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <Button onClick={soon("Refund receipt")}>Print refund receipt</Button>
            <Button onClick={() => toast("Refund confirmation re-sent")}>
              Resend confirmation to customer
            </Button>
          </div>
        </div>
      ) : s === "Rejected" ? (
        <div className="mb-5 rounded-[10px] border border-border bg-surface px-6 py-5">
          <small className="mb-2 flex items-center gap-2 text-[10.5px] uppercase tracking-[.2em] text-muted-foreground">
            Status <Own kind="closed">Closed</Own>
          </small>
          <h2 className="mb-1 font-head text-[24px] font-normal">Rejected</h2>
          <p className="text-[13.5px] text-muted-foreground">
            {lastRejection?.text ?? "Not accepted."}
            {lastRejection && ` · ${lastRejection.who}`}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "mb-5 grid items-center gap-5 rounded-[10px] border bg-surface px-6 py-5 md:grid-cols-[1fr_auto]",
            s === "Approved" ? "border-border" : "border-primary",
          )}
        >
          <div>
            <small className="mb-2 flex items-center gap-2 text-[10.5px] uppercase tracking-[.2em] text-muted-foreground">
              {s === "Approved" ? (
                <>
                  Now with <Own kind="courier">Courier · Bosta</Own>
                </>
              ) : (
                <>
                  Next step <Own kind="team">Your team</Own>
                </>
              )}
            </small>
            <h2 className="mb-1 font-head text-[24px] font-normal">{s}</h2>
            <p className="text-[13.5px] text-muted-foreground">
              {STAGE_HINT[s]}
              {s === "Approved" && r.awb && (
                <>
                  {" "}
                  · AWB <b className="font-semibold text-foreground">{r.awb}</b>. It moves to
                  Received by itself when Bosta drops it at the office.
                </>
              )}
              {r.refundAsked && <> · Refund sent to Ramy — waiting for his approval.</>}
            </p>
          </div>
          <div className="flex min-w-[240px] flex-col items-stretch gap-2">
            {next && (
              <button
                type="button"
                onClick={() => actions.run(r)}
                className={cn(
                  "h-[46px] rounded-lg border px-4 text-[13px]",
                  TEAM_STAGES.includes(s)
                    ? "border-primary bg-primary text-primary-foreground hover:opacity-90"
                    : "border-border bg-surface hover:border-primary",
                )}
              >
                {next} →
              </button>
            )}
            {s === "Requested" && (
              <button
                type="button"
                onClick={() => actions.run(r, "reject")}
                className="text-center text-[12px] text-bad underline underline-offset-[3px]"
              >
                Reject this return
              </button>
            )}
          </div>
        </div>
      )}

      {s !== "Rejected" && (
        <div className="mb-5 flex rounded-[10px] border border-border bg-surface px-5 py-4">
          {RETURN_STAGES.map((st, i) => (
            <div
              key={st}
              className={cn(
                "relative flex flex-1 flex-col gap-2 text-[12px] text-muted-foreground after:absolute after:left-3 after:right-0 after:top-[5px] after:h-0.5 after:bg-border last:after:hidden",
                idx > i && "text-foreground after:bg-primary",
                idx === i && "font-semibold text-foreground",
              )}
            >
              <i
                className={cn(
                  "z-[1] size-3 rounded-full border-2 border-line2 bg-surface",
                  idx >= i && "border-primary bg-primary",
                  idx === i && "shadow-[0_0_0_4px_rgba(0,0,0,.06)]",
                )}
              />
              <span>{st}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title={r.lines.length > 1 ? "Returned items" : "Returned item"}>
            {r.lines.map((l) => (
              <div
                key={l.sku}
                className="flex items-center gap-3.5 border-b border-line-soft py-3 text-[13px] last:border-0"
              >
                <Thumb color="#ddd" className="size-[72px]" />
                <div className="grow">
                  <b className="font-medium">{l.name}</b>
                  <div className="text-[12px] text-muted-foreground">
                    {l.sku}
                    {l.qty > 1 ? ` · qty ${l.qty}` : ""}
                  </div>
                </div>
                <b className="font-medium">{formatMoney(l.price * l.qty)}</b>
              </div>
            ))}
          </Panel>
          <Panel title="Who did what">
            <ol className="flex flex-col">
              {r.log
                .slice()
                .reverse()
                .map((t, i) => (
                  <li key={`${t.text}-${i}`} className="flex gap-3 py-2">
                    <i
                      className={cn(
                        "mt-[5px] size-[9px] flex-none rounded-full",
                        t.who === "Bosta"
                          ? "bg-info"
                          : t.who === r.customer
                            ? "bg-muted-foreground"
                            : "bg-primary",
                      )}
                    />
                    <div>
                      <b className="block text-[13px] font-normal">{t.text}</b>
                      <span className="text-[12px] text-muted-foreground">
                        {t.when}
                        <small className="ml-1.5 rounded-full bg-hover px-[7px] py-px text-[10.5px]">
                          {t.who}
                        </small>
                      </span>
                    </div>
                  </li>
                ))}
            </ol>
            <div className="mt-3 flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                placeholder="Add an internal note…"
                className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-[13px] outline-none focus:border-primary"
              />
              <Button onClick={addNote}>Add</Button>
            </div>
          </Panel>
          <Panel title="Reason & policy check">
            <Kv
              rows={[
                ["Reason type", r.kind],
                ["Customer's words", r.reason],
                ["Matched rule", r.rule],
                [
                  "Within policy",
                  /Outside|not returnable/.test(r.rule) ? (
                    <span key="w" className="text-bad">
                      No — {r.rule}
                    </span>
                  ) : (
                    <span key="w" className="text-good">
                      Yes
                    </span>
                  ),
                ],
                ["Came in by", r.via],
                ["Photos", r.photos ? `${r.photos} photo${r.photos > 1 ? "s" : ""}` : "None"],
                ["Inspection", r.inspect ?? "Not yet"],
              ]}
            />
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Customer">
            <div className="flex items-center gap-3">
              <span className="grid size-[34px] place-items-center rounded-full bg-hover text-[12px] font-semibold">
                {r.customer
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <b className="font-medium">{r.customer}</b>
                <span className="block text-[12px] text-muted-foreground">
                  {r.customerInfo.phone || "—"}
                </span>
              </div>
            </div>
          </Panel>
          <Panel title="Refund">
            <Kv
              rows={[
                ["Amount", formatMoney(r.amount)],
                ["To", "Original payment method"],
                [
                  "Status",
                  r.refund ? (
                    <StatusBadge key="s" tone="ok">
                      Refunded
                    </StatusBadge>
                  ) : r.refundAsked ? (
                    "Waiting for Ramy"
                  ) : (
                    "Not yet issued"
                  ),
                ],
                ["Reference", r.refund?.ref ?? "—"],
                ["Issued by", r.refund?.by ?? "—"],
              ]}
            />
          </Panel>
          <Panel title="Pickup">
            <Kv
              rows={[
                ["Courier", "Bosta"],
                ["AWB", r.awb ?? "—"],
                [
                  "Label",
                  <button
                    key="l"
                    type="button"
                    onClick={soon("Return label")}
                    className="underline"
                  >
                    Download label
                  </button>,
                ],
              ]}
            />
          </Panel>
        </div>
      </div>

      {actions.dialog}
    </>
  );
}
