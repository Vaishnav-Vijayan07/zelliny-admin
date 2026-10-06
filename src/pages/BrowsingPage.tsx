import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { browsingQuery } from "@/lib/api/sections.functions";
import type { BrowserRow } from "@/lib/api/section-types";
import { Avatar, Thumb } from "@/components/admin/primitives";
import {
  Button,
  Card,
  DataTable,
  FilterBar,
  PageHeader,
  type Column,
} from "@/components/admin/page";
import { IntentBadge, STOP_LABEL, SendOfferDialog } from "@/components/admin/BrowsingUi";
import {
  OFFERS,
  defaultSubject,
  recordSent,
  useExcluded,
  useSentMails,
} from "@/components/admin/BrowsingFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STOPS = ["All", "Bag", "Checkout"];
const INTENTS = ["Any intent", "Hot", "Warm"];

export default function BrowsingPage() {
  const { data } = useSuspenseQuery(browsingQuery());
  const navigate = useNavigate();
  const excluded = useExcluded();
  const sent = useSentMails();
  const [stop, setStop] = useState("All");
  const [intent, setIntent] = useState("Any intent");
  const [sel, setSel] = useState<string[]>([]);
  const [one, setOne] = useState<BrowserRow | null>(null);
  const [bulk, setBulk] = useState(false);
  const [offer, setOffer] = useState(OFFERS[0]!);

  const people = data.rows.filter((b) => !excluded.includes(b.id));
  const rows = people.filter(
    (b) =>
      (stop === "All" || STOP_LABEL[b.stop] === stop) &&
      (intent === "Any intent" || b.intent === intent),
  );
  const allOn = rows.length > 0 && rows.every((b) => sel.includes(b.id));
  const toggle = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const chosen = people.filter((b) => sel.includes(b.id));
  const sendable = chosen.filter((b) => b.optin);
  const skipped = chosen.length - sendable.length;
  const known = Math.round(data.visitors * 0.14);

  const columns: Column<BrowserRow>[] = [
    {
      header: "",
      headerNode: (
        <input
          type="checkbox"
          aria-label="Select all"
          checked={allOn}
          onClick={(e) => e.stopPropagation()}
          onChange={() =>
            setSel(
              allOn
                ? sel.filter((id) => !rows.some((b) => b.id === id))
                : [...new Set([...sel, ...rows.map((b) => b.id)])],
            )
          }
        />
      ),
      cell: (b) => (
        <input
          type="checkbox"
          aria-label={`Select ${b.name}`}
          checked={sel.includes(b.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggle(b.id)}
        />
      ),
    },
    {
      header: "Person",
      cell: (b) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={b.name} className="size-8" />
          <div>
            <b className="font-medium">{b.name}</b>
            <div className="text-[12px] text-muted-foreground">{b.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Stopped at",
      cell: (b) => (
        <div className="flex flex-col gap-0.5 text-[12.5px]">
          <b className="font-medium">{STOP_LABEL[b.stop]}</b>
        </div>
      ),
    },
    { header: "Intent", cell: (b) => <IntentBadge intent={b.intent} /> },
    {
      header: "",
      cell: (b) =>
        b.optin ? (
          <span onClick={(e) => e.stopPropagation()}>
            <Button primary onClick={() => setOne(b)}>
              {sent[b.id]?.length ? "Send again" : "Send offer"}
            </Button>
          </span>
        ) : (
          <span className="text-[12px] text-muted-foreground">Ads only</span>
        ),
    },
  ];

  const sendBulk = () => {
    sendable.forEach((b) => recordSent(b.id, defaultSubject(b.name)));
    toast(`${sendable.length} personalised email${sendable.length === 1 ? "" : "s"} sent`);
    setSel([]);
    setBulk(false);
  };

  return (
    <>
      <PageHeader
        title="Browsing & follow-up"
        subtitle="What visitors looked at before they left — so you can email the people you know and advertise to the ones you don't."
      />
      <p className="mb-[18px] text-[12px] text-muted-foreground">
        Browsing is recorded only after the visitor accepts cookies on the site.
      </p>

      <Card>
        <FilterBar>
          <span className="mr-1 text-[12px] text-muted-foreground">Stopped at</span>
          {STOPS.map((s) => {
            const n =
              s === "All" ? people.length : people.filter((b) => STOP_LABEL[b.stop] === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStop(s)}
                className={`rounded-full border px-3 py-1 text-[12.5px] ${stop === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-hover"}`}
              >
                {s} <em className="ml-1 not-italic opacity-70">{n}</em>
              </button>
            );
          })}
          <select
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            aria-label="Intent"
            className="ml-auto h-8 rounded-lg border border-border bg-surface px-2 text-[13px]"
          >
            {INTENTS.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </FilterBar>
        <div
          className={`mb-3 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px] ${sel.length ? "bg-hover" : "text-muted-foreground"}`}
        >
          <span>
            {sel.length ? (
              <b className="font-medium">{sel.length} selected</b>
            ) : (
              "Tick people to send one follow-up email to all of them"
            )}
          </span>
          {sel.length > 0 && (
            <span className="flex items-center gap-3">
              <Button primary onClick={() => setBulk(true)}>
                Email selected
              </Button>
              <button
                type="button"
                className="text-muted-foreground underline"
                onClick={() => setSel([])}
              >
                Clear
              </button>
            </span>
          )}
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(b) => b.id}
          empty="Nobody matches these filters."
          onRowClick={(b) => navigate({ to: "/browsing/$browserId", params: { browserId: b.id } })}
        />
        <p className="mt-3 text-[12px] text-muted-foreground">
          <b className="font-medium">Intent:</b> Hot = reached the checkout · Warm = reached the
          cart
        </p>
      </Card>

      {one && <SendOfferDialog b={one} open onClose={() => setOne(null)} />}
      <Dialog open={bulk} onOpenChange={setBulk}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Email {sendable.length} {sendable.length === 1 ? "person" : "people"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            Each person gets an email with the product <b>they</b> looked at — not the same email
            for everyone.
          </p>
          <label className="grid gap-1 text-[13px]">
            <span className="text-[12px] text-muted-foreground">Offer</span>
            <select
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-[14px]"
            >
              {OFFERS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          {skipped > 0 && (
            <p className="text-[12px] text-muted-foreground">
              {skipped} selected {skipped > 1 ? "people are" : "person is"} not opted in to offers
              and will be skipped.
            </p>
          )}
          <DialogFooter>
            <Button onClick={() => setBulk(false)}>Cancel</Button>
            {sendable.length > 0 && (
              <Button primary onClick={sendBulk}>
                Send {sendable.length} email{sendable.length === 1 ? "" : "s"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
