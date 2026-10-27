import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { browsingQuery } from "@/lib/api/sections.functions";
import type { BrowserRow } from "@/lib/api/section-types";
import { Avatar, Thumb } from "@/components/admin/primitives";
import { downloadCsv } from "@/components/admin/CustomerFlow";
import {
  Button,
  Card,
  DataTable,
  FilterBar,
  PageHeader,
  Pager,
  type Column,
} from "@/components/admin/page";
import { ExportRangeDialog } from "@/components/admin/ExportRangeDialog";
import { dateInFilter, rangeLabel, type DateFilter } from "@/components/admin/DateRangeFilter";
import { SendDialog, STOP_LABEL, canEmail } from "@/components/admin/BrowsingUi";
import { useExcluded, useSentMails } from "@/components/admin/BrowsingFlow";

const STOPS = ["All", "Bag", "Checkout"];

export default function BrowsingPage() {
  const { data } = useSuspenseQuery(browsingQuery());
  const navigate = useNavigate();
  const excluded = useExcluded();
  const sent = useSentMails();
  const [stop, setStop] = useState("All");
  const [sel, setSel] = useState<string[]>([]);
  const [sendTo, setSendTo] = useState<BrowserRow[] | null>(null);
  const [askExport, setAskExport] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Only people who left at the bag or at checkout are followed up, newest first.
  // A person who completes their order leaves this list (the API stops returning them).
  const people = data.rows
    .filter((b) => (b.stop === "bag" || b.stop === "checkout") && !excluded.includes(b.id))
    .sort((a, b) => b.leftAt.localeCompare(a.leftAt));
  const rows = people.filter((b) => stop === "All" || STOP_LABEL[b.stop] === stop);
  const cur = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const shown = rows.slice((cur - 1) * pageSize, cur * pageSize);
  const pickable = rows.filter(canEmail);
  const allOn = pickable.length > 0 && pickable.every((b) => sel.includes(b.id));
  const toggle = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const chosen = people.filter((b) => sel.includes(b.id));

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
                ? sel.filter((id) => !pickable.some((b) => b.id === id))
                : [...new Set([...sel, ...pickable.map((b) => b.id)])],
            )
          }
        />
      ),
      cell: (b) =>
        canEmail(b) ? (
          <input
            type="checkbox"
            aria-label={`Select ${b.name}`}
            checked={sel.includes(b.id)}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggle(b.id)}
          />
        ) : null,
    },
    {
      header: "Person",
      cell: (b) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={b.name} className="size-8" />
          <b className="font-medium">{b.name}</b>
        </div>
      ),
    },
    { header: "Email", cell: (b) => b.email },
    { header: "Phone", cell: (b) => b.phone },
    {
      header: "Cart Items",
      cell: (b) => (
        <div className="flex items-center gap-1">
          {b.views.slice(0, 3).map((i) => (
            <Thumb key={i.productId} color={i.color} />
          ))}
        </div>
      ),
    },
    {
      header: "Stopped at",
      cell: (b) => (
        <div className="text-[12.5px]">
          <b className="font-medium">{STOP_LABEL[b.stop]}</b>
          {b.stop === "checkout" && (
            <div className="text-[12px] text-muted-foreground">{b.stopTxt}</div>
          )}
        </div>
      ),
    },
    { header: "Left on", className: "whitespace-nowrap", cell: (b) => b.last },
    {
      header: "",
      cell: (b) =>
        canEmail(b) ? (
          <span onClick={(e) => e.stopPropagation()}>
            <Button primary className="whitespace-nowrap" onClick={() => setSendTo([b])}>
              {sent[b.id]?.length || b.sent.length ? "Send again" : "Send offer"}
            </Button>
          </span>
        ) : (
          <span className="text-[12px] text-muted-foreground">
            No email consent
            <br />
            ads only
          </span>
        ),
    },
  ];

  /** Everyone who left in the chosen period — all of them, whatever the screen is showing. */
  const inPeriod = (f: DateFilter) => people.filter((b) => dateInFilter(new Date(b.leftAt), f));
  const exportRows = (f: DateFilter) => {
    const list = inPeriod(f);
    downloadCsv(
      `zelliny-browsing-${rangeLabel(f).replace(/\s/g, "")}-${list.length}.csv`,
      ["Name", "Email", "Phone", "Stopped at", "Left on", "Marketing consent"],
      list.map((b) => [
        b.name,
        b.email,
        b.phone,
        b.stop === "checkout" ? `${STOP_LABEL[b.stop]} · ${b.stopTxt}` : STOP_LABEL[b.stop],
        b.last,
        b.optin ? "Yes" : "No",
      ]),
    );
    toast.success(
      `Excel downloaded · ${list.length} ${list.length === 1 ? "person" : "people"} · ${rangeLabel(f)}`,
    );
  };

  return (
    <>
      <PageHeader
        title="Browsing & follow-up"
        subtitle="What visitors looked at before they left — so you can email the people you know and advertise to the ones you don't."
        actions={<Button onClick={() => setAskExport(true)}>Export</Button>}
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
                onClick={() => {
                  setStop(s);
                  setPage(1);
                }}
                className={`rounded-full border px-3 py-1 text-[12.5px] ${stop === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-hover"}`}
              >
                {s} <em className="ml-1 not-italic opacity-70">{n}</em>
              </button>
            );
          })}
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
              <Button primary onClick={() => setSendTo(chosen)}>
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
          rows={shown}
          rowKey={(b) => b.id}
          empty="No one here right now."
          onRowClick={(b) => navigate({ to: "/browsing/$browserId", params: { browserId: b.id } })}
        />
        <Pager
          page={cur}
          pageSize={pageSize}
          total={rows.length}
          noun="visitors"
          onPage={setPage}
          onPageSize={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Newest first. When a person completes their order, they leave this list automatically.
        </p>
      </Card>

      <ExportRangeDialog
        open={askExport}
        onClose={() => setAskExport(false)}
        onExport={exportRows}
        count={(f) => inPeriod(f).length}
        noun="people"
      />
      {sendTo && (
        <SendDialog people={sendTo} onClose={() => setSendTo(null)} onSent={() => setSel([])} />
      )}
    </>
  );
}
