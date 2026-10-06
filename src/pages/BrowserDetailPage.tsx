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
  SendOfferDialog,
  egp,
} from "@/components/admin/BrowsingUi";
import {
  excludeFromFollowUp,
  includeInFollowUp,
  useExcluded,
  useSentMails,
} from "@/components/admin/BrowsingFlow";

const STEPS = ["home", "category", "product", "bag", "checkout", "paid"] as const;
const STEP_LABEL: Record<(typeof STEPS)[number], string> = {
  home: "Homepage",
  category: "Category page",
  product: "Product page",
  bag: "Bag",
  checkout: "Checkout",
  paid: "Paid order",
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
  const b = data.rows.find((x) => x.id === id);
  if (!b)
    return <p className="py-24 text-center text-muted-foreground">This person was not found.</p>;

  const isOut = excluded.includes(b.id);
  const stopIdx = STEPS.indexOf(b.stop);
  const sentAll = [...(sentNow[b.id] ?? []), ...b.sent];
  const totalViews = b.views.reduce((a, v) => a + v.times, 0);
  const value = b.views.reduce((a, v) => a + (v.price ?? 0), 0);
  const kpis: [string, string][] = [
    ["Visits (last 14 days)", String(b.visits)],
    ["Products viewed", `${b.views.length} · ${totalViews} views`],
    ["Value of what they viewed", egp(value)],
    ["Main interest", b.views[0]!.category],
  ];
  const inBag = b.stop === "bag" || b.stop === "checkout";

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
      header: "Times viewed",
      align: "right",
      cell: (v) => <b className="font-medium">{v.times}</b>,
    },
    { header: "Last viewed", cell: () => b.last },
    {
      header: "Bag",
      cell: (v) =>
        inBag && v.productId === b.views[0]!.productId ? (
          <span className="text-warn">In bag</span>
        ) : (
          "—"
        ),
    },
    { header: "Price", align: "right", cell: (v) => (v.price ? egp(v.price) : "Enquiry only") },
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
        subtitle={
          <span className="inline-flex items-center gap-2">
            <IntentBadge intent={b.intent} />
            {b.how} · last visit {b.last}
          </span>
        }
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
        <p className="mb-4 rounded-lg bg-hover px-3 py-2 text-[13px]">
          Excluded from follow-ups — this person no longer appears in the follow-up list.
        </p>
      )}
      <div className="mb-[18px] grid gap-3 sm:grid-cols-2 min-[981px]:grid-cols-4">
        {kpis.map(([l, v]) => (
          <div key={l} className="rounded-[10px] border border-border bg-surface px-4 py-3">
            <div className="text-[12px] text-muted-foreground">{l}</div>
            <b className="text-[18px] font-medium">{v}</b>
          </div>
        ))}
      </div>
      <div className="grid items-start gap-[18px] min-[981px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Card>
            <h3 className="mb-3 text-[15px]">What they looked at</h3>
            <DataTable columns={cols} rows={b.views} rowKey={(v) => v.productId} />
          </Card>
          <Card>
            <h3 className="mb-3 text-[15px]">Visit history</h3>
            {sessions(b).map((s, i) => (
              <div key={i} className="border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <div className="mb-2 flex justify-between gap-2.5 text-[12.5px]">
                  <b className="font-medium">{s.when}</b>
                  <span className="text-muted-foreground">
                    {s.src} · {s.dev}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                  {s.pages.map(([p, cls], j) => (
                    <span key={j} className="contents">
                      {j > 0 && <i className="not-italic text-muted-foreground">›</i>}
                      <span
                        className={`rounded-full border border-border bg-surface px-2.5 py-[3px] ${cls}`}
                      >
                        {p}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </Card>
          <Card>
            <h3 className="mb-3 text-[15px]">Follow-ups sent</h3>
            {sentAll.length ? (
              <ul className="space-y-3">
                {sentAll.map((x, i) => (
                  <li key={i} className="text-[13px]">
                    <b className="font-medium">{x.subject}</b>
                    <div className="text-[12px] text-muted-foreground">
                      {x.when} · {x.status}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">Nothing sent yet.</p>
            )}
          </Card>
        </div>
        <div className="min-w-0">
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
                ["Email", b.email],
                ["How we know them", b.how],
                [
                  "Marketing emails",
                  b.optin ? (
                    <span className="text-ok">✓ Opted in</span>
                  ) : (
                    <span className="text-muted-foreground">Not opted in — no promotions</span>
                  ),
                ],
                ["Came from", b.src],
                ["Device", b.device],
                [
                  "Customer record",
                  b.customer ? (
                    <Link
                      to="/customers/$customerId"
                      params={{ customerId: b.customer.id }}
                      className="underline"
                    >
                      {b.customer.orders} orders · {egp(b.customer.spent)}
                    </Link>
                  ) : (
                    "Not a customer yet"
                  ),
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
        </div>
      </div>
      {send && <SendOfferDialog b={b} open onClose={() => setSend(false)} />}
    </>
  );
}
