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
export default function CustomersPage() {
  const { data } = useSuspenseQuery(customersQuery());
  const navigate = useNavigate();
  const all = useCustomers(data.rows);
  const open = (id: string) =>
    navigate({ to: "/customers/$customerId", params: { customerId: id } });
  const act = useCustomerActions(all, open);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const s = q.toLowerCase().trim(),
    digits = s.replace(/\D/g, "");
  const rows = all.filter(
    (c) =>
      (!city || c.city === city) &&
      (!s ||
        `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(s) ||
        (digits.length >= 4 && c.phone.replace(/\D/g, "").includes(digits))),
  );
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
  const filtered = !!(q || city);

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
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.name} className="size-[34px] text-[12px]" />
          <div>
            <b className="font-medium">{c.name}</b>
            <div className="text-[12px] text-muted-foreground">
              {c.email || <span className="text-warn">No email on file</span>}
            </div>
          </div>
        </div>
      ),
    },
    { header: "Mobile", className: "whitespace-nowrap", cell: (c) => c.phone },
    { header: "City", cell: (c) => c.city },
    { header: "Orders", align: "right", cell: (c) => c.orders },
    {
      header: "Total spent",
      align: "right",
      cell: (c) => <span className="whitespace-nowrap">{formatMoney(c.spent)}</span>,
    },
    { header: "Since", className: "whitespace-nowrap", cell: (c) => c.since },
    { header: "Can contact by", cell: (c) => <ReachChips c={c} /> },
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
              <BulkButton onClick={() => act.exportTo(selected, "The customers you ticked.")}>
                Export to Excel
              </BulkButton>
              <BulkButton onClick={() => act.email(selected)}>Send email</BulkButton>
              <BulkButton onClick={() => act.message(selected)}>WhatsApp / SMS</BulkButton>
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
          onRowClick={(c) => open(c.id)}
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
