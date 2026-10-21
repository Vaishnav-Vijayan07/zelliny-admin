import { StickyCol } from "@/components/admin/StickyCol";
import { useState, type ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { browsingQuery } from "@/lib/api/sections.functions";
import type { BrowserRow } from "@/lib/api/section-types";
import { Thumb } from "@/components/admin/primitives";
import { Button, Card, DataTable, PageHeader, type Column } from "@/components/admin/page";
import {
  IntentBadge,
  MailPreview,
  STOP_LABEL,
  SendDialog,
  egp,
} from "@/components/admin/BrowsingUi";
import {
  excludeFromFollowUp,
  includeInFollowUp,
  useExcluded,
  useSentMails,
} from "@/components/admin/BrowsingFlow";

const STEPS = ["bag", "checkout"] as const;
const STEP_LABEL: Record<(typeof STEPS)[number], string> = {
  bag: "Bag",
  checkout: "Checkout",
};

/** Rebuild plausible visit sessions from the summary (a real API returns the actual page paths). */
function sessions(b: BrowserRow) {
  const out: { when: string; src: string; dev: string; pages: [string, string][] }[] = [];
  for (let s = 0; s < Math.min(b.visits, 4); s++) {
    const last = s === 0;
    const pages: [string, string][] = [["Homepage", ""]];
    if (b.stop !== "home" || !last) pages.push([`/${b.views[0]!.category}`, ""]);
    b.views.forEach((v, j) => {
      const k = Math.ceil(v.times / b.visits) + (last && j === 0 ? 1 : 0);
      if (k > 0 && (last || j === 0))
        pages.push([v.name + (k > 1 ? ` ×${Math.min(k, v.times)}` : ""), "border-primary"]);
    });
    if (last) {
      if (b.stop === "bag" || b.stop === "checkout")
        pages.push(["Added to bag", "bg-warn-bg text-warn border-transparent"]);
      if (b.stop === "checkout") pages.push(["Checkout", ""]);
      pages.push([`Left · ${STOP_LABEL[b.stop]}`, "bg-bad-bg text-bad border-transparent"]);
    } else pages.push(["Left", ""]);
    out.push({
      when: last
        ? b.last
        : s === 1
          ? "2 days earlier"
          : s === 2
            ? "4 days earlier"
            : "1 week earlier",
      src: last ? b.src : ["Direct", "Instagram", "Google"][s % 3]!,
      dev: b.device,
      pages,
    });
  }
  return out;
}
const KV = ({ rows }: { rows: [string, ReactNode][] }) => (
  <dl className="grid gap-2.5 text-[13px]">
    {rows.map(([k, v]) => (
      <div key={k} className="flex justify-between gap-4">
        <dt className="text-muted-foreground">{k}</dt>
        <dd className="text-right">{v}</dd>
      </div>
    ))}
  </dl>
);

export default function BrowserDetailPage({ id }: { id: string }) {
  const { data } = useSuspenseQuery(browsingQuery());
  const sentNow = useSentMails();
  const excluded = useExcluded();
  const [send, setSend] = useState(false);
  const [allSent, setAllSent] = useState(false);
  const b = data.rows.find((x) => x.id === id);
  if (!b)
    return <p className="py-24 text-center text-muted-foreground">This person was not found.</p>;

  const isOut = excluded.includes(b.id);
  const stopIdx = STEPS.indexOf(b.stop as (typeof STEPS)[number]);
  const sentAll = [...(sentNow[b.id] ?? []), ...b.sent];
  const shownSent = allSent ? sentAll : sentAll.slice(0, 3);
  // The cards and the table both count only what is in the bag.
  const totalViews = b.views.reduce((a, v) => a + v.times, 0);
  const value = b.views.reduce((a, v) => a + (v.price ?? 0) * v.times, 0);
  const kpis: [string, string][] = [
    ["Products In Cart", `${totalViews}`],
    ["Value of Cart", egp(value)],
    ["Main interest", b.views[0]?.category ?? "—"],
  ];

  const cols: Column<BrowserRow["views"][number]>[] = [
    {
      header: "Product",
      cell: (v) => (
        <div className="flex items-center gap-2.5">
          <Thumb color={v.color} />
          <div>
            <b className="font-medium">{v.name}</b>
            <div className="text-[12px] text-muted-foreground">
              {v.brand} · {v.category}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Quantity",
      align: "right",
      cell: (v) => <b className="font-medium">{v.times}</b>,
    },
    { header: "Added", cell: () => b.last },
    {
      header: "Price",
      align: "right",
      cell: (v) => (v.price ? egp(v.price * v.times) : "Enquiry only"),
    },
  ];

  return (
    <>
      <div className="mb-2 text-[12px] text-muted-foreground">
        <Link to="/browsing" className="underline underline-offset-[3px]">
          Browsing & follow-up
        </Link>{" "}
        › {b.name}
      </div>
      <PageHeader
        title={b.name}
        actions={
          <div className="flex flex-wrap gap-2">
            {b.optin && !isOut && (
              <Button primary onClick={() => setSend(true)}>
                Send offer
              </Button>
            )}
            {b.customer && (
              <Link to="/customers/$customerId" params={{ customerId: b.customer.id }}>
                <Button>Open customer</Button>
              </Link>
            )}
            {isOut ? (
              <Button
                onClick={() => {
                  includeInFollowUp(b.id);
                  toast(`${b.name} included in follow-ups`);
                }}
              >
                Follow up again
              </Button>
            ) : (
              <Button
                onClick={() => {
                  excludeFromFollowUp(b.id);
                  toast(`${b.name} excluded from follow-ups`);
                }}
              >
                Stop following up
              </Button>
            )}
          </div>
        }
      />
      {isOut && (
        <p className="mb-4 rounded-lg border border-[#e8d3ae] bg-warn-bg px-3 py-2 text-[13px] text-warn">
          Excluded from follow-ups — this person no longer appears in the follow-up list.
        </p>
      )}
      <div className="mb-[18px] grid gap-3 sm:grid-cols-3 min-[981px]:grid-cols-4">
        {kpis.map(([l, v]) => (
          <div key={l} className="rounded-[10px] border border-border bg-surface px-4 py-3">
            <div className="text-[12px] text-muted-foreground">{l}</div>
            <b className="text-[18px] font-medium">{v}</b>
          </div>
        ))}
      </div>
      <div className="grid items-stretch gap-[18px] min-[981px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col">
          <Card>
            <h3 className="mb-3 text-[15px]">In their bag</h3>
            <DataTable columns={cols} rows={b.views} rowKey={(v) => v.productId} />
          </Card>
          <Card className="flex-1">
            <h3 className="mb-3 flex items-center justify-between text-[15px]">
              Follow-ups sent
              {sentAll.length > 3 && (
                <button
                  type="button"
                  onClick={() => setAllSent(!allSent)}
                  className="text-[12.5px] font-normal underline underline-offset-[3px]"
                >
                  {allSent ? "Show latest 3" : `View all (${sentAll.length})`}
                </button>
              )}
            </h3>
            {sentAll.length ? (
              <ul className="divide-y divide-line-soft">
                {shownSent.map((x, i) => (
                  <li key={i} className="py-3 text-[13px] first:pt-0">
                    <span className="mr-2 rounded border border-border px-1.5 py-px text-[11px] text-muted-foreground">
                      {x.channel}
                    </span>
                    <b className="font-medium">{x.subject}</b>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {x.when} · Sent · {x.offer} · {x.status}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">Nothing sent yet.</p>
            )}
          </Card>
        </div>
        <StickyCol>
          <Card>
            <h3 className="mb-2 text-[15px]">Where they stopped</h3>
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`flex items-center gap-3 py-2 text-[13px] ${i > stopIdx ? "text-muted-foreground" : ""}`}
              >
                <i
                  className={`size-3 flex-none rounded-full border-[1.5px] ${i < stopIdx ? "border-primary bg-primary" : i === stopIdx ? "border-bad bg-bad" : "border-border bg-surface"}`}
                />
                <b className={`font-normal ${i === stopIdx ? "font-medium text-bad" : ""}`}>
                  {STEP_LABEL[s]}
                </b>
                {i === stopIdx && (
                  <span className="ml-auto text-right text-[12px] text-muted-foreground">
                    {b.stopTxt}
                  </span>
                )}
              </div>
            ))}
          </Card>
          <Card>
            <h3 className="mb-3 text-[15px]">Contact</h3>
            <KV
              rows={[
                ["Name", b.name],
                ["Email", b.email],
                ["Mobile", b.phone],
                [
                  "Marketing emails",
                  b.optin ? "Agreed" : <span className="text-warn">Didn't agree · ads only</span>,
                ],
              ]}
            />
          </Card>
          {b.optin && (
            <Card>
              <h3 className="mb-3 text-[15px]">Suggested email</h3>
              <MailPreview b={b} />
            </Card>
          )}
        </StickyCol>
      </div>
      {send && <SendDialog people={[b]} onClose={() => setSend(false)} />}
    </>
  );
}
