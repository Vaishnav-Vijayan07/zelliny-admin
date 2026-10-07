import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { enquiriesQuery } from "@/lib/api/sections.functions";
import type { EnquiryRow } from "@/lib/api/section-types";
import { cn } from "@/lib/utils";
import {
  Button,
  Card,
  DataTable,
  FilterBar,
  FilterSelect,
  PageHeader,
  Pager,
  SearchInput,
  type Column,
} from "@/components/admin/page";
import {
  STAGES,
  StageSelect,
  useEnquiries,
  useEnquiryActions,
} from "@/components/admin/EnquiryFlow";

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

export default function EnquiriesPage() {
  const { data } = useSuspenseQuery(enquiriesQuery());
  const navigate = useNavigate();
  const all = useEnquiries(data.rows);
  const open = (id: string) => navigate({ to: "/enquiries/$enquiryId", params: { enquiryId: id } });
  const act = useEnquiryActions(all, data.owners, data.products, open);
  const [tile, setTile] = useState("All");
  const [f, setF] = useState({ q: "", stage: "", owner: "", ch: "" });
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

  const q = f.q.toLowerCase();
  const rows = all.filter(
    (e) =>
      TILE[tile]!(e) &&
      (!f.stage || e.stage.label === f.stage) &&
      (!f.owner || e.owner === f.owner) &&
      (!f.ch || e.src.channel === f.ch) &&
      (!q ||
        `${e.company} ${e.contact} ${e.email} ${e.items} ${e.phone}`.toLowerCase().includes(q)),
  );
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

  const count = (k: string) => all.filter(TILE[k]!).length;
  const notContacted = all.filter(TILE["Not contacted"]!);
  const lost = all.filter((e) => e.stage.label === "Lost").length;
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
          <b className="whitespace-nowrap text-[14.5px] font-medium">{e.contact}</b>
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
          {e.items}
          <br />
          <span className="mt-1 inline-block whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {e.qty} pcs
          </span>
        </>
      ),
    },
    {
      header: "Received",
      className: "whitespace-nowrap",
      cell: (e) => <>{e.date}</>,
    },
    { header: "Mobile", className: "whitespace-nowrap", cell: (e) => e.phone },
    { header: "Email", className: "max-w-[190px] break-words", cell: (e) => e.email },
    { header: "Stage", cell: (e) => <StageSelect r={e} who={act.me} /> },
    {
      header: "Owner",
      cell: (e) =>
        e.owner === "Unassigned" ? (
          <span className="text-muted-foreground">Unassigned</span>
        ) : (
          e.owner
        ),
    },
  ];

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
              of {all.length}
            </small>
          </>,
          notContacted.length
            ? `${notContacted.length} still waiting for a first call`
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
          count("Won"),
          `Confirmed as orders${lost ? ` · ${lost} lost` : ""}`,
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
            <button
              type="button"
              onClick={() => pickTile("Not contacted")}
              className="whitespace-nowrap text-[13px] underline underline-offset-[3px]"
            >
              Show only these in the list →
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {notContacted.map((e) => (
              <div
                key={e.id}
                className="grid items-center gap-[18px] rounded-lg border border-border bg-surface px-[18px] py-3.5 md:grid-cols-[1.2fr_1fr_1.4fr_1fr_auto]"
              >
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
            ))}
          </div>
        </section>
      )}

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
          <FilterSelect
            value={f.stage}
            onChange={setFilter("stage")}
            all="All stages"
            options={STAGES}
          />
          <FilterSelect
            value={f.owner}
            onChange={setFilter("owner")}
            all="All owners"
            options={[...data.owners, "Unassigned"]}
          />
          <FilterSelect
            value={f.ch}
            onChange={setFilter("ch")}
            all="Came from · all"
            options={[...new Set(all.map((e) => e.src.channel))].sort()}
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
          onRowClick={(e) => open(e.id)}
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
      {act.dialog}
    </div>
  );
}
