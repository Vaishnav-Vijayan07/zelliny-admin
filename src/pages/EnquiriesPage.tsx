import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { enquiriesQuery } from "@/lib/api/sections.functions";
import type { EnquiryRow } from "@/lib/api/section-types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Button,
  Card,
  DataTable,
  FilterBar,
  PageHeader,
  Pager,
  SearchInput,
  type Column,
} from "@/components/admin/page";
import { Thumb } from "@/components/admin/primitives";
import { Dropdown } from "@/components/admin/Dropdown";
import {
  DateRangeFilter,
  NO_DATE_FILTER,
  inDateFilter,
  type DateFilter,
} from "@/components/admin/DateRangeFilter";
import {
  CAME_FROM_EXTRA,
  STAGES,
  STAGE_COLOR,
  StageSelect,
  dealValue,
  enquiryDay,
  enquiryWhen,
  matchesCameFrom,
  useEnquiries,
  useEnquiryActions,
} from "@/components/admin/EnquiryFlow";
import { useSessionUser } from "@/hooks/use-session";
import { canDo } from "@/lib/team-store";

/** The four totals at the top — each one filters the list. */
const TILE: Record<string, (e: EnquiryRow) => boolean> = {
  All: () => true,
  Contacted: (e) => e.stage.label !== "New",
  "Not contacted": (e) => e.stage.label === "New",
  "In progress": (e) => ["Contacted", "Quoted", "Negotiation"].includes(e.stage.label),
  Won: (e) => e.stage.label === "Won",
};
const TILE_TEXT: Record<string, string> = {
  All: "all enquiries",
  Contacted: "enquiries we have contacted",
  "Not contacted": "enquiries not contacted yet",
  "In progress": "enquiries in progress",
  Won: "closed deals",
};

type SortKey = "rec" | "stage" | "owner";
const SORT_VAL: Record<SortKey, (e: EnquiryRow) => number | string> = {
  rec: (e) => enquiryWhen(e).getTime(),
  stage: (e) => STAGES.indexOf(e.stage.label),
  owner: (e) => (e.owner === "Unassigned" ? "~" : e.owner),
};

function Check({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="size-4 cursor-pointer accent-[#0a0a0a] disabled:opacity-40"
    />
  );
}
function BulkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-[30px] rounded-lg border border-white/35 px-3.5 text-[12px] text-white hover:border-white"
    >
      {children}
    </button>
  );
}
function SortHead({
  label,
  on,
  dir,
  onClick,
}: {
  label: string;
  on: boolean;
  dir: 1 | -1;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("uppercase tracking-[.12em] hover:text-foreground", on && "text-foreground")}
    >
      {label}
      <span className={cn("ml-1.5 text-[10px]", !on && "opacity-40")}>
        {on ? (dir > 0 ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

function ContactRow({ e }: { e: EnquiryRow }) {
  return (
    <div className="grid items-center gap-[18px] rounded-lg border border-border bg-surface px-[18px] py-3.5 md:grid-cols-[1.2fr_1fr_1.4fr_1fr_auto]">
      <div>
        <b className="block text-[14px] font-medium">{e.contact}</b>
        <span className="text-[11.5px] text-muted-foreground">{e.company}</span>
      </div>
      <div>
        <span className="block text-[11.5px] text-muted-foreground">Mobile</span>
        <b className="select-all text-[14px] font-medium">{e.phone}</b>
      </div>
      <div>
        <span className="block text-[11.5px] text-muted-foreground">Email</span>
        <b className="select-all break-words text-[14px] font-medium">{e.email}</b>
      </div>
      <div>
        <span className="block text-[11.5px] text-muted-foreground">Received</span>
        <b className="text-[14px] font-medium">
          {e.date} · {e.src.channel}
        </b>
      </div>
      <Link
        to="/enquiries/$enquiryId"
        params={{ enquiryId: e.id }}
        className="whitespace-nowrap text-[13px] underline underline-offset-[3px]"
      >
        Open enquiry →
      </Link>
    </div>
  );
}

export default function EnquiriesPage() {
  const { data } = useSuspenseQuery(enquiriesQuery());
  const navigate = useNavigate();
  const user = useSessionUser();
  const seeValues = canDo(user?.role, "values");
  const all = useEnquiries(data.rows);
  const act = useEnquiryActions(
    all,
    data.owners,
    data.products,
    (id) => navigate({ to: "/enquiries/$enquiryId", params: { enquiryId: id } }),
    (id) => navigate({ to: "/orders/new", search: { enquiry: id } }),
  );
  const [tile, setTile] = useState("All");
  const [f, setF] = useState({ q: "", stage: "", owner: "", ch: "" });
  const [dateF, setDateF] = useState<DateFilter>(NO_DATE_FILTER);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const setFilter = (k: keyof typeof f) => (v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setPage(1);
  };
  const pickTile = (k: string) => {
    setTile(k);
    setSel(new Set());
    setPage(1);
  };
  const sortBy = (key: SortKey) => {
    setSort((s) =>
      s?.key !== key
        ? { key, dir: key === "rec" ? -1 : 1 }
        : s.dir === (key === "rec" ? -1 : 1)
          ? { key, dir: (key === "rec" ? 1 : -1) as 1 | -1 }
          : null,
    );
    setPage(1);
  };

  const q = f.q.toLowerCase();
  // The date filter changes the four boxes and the list together.
  const inPeriod = all.filter((e) => inDateFilter(enquiryDay(e), dateF));
  const filtered = inPeriod.filter(
    (e) =>
      TILE[tile]!(e) &&
      (!f.stage || e.stage.label === f.stage) &&
      (!f.owner || e.owner === f.owner) &&
      (!f.ch || matchesCameFrom(e, f.ch)) &&
      (!q ||
        `${e.company} ${e.contact} ${e.email} ${e.items} ${e.phone}`.toLowerCase().includes(q)),
  );
  const rows = sort
    ? filtered.slice().sort((a, b) => {
        const x = SORT_VAL[sort.key](a),
          y = SORT_VAL[sort.key](b);
        return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
      })
    : filtered;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * pageSize, cur * pageSize);
  const selected = all.filter((e) => sel.has(e.id));
  const allOn = rows.length > 0 && rows.every((e) => sel.has(e.id));
  const toggle = (id: string) =>
    setSel((x) => {
      const n = new Set(x);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const count = (k: string) => inPeriod.filter(TILE[k]!).length;
  const notContacted = all.filter(TILE["Not contacted"]!);
  const wonDeals = inPeriod.filter(TILE["Won"]!);
  const wonTotal = wonDeals.reduce((a, e) => a + dealValue(e), 0);
  const tileBtn = (k: string, label: string, big: ReactNode, sub: string) => (
    <button
      key={k}
      type="button"
      onClick={() => pickTile(tile === k && k !== "All" ? "All" : k)}
      className={cn(
        "rounded-[10px] border bg-surface px-6 py-[22px] text-left transition-colors hover:border-primary",
        tile === k && k !== "All"
          ? "border-primary shadow-[inset_3px_0_0_var(--color-primary)]"
          : "border-border",
      )}
    >
      <span className="block text-[13px] text-muted-foreground">{label}</span>
      <b className="my-1.5 block font-head text-[34px] font-normal leading-none">{big}</b>
      <em className="text-[12.5px] not-italic text-muted-foreground">{sub}</em>
    </button>
  );

  const head = (key: SortKey, label: string) => (
    <SortHead
      label={label}
      on={sort?.key === key}
      dir={sort?.dir ?? 1}
      onClick={() => sortBy(key)}
    />
  );
  const columns: Column<EnquiryRow>[] = [
    {
      header: "select",
      headerNode: (
        <Check
          checked={allOn}
          disabled={!rows.length}
          onChange={() =>
            setSel((x) => {
              const n = new Set(x);
              rows.forEach((e) => (allOn ? n.delete(e.id) : n.add(e.id)));
              return n;
            })
          }
          label="Tick everyone in the list"
        />
      ),
      cell: (e) => (
        <Check
          checked={sel.has(e.id)}
          onChange={() => toggle(e.id)}
          label={`Select ${e.company}`}
        />
      ),
    },
    {
      header: "Client",
      cell: (e) => (
        <div className={cn("min-w-[150px]", e.unread && "border-l-[3px] border-primary pl-2.5")}>
          <Link
            to="/enquiries/$enquiryId"
            params={{ enquiryId: e.id }}
            className="whitespace-nowrap text-[14.5px] font-medium hover:underline hover:underline-offset-[3px]"
          >
            {e.contact}
          </Link>
          {e.unread && (
            <span className="ml-1.5 rounded-[3px] bg-primary px-1.5 py-0.5 align-[2px] text-[9.5px] tracking-[.14em] text-primary-foreground">
              NEW
            </span>
          )}
          <span className="mt-0.5 block text-[12px] text-muted-foreground">{e.company}</span>
        </div>
      ),
    },
    {
      header: "Request",
      className: "min-w-[170px]",
      cell: (e) => (
        <>
          {e.product ? (
            <div className="flex items-start gap-2.5">
              <Thumb color={e.product.color} className="size-9 rounded-lg" />
              <div>
                <b className="block font-medium">{e.product.name}</b>
                <span className="text-[12px] text-muted-foreground">
                  Product page · {e.product.sku}
                </span>
              </div>
            </div>
          ) : (
            <>
              {e.items}
              <span className="block text-[12px] text-muted-foreground">
                {e.src.manual ? "General enquiry" : "Corporate form"}
              </span>
            </>
          )}
          <span className="mt-1.5 inline-block whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {e.qty} pcs
          </span>
        </>
      ),
    },
    {
      header: "Received",
      headerNode: head("rec", "Received"),
      className: "whitespace-nowrap",
      cell: (e) => <>{e.date}</>,
    },
    { header: "Mobile", className: "whitespace-nowrap", cell: (e) => e.phone },
    { header: "Email", className: "max-w-[190px] break-words", cell: (e) => e.email },
    {
      header: "Stage",
      headerNode: head("stage", "Stage"),
      cell: (e) => (
        <>
          <StageSelect r={e} onPick={(v) => act.stageTo(e, v)} />
          {e.stage.label === "Won" && (e.order || seeValues) && (
            <small className="mt-1.5 block whitespace-nowrap text-[12px] text-good">
              {e.order}
              {e.order && seeValues && dealValue(e) ? " · " : ""}
              {seeValues && dealValue(e) ? formatMoney(dealValue(e)) : ""}
            </small>
          )}
        </>
      ),
    },
    {
      header: "Owner",
      headerNode: head("owner", "Owner"),
      cell: (e) =>
        e.owner === "Unassigned" ? (
          <span className="text-muted-foreground">Unassigned</span>
        ) : (
          e.owner
        ),
    },
  ];

  const cameFromOptions = [
    ...new Set([...CAME_FROM_EXTRA, ...all.filter((e) => !e.src.manual).map((e) => e.src.channel)]),
  ].sort((a, b) => {
    const ai = CAME_FROM_EXTRA.indexOf(a),
      bi = CAME_FROM_EXTRA.indexOf(b);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.localeCompare(b);
  });
  const drop = (
    value: string,
    onChange: (v: string) => void,
    allLabel: string,
    options: (string | { value: string; label: string; dot?: string })[],
  ) => (
    <Dropdown
      value={value}
      onChange={onChange}
      className="min-w-[130px]"
      options={[
        { value: "", label: allLabel },
        ...options.map((o) => (typeof o === "string" ? { value: o, label: o } : o)),
      ]}
    />
  );

  return (
    <div className="text-[14.5px]">
      <PageHeader
        title="Corporate enquiries"
        subtitle="Every enquiry from the website, WhatsApp or email. Set the stage by hand as the conversation moves on."
        actions={
          <>
            <Button
              onClick={() => act.exportTo(rows, "Everything in the list as it is filtered now.")}
            >
              Export
            </Button>
            <Button primary onClick={act.newEnquiry}>
              + New enquiry
            </Button>
          </>
        }
      />
      <div className="mb-[22px] grid grid-cols-2 gap-[18px] lg:grid-cols-4">
        {tileBtn("All", "Enquiries received", count("All"), "Website, WhatsApp and email")}
        {tileBtn(
          "Contacted",
          "Contacted",
          <>
            {count("Contacted")}
            <small className="ml-1 font-body text-[13px] text-muted-foreground">
              of {inPeriod.length}
            </small>
          </>,
          inPeriod.length - count("Contacted")
            ? `${inPeriod.length - count("Contacted")} still waiting for a first call`
            : "Everyone has been contacted",
        )}
        {tileBtn(
          "In progress",
          "In progress",
          count("In progress"),
          "Contacted, quoted or negotiating",
        )}
        {tileBtn(
          "Won",
          "Deals closed",
          wonDeals.length,
          seeValues ? `Confirmed as orders · ${formatMoney(wonTotal)}` : "Confirmed as orders",
        )}
      </div>

      {notContacted.length > 0 && (
        <section className="mb-6 rounded-[10px] border border-warn bg-warn-bg px-6 py-5">
          <div className="mb-3.5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <b className="block text-[16px] font-medium">
                {notContacted.length} client{notContacted.length > 1 ? "s" : ""} not contacted yet
              </b>
              <span className="text-[13px] text-muted-foreground">
                Please call or email them today — their details are below.
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {notContacted.slice(0, 2).map((e) => (
              <ContactRow key={e.id} e={e} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              pickTile("Not contacted");
              setTimeout(
                () =>
                  document
                    .getElementById("enquiries-table")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                50,
              );
            }}
            className="mt-3 text-[13px] underline underline-offset-[3px]"
          >
            Show all {notContacted.length} →
          </button>
        </section>
      )}

      <div id="enquiries-table" className="scroll-mt-4">
        <Card className="p-6">
          {tile !== "All" && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-primary px-3.5 py-2.5 text-[13px]">
              <span>
                Showing <b className="font-semibold">{rows.length}</b> {TILE_TEXT[tile]}
              </span>
              <button
                type="button"
                onClick={() => pickTile("All")}
                className="underline underline-offset-[3px]"
              >
                Show all enquiries
              </button>
            </div>
          )}
          <FilterBar>
            <SearchInput
              value={f.q}
              onChange={setFilter("q")}
              placeholder="Client, company, email or mobile"
            />
            {drop(
              f.stage,
              setFilter("stage"),
              "All stages",
              STAGES.map((s) => ({ value: s, label: s, dot: STAGE_COLOR[s] ?? "#767676" })),
            )}
            {drop(f.owner, setFilter("owner"), "All owners", [...data.owners, "Unassigned"])}
            {drop(f.ch, setFilter("ch"), "Came from · all", cameFromOptions)}
            <DateRangeFilter
              extended
              allLabel="All time"
              value={dateF}
              onChange={(v) => {
                setDateF(v);
                setSel(new Set());
                setPage(1);
              }}
            />
          </FilterBar>
          <div
            className={cn(
              "mb-3.5 flex min-h-[46px] flex-wrap items-center gap-2 rounded-lg px-4 py-3 text-[13.5px]",
              sel.size ? "bg-primary text-primary-foreground" : "bg-hover",
            )}
          >
            {sel.size ? (
              <>
                <b className="font-semibold">{sel.size} selected</b>
                <BulkButton onClick={() => act.changeStage(selected)}>Change stage</BulkButton>
                <BulkButton onClick={() => act.assign(selected)}>Assign to</BulkButton>
                <BulkButton onClick={() => act.email(selected)}>Send email</BulkButton>
                <BulkButton onClick={() => act.message(selected)}>WhatsApp / SMS</BulkButton>
                <BulkButton onClick={() => act.exportTo(selected, "The enquiries you ticked.")}>
                  Export
                </BulkButton>
                <button
                  type="button"
                  onClick={() => setSel(new Set())}
                  className="text-white/70 underline"
                >
                  Clear
                </button>
              </>
            ) : (
              <span>
                Tick enquiries to move them to a new stage together, assign them to someone, or send
                them an email or WhatsApp.
              </span>
            )}
          </div>
          <DataTable
            columns={columns}
            rows={shown}
            rowKey={(e) => e.id}
            empty="No enquiries match."
          />
          <Pager
            page={cur}
            pageSize={pageSize}
            total={rows.length}
            noun="enquiries"
            onPage={setPage}
            onPageSize={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </Card>
      </div>
      {act.dialog}
    </div>
  );
}
