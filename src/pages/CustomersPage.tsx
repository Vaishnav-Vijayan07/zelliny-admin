import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { customersQuery } from "@/lib/api/sections.functions";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/admin/primitives";
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
  ReachChips,
  canReach,
  useCustomerActions,
  useCustomers,
  type LiveCustomer,
} from "@/components/admin/CustomerFlow";

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
type SortKey = "name" | "city" | "orders" | "spent" | "since";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Sep 2026" → a sortable number. */
const sinceKey = (v: string) => {
  const [m, y] = v.split(" ");
  return Number(y) * 12 + MONTHS.indexOf(m ?? "");
};
const SORTS: Record<SortKey, (c: LiveCustomer) => string | number> = {
  name: (c) => c.name.toLowerCase(),
  city: (c) => c.city.toLowerCase(),
  orders: (c) => c.orders,
  spent: (c) => c.spent,
  since: (c) => sinceKey(c.since),
};

export default function CustomersPage() {
  const { data } = useSuspenseQuery(customersQuery());
  const navigate = useNavigate();
  const all = useCustomers(data.rows);
  const open = (id: string) =>
    navigate({ to: "/customers/$customerId", params: { customerId: id } });
  const act = useCustomerActions(all, open);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [lang, setLang] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "spent", dir: -1 });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const s = q.toLowerCase().trim(),
    digits = s.replace(/\D/g, "");
  const filteredRows = all.filter(
    (c) =>
      (!city || c.city === city) &&
      (!lang || c.language === lang) &&
      (!s ||
        `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(s) ||
        (digits.length >= 4 && c.phone.replace(/\D/g, "").includes(digits))),
  );
  const rows = [...filteredRows].sort((a, b) => {
    const [x, y] = [SORTS[sort.key](a), SORTS[sort.key](b)];
    return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
  });
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * pageSize, cur * pageSize);
  const selected = all.filter((c) => sel.has(c.id));
  const allOn = rows.length > 0 && rows.every((c) => sel.has(c.id));
  const toggle = (id: string) =>
    setSel((x) => {
      const n = new Set(x);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const filtered = !!(q || city || lang);

  const SortHead = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      type="button"
      onClick={() => {
        setSort((x) => ({
          key: k,
          dir: x.key === k ? (-x.dir as 1 | -1) : k === "name" || k === "city" ? 1 : -1,
        }));
        setPage(1);
      }}
      className="inline-flex items-center gap-1 uppercase hover:text-foreground"
    >
      {label}
      <span className={sort.key === k ? "text-foreground" : "opacity-40"}>
        {sort.key === k ? (sort.dir > 0 ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );

  const columns: Column<LiveCustomer>[] = [
    {
      header: "select",
      headerNode: (
        <Check
          checked={allOn}
          disabled={!rows.length}
          onChange={() =>
            setSel((x) => {
              const n = new Set(x);
              rows.forEach((c) => (allOn ? n.delete(c.id) : n.add(c.id)));
              return n;
            })
          }
          label="Tick everyone in the list"
        />
      ),
      cell: (c) => (
        <Check checked={sel.has(c.id)} onChange={() => toggle(c.id)} label={`Select ${c.name}`} />
      ),
    },
    {
      header: "Customer",
      headerNode: <SortHead k="name" label="Customer" />,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.name} className="size-[34px] text-[12px]" />
          <div>
            <b
              role="link"
              tabIndex={0}
              onClick={() => open(c.id)}
              onKeyDown={(e) => e.key === "Enter" && open(c.id)}
              className="cursor-pointer font-medium underline-offset-[3px] hover:underline"
            >
              {c.name}
            </b>
            <div className="text-[12px] text-muted-foreground">
              {c.email || <span className="text-warn">No email on file</span>}
            </div>
          </div>
        </div>
      ),
    },
    { header: "Mobile", className: "whitespace-nowrap", cell: (c) => c.phone },
    { header: "City", headerNode: <SortHead k="city" label="City" />, cell: (c) => c.city },
    {
      header: "Orders",
      headerNode: <SortHead k="orders" label="Orders" />,
      align: "right",
      cell: (c) => c.orders,
    },
    {
      header: "Total spent",
      headerNode: <SortHead k="spent" label="Total spent" />,
      align: "right",
      cell: (c) => <span className="whitespace-nowrap">{formatMoney(c.spent)}</span>,
    },
    {
      header: "Since",
      headerNode: <SortHead k="since" label="Since" />,
      className: "whitespace-nowrap",
      cell: (c) => c.since,
    },
    // { header: "Can contact by", cell: (c) => <ReachChips c={c} /> },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${formatNumber(rows.length)} shown of ${formatNumber(data.totalAccounts)} accounts`}
        actions={
          <>
            <Button
              onClick={() =>
                act.exportTo(
                  rows,
                  filtered
                    ? "Everyone in the list as it is filtered now."
                    : "All customers in the list.",
                )
              }
            >
              Export
            </Button>
            <Button primary onClick={() => act.form(null)}>
              + Add customer
            </Button>
          </>
        }
      />
      <Card>
        <FilterBar>
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Name, email or mobile"
          />
          <FilterSelect
            value={city}
            onChange={(v) => {
              setCity(v);
              setPage(1);
            }}
            all="All cities"
            options={[...new Set(all.map((c) => c.city))].sort()}
          />
          <FilterSelect
            value={lang}
            onChange={(v) => {
              setLang(v);
              setPage(1);
            }}
            all="All languages"
            options={["English", "Arabic"]}
          />
        </FilterBar>
        <div
          className={cn(
            "mb-2.5 flex min-h-[46px] flex-wrap items-center gap-2 rounded-lg px-3 py-2.5 text-[13px]",
            sel.size ? "bg-primary text-primary-foreground" : "bg-hover",
          )}
        >
          {sel.size ? (
            <>
              <span>
                <b className="font-semibold">{sel.size} selected</b>
                <span className="ml-2 text-[12px] opacity-75">
                  {selected.filter((c) => canReach(c, "Email")).length} can get email ·{" "}
                  {selected.filter((c) => canReach(c, "WhatsApp")).length} can get WhatsApp
                </span>
              </span>
              <BulkButton onClick={() => act.send(selected, "WhatsApp")}>WhatsApp</BulkButton>
              <BulkButton onClick={() => act.send(selected, "Email")}>Email</BulkButton>
              <BulkButton onClick={() => act.send(selected, "SMS")}>SMS</BulkButton>
              <BulkButton onClick={() => act.exportTo(selected, "The customers you ticked.")}>
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
              Tick customers to export them to Excel, or to send them an email, WhatsApp or SMS
              together. The box at the top ticks everyone in the list below.
            </span>
          )}
        </div>
        <DataTable
          columns={columns}
          rows={shown}
          rowKey={(c) => c.id}
          empty="No customer matches — check the spelling, or search by mobile number."
        />
        <Pager
          page={cur}
          pageSize={pageSize}
          total={rows.length}
          noun="customers"
          onPage={setPage}
          onPageSize={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </Card>
      {act.dialog}
    </>
  );
}
