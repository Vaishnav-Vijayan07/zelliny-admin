// Activity log: every change, who made it, before → after, and where it came from.
// Each person signs in with their own username, so nothing is anonymous.
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { activityQuery } from "@/lib/api/sections.functions";
import type { ActivityLink, ActivityRow } from "@/lib/api/section-types";
import { activityDayDate } from "@/lib/api/activity-log";
import { TEAM_ACCOUNTS } from "@/lib/api/team-accounts";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/hooks/use-session";
import { Avatar } from "@/components/admin/primitives";
import { SearchSelect } from "@/components/admin/SearchSelect";
import {
  DateRangeFilter,
  NO_DATE_FILTER,
  inDateFilter,
  type DateFilter,
} from "@/components/admin/DateRangeFilter";
import {
  Button,
  Card,
  DataTable,
  FilterBar,
  PageHeader,
  Pager,
  type Column,
} from "@/components/admin/page";
import { restoreActivity, useAddedActivity } from "@/components/admin/ActivityFlow";
import { useIsOwner } from "@/pages/StaffPage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PEOPLE = ["Ramy Bakr", "Zain", "Ahmed"];
const ALL_AREAS = "All areas";
const SHORT_AT = 34;
const short = (t: string) => (t.length > SHORT_AT ? `${t.slice(0, SHORT_AT)}…` : t);

/** The three boxes at the top; clicking one filters the list to its rows. */
type CardKey = "team" | "price" | "stock";
const CARDS: Record<CardKey, { label: string; noun: string; match: (l: ActivityRow) => boolean }> =
  {
    team: {
      label: "Changes today (by the team)",
      noun: "changes today",
      match: (l) => l.day === "Today" && l.who !== "System" && l.area !== "Sign-in",
    },
    price: {
      label: "Price changes today",
      noun: "price changes today",
      match: (l) => l.day === "Today" && l.area === "Prices" && l.who !== "System",
    },
    stock: {
      label: "Stock changes today",
      noun: "stock changes today",
      match: (l) => l.day === "Today" && l.area === "Stock" && l.who !== "System",
    },
  };
/** Areas where the owner can put the old value back. */
const RESTORABLE = [
  "Prices",
  "Content",
  "Delivery",
  "Settings",
  "Gift services",
  "Selling control",
  "Stock",
];

const accountOf = (name: string) => TEAM_ACCOUNTS.find((a) => a.name === name);

function ItemLink({ row }: { row: ActivityRow }) {
  if (!row.item) return <span className="text-muted-foreground">—</span>;
  const cls = "underline underline-offset-[3px]";
  const l: ActivityLink | undefined = row.link;
  if (!l) return <>{row.item}</>;
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  switch (l.kind) {
    case "order":
      return (
        <Link to="/orders/$orderId" params={{ orderId: l.id }} className={cls} onClick={stop}>
          {row.item}
        </Link>
      );
    case "return":
      return (
        <Link to="/returns/$returnId" params={{ returnId: l.id }} className={cls} onClick={stop}>
          {row.item}
        </Link>
      );
    case "product":
      return (
        <Link to="/products/$productId" params={{ productId: l.id }} className={cls} onClick={stop}>
          {row.item}
        </Link>
      );
    case "enquiry":
      return (
        <Link
          to="/enquiries/$enquiryId"
          params={{ enquiryId: l.id }}
          className={cls}
          onClick={stop}
        >
          {row.item}
        </Link>
      );
    case "section":
      return (
        <Link to="/$section" params={{ section: l.section }} className={cls} onClick={stop}>
          {row.item}
        </Link>
      );
  }
}

function Who({ name }: { name: string }) {
  const acc = accountOf(name);
  return (
    <div className="flex min-w-[150px] items-center gap-2.5">
      {acc ? (
        <Avatar name={name} className="size-[30px] text-[11px]" />
      ) : (
        <span className="grid size-[30px] flex-none place-items-center rounded-full border border-dashed border-[#c9c9c9] text-[12px] text-muted-foreground">
          ⚙
        </span>
      )}
      <div>
        <b className="block font-medium">{name}</b>
        <span className="text-[11.5px] text-muted-foreground">
          {acc ? `${acc.role} · ${acc.username}` : "Automatic"}
        </span>
      </div>
    </div>
  );
}

function BeforeAfter({ row }: { row: ActivityRow }) {
  if (!row.before && !row.after) return <span className="text-muted-foreground">—</span>;
  if (!row.before) return <span className="font-medium">{short(row.after)}</span>;
  return (
    <div className="flex min-w-[180px] flex-wrap items-center gap-2 text-[12.5px]">
      <span dir="auto" className="text-muted-foreground line-through">
        {short(row.before)}
      </span>
      <span className="text-muted-foreground">→</span>
      <span dir="auto" className="font-medium">
        {short(row.after)}
      </span>
    </div>
  );
}

function Kpi({
  label,
  value,
  on,
  onClick,
}: {
  label: string;
  value: ReactNode;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-[10px] border bg-surface px-[18px] py-3.5 text-left hover:border-[#c9c9c9]",
        on ? "border-primary shadow-[inset_3px_0_0_var(--color-primary)]" : "border-border",
      )}
    >
      <span className="block text-[12px] text-muted-foreground">{label}</span>
      <b className="font-head text-[20px] font-medium">{value}</b>
    </button>
  );
}

const columns: Column<ActivityRow>[] = [
  {
    header: "Time",
    width: "78px",
    className: "whitespace-nowrap tabular-nums text-muted-foreground",
    cell: (r) => r.time,
  },
  { header: "Who", width: "20%", cell: (r) => <Who name={r.who} /> },
  {
    header: "What they did",
    width: "23%",
    cell: (r) => (
      <>
        <b className="block font-medium">{r.action}</b>
        <span className="text-[11px] uppercase tracking-[.08em] text-muted-foreground">
          {r.area}
        </span>
      </>
    ),
  },
  { header: "Item", width: "22%", cell: (r) => <ItemLink row={r} /> },
  { header: "Before → After", cell: (r) => <BeforeAfter row={r} /> },
];

export default function ActivityPage() {
  const { data } = useSuspenseQuery(activityQuery());
  const added = useAddedActivity();
  const owner = useIsOwner();
  const me = useSessionUser();
  const [who, setWhoState] = useState("All");
  const [area, setAreaState] = useState(ALL_AREAS);
  const [dateF, setDateFState] = useState<DateFilter>(NO_DATE_FILTER);
  const [card, setCardState] = useState<CardKey | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const setWho = (v: string) => {
    setWhoState(v);
    setPage(1);
  };
  const setArea = (v: string) => {
    setAreaState(v);
    setPage(1);
  };
  const setDateF = (v: DateFilter) => {
    setDateFState(v);
    setPage(1);
  };
  const setCard = (v: CardKey | "") => {
    setCardState(v);
    setPage(1);
  };
  const [open, setOpen] = useState<ActivityRow | null>(null);

  const log = useMemo(() => [...added, ...data], [added, data]);
  const areas = useMemo(() => [ALL_AREAS, ...[...new Set(log.map((l) => l.area))].sort()], [log]);

  const rows = log.filter(
    (l) =>
      (who === "All" || l.who === who) &&
      (area === ALL_AREAS || l.area === area) &&
      inDateFilter(activityDayDate(l.day), dateF) &&
      (!card || CARDS[card].match(l)),
  );
  const cur = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const shown = rows.slice((cur - 1) * pageSize, cur * pageSize);

  const countFor = (n: string) =>
    n === "All" ? log.length : log.filter((l) => l.who === n).length;
  const canRestore = (r: ActivityRow) =>
    owner && !!r.before && r.who !== "System" && RESTORABLE.includes(r.area);

  const restore = (r: ActivityRow) => {
    restoreActivity(r, me?.name ?? "You");
    setOpen(null);
    toast.success("Previous value restored · logged under your name");
  };

  return (
    <>
      <PageHeader
        title="Activity log"
        subtitle="Every change on Zelliny.com — who made it, what it was before and after, and when. Each person signs in with their own username and password, so nothing is anonymous."
        actions={
          <Button onClick={() => toast("Export — connects to your API later")}>Export</Button>
        }
      />

      <div className="mb-[18px] grid grid-cols-2 gap-[18px] md:grid-cols-3">
        {(Object.keys(CARDS) as CardKey[]).map((k) => (
          <Kpi
            key={k}
            label={CARDS[k].label}
            value={log.filter(CARDS[k].match).length}
            on={card === k}
            onClick={() => setCard(card === k ? "" : k)}
          />
        ))}
      </div>

      <Card>
        <FilterBar>
          <div className="flex flex-wrap gap-1.5">
            {["All", ...PEOPLE, "System"].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setWho(n)}
                className={cn(
                  "h-8 whitespace-nowrap rounded-full border px-3.5 text-[12.5px]",
                  who === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface hover:border-[#c9c9c9]",
                )}
              >
                {n === "All" ? "Everyone" : n}
                <em className="ml-1.5 not-italic opacity-60">{countFor(n)}</em>
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <SearchSelect
              value={area === ALL_AREAS ? "" : area}
              options={areas.slice(1)}
              allLabel={ALL_AREAS}
              searchable={false}
              onChange={(v) => setArea(v || ALL_AREAS)}
              className="w-[170px] min-w-0 text-[13px]"
            />
            <DateRangeFilter
              value={dateF}
              onChange={setDateF}
              allLabel="All time"
              keys={["today", "yesterday", "7d", "30d", "90d", "ytd"]}
            />
          </div>
        </FilterBar>

        {card && (
          <div className="mb-3 flex items-center justify-between rounded-[10px] border border-primary px-4 py-2.5 text-[13px]">
            <span>
              Showing <b>{rows.length}</b> {CARDS[card].noun}
            </span>
            <button
              type="button"
              onClick={() => setCard("")}
              className="underline underline-offset-4"
            >
              Show all changes
            </button>
          </div>
        )}

        <DataTable
          fixedLayout
          columns={columns}
          rows={shown}
          rowKey={(r) => r.id}
          onRowClick={setOpen}
          groupBy={(r) => r.day}
          rowClassName={(r) => (r.flag ? "bg-bad-bg hover:bg-bad-bg" : undefined)}
          empty="No changes match these filters."
        />
        <Pager
          page={cur}
          pageSize={pageSize}
          total={rows.length}
          noun="changes"
          onPage={setPage}
          onPageSize={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
        <p className="mt-3 text-[12px] text-muted-foreground">
          Click any line for full details. Entries can't be edited or deleted — not even by the
          owner. Kept for 2 years.
        </p>
      </Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-[480px]">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-head text-[18px] font-normal">
                  {open.action}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Full details of this log entry.
                </DialogDescription>
              </DialogHeader>
              <Who name={open.who} />
              {(open.before || open.after) && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Before", open.before, true],
                    ["After", open.after, false],
                  ].map(([label, val, old]) => (
                    <div
                      key={String(label)}
                      className="min-w-0 rounded-lg border border-border px-3.5 py-3"
                    >
                      <small className="mb-1.5 block text-[10.5px] uppercase tracking-[.18em] text-muted-foreground">
                        {label}
                      </small>
                      <div className="max-h-[170px] overflow-auto">
                        <b
                          dir="auto"
                          className={cn(
                            "whitespace-pre-wrap break-words font-medium",
                            old && "text-muted-foreground",
                          )}
                        >
                          {val || "—"}
                        </b>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
                {(
                  [
                    ["Item", <ItemLink key="i" row={open} />],
                    ["Area", open.area],
                    ["When", `${open.day}, ${open.time}`],
                    ["Username", accountOf(open.who)?.username ?? "System (automatic)"],
                    ["Signed in from", open.from],
                    ["Log reference", open.id],
                  ] as [string, ReactNode][]
                ).map(([k, v]) => (
                  <Fragment key={k}>
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </Fragment>
                ))}
              </dl>
              <DialogFooter>
                <Button onClick={() => setOpen(null)}>Close</Button>
                {canRestore(open) && (
                  <Button primary onClick={() => restore(open)}>
                    Restore previous value
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
