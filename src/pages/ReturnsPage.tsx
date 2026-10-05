import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ordersQuery, returnsQuery } from "@/lib/api/sections.functions";
import type { Tile } from "@/lib/api/section-types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Avatar, Panel, StatusBadge } from "@/components/admin/primitives";
import { Button, Card, DataTable, Muted, PageHeader, Pager, type Column } from "@/components/admin/page";
import { applyEdit, useCreatedOrders, useOrderEdits } from "@/components/admin/OrderFlow";
import { LogReturnDialog, STAGE_HINT, TEAM_STAGES, nextReturnLabel, returnKey, useReturnActions, useReturns, type LiveReturn } from "@/components/admin/ReturnFlow";
import { soon } from "@/hooks/use-toast-lite";

const BULK: Record<string, (n: number, owner: boolean) => string> = {
  Requested: (n) => `Approve ${n} returns`,
  Approved: (n) => `Mark ${n} received`,
  Received: (n) => `Mark ${n} inspected`,
  Inspected: (n, owner) => (owner ? (n === 1 ? "Issue refund" : `Issue ${n} refunds`) : `Ask for ${n} refund${n > 1 ? "s" : ""}`),
};

function Check({ checked, onChange, label, disabled }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return <input type="checkbox" aria-label={label} checked={checked} disabled={disabled} onChange={onChange} onClick={(e) => e.stopPropagation()} className="size-4 cursor-pointer accent-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-40" />;
}
function BulkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="h-[30px] rounded-lg border border-white/35 px-3.5 text-[12px] text-white hover:border-white">{children}</button>;
}

/** Stage tiles with who owns each stage: your team, the courier, or closed. */
function StageTiles({ tiles, active, onSelect }: { tiles: Tile[]; active: string; onSelect: (k: string) => void }) {
  const groups = tiles.reduce<{ g: string; n: number }[]>((a, t) => { const g = t.group ?? ""; const last = a[a.length - 1]; if (last && last.g === g) last.n++; else a.push({ g, n: 1 }); return a; }, []);
  return (
    <>
      <div className="mb-2 hidden gap-[18px] xl:grid" style={{ gridTemplateColumns: groups.map((g) => `${g.n}fr`).join(" ") }}>
        {groups.map((g, i) => <div key={`${g.g}${i}`} className="flex items-center gap-2.5 text-[10.5px] uppercase tracking-[.2em] text-muted-foreground after:h-px after:flex-1 after:bg-border">{g.g}</div>)}
      </div>
      <div className="mb-[18px] grid grid-cols-2 gap-[18px] md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => {
          const on = active === t.key;
          return (
            <button key={t.key} type="button" onClick={() => onSelect(on ? "" : t.key)}
              className={cn("rounded-[10px] border px-4 py-3 text-left transition-colors hover:border-primary", TEAM_STAGES.includes(t.key) ? "bg-surface" : "bg-hover", on ? "border-primary ring-1 ring-primary" : "border-border")}>
              <b className="block font-head text-[22px] font-normal">{t.count}</b>
              <span className="text-[12px] text-muted-foreground">{t.label}</span>
              {t.hint && <em className="mt-1.5 block text-[11.5px] not-italic leading-snug text-muted-foreground">{t.hint}</em>}
            </button>
          );
        })}
      </div>
    </>
  );
}

export default function ReturnsPage({ logOrder }: { logOrder?: string | undefined }) {
  const { data } = useSuspenseQuery(returnsQuery());
  const { data: ordersData } = useSuspenseQuery(ordersQuery());
  const navigate = useNavigate();
  const returns = useReturns(data.rows);
  const created = useCreatedOrders();
  const oEdits = useOrderEdits();
  const orders = useMemo(() => [...created, ...ordersData.rows].map((o) => applyEdit(o, oEdits[o.id])), [created, ordersData.rows, oEdits]);
  const actions = useReturnActions();
  const [stage, setStage] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [logOpen, setLogOpen] = useState(!!logOrder);

  const tiles = data.tiles.map((t) => ({ ...t, count: returns.filter((r) => r.status.label === t.key).length }));
  const rows = returns.filter((r) => !stage || r.status.label === stage).sort((a, b) => b.id.localeCompare(a.id));
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * pageSize, cur * pageSize);

  /* Same-stage selection, like Orders. */
  const selected = returns.filter((r) => sel.has(r.id));
  const key = selected.length ? returnKey(selected[0]!) : null;
  const eligible = rows.filter((r) => returnKey(r) && (!key || returnKey(r) === key));
  const allOn = eligible.length > 0 && eligible.every((r) => sel.has(r.id));
  const canAll = !!key || !!(stage && BULK[stage]);
  const toggleSel = (r: LiveReturn) => setSel((s) => {
    const n = new Set(s);
    if (n.has(r.id)) n.delete(r.id);
    else if (returnKey(r) && (!key || returnKey(r) === key)) n.add(r.id);
    else toast("Only returns at the same stage can be handled together");
    return n;
  });
  const pickStage = (k: string) => { setStage(k); setSel(new Set()); setPage(1); };

  const refunded = returns.filter((r) => r.status.label === "Refunded");
  const kpis: [string, ReactNode][] = [
    ["Open returns", returns.filter((r) => !["Refunded", "Rejected"].includes(r.status.label)).length],
    ["Refunded this month", formatMoney(refunded.reduce((a, r) => a + (r.refund?.amount ?? r.amount), 0))],
    ["Waiting for your team", returns.filter((r) => TEAM_STAGES.includes(r.status.label) && !r.refundAsked).length],
    ["Avg. time to refund", "3.2 days"],
  ];

  const columns: Column<LiveReturn>[] = [
    { header: "select", headerNode: <Check checked={allOn} onChange={() => setSel((s) => { const n = new Set(s); eligible.forEach((r) => (allOn ? n.delete(r.id) : n.add(r.id))); return n; })} label="Tick all" disabled={!canAll || !eligible.length} />,
      cell: (r) => { const k = returnKey(r), ok = !!k && (!key || k === key); return <Check checked={sel.has(r.id)} onChange={() => toggleSel(r)} label={`Select ${r.id}`} disabled={!k || (!ok && !sel.has(r.id))} />; } },
    { header: "Return", cell: (r) => <><b className="font-medium">{r.id}</b><Muted>{r.date}</Muted></> },
    { header: "Order", cell: (r) => <Link to="/orders/$orderId" params={{ orderId: r.order }} onClick={(e) => e.stopPropagation()} className="whitespace-nowrap underline underline-offset-[3px]">{r.order}</Link> },
    { header: "Customer", cell: (r) => r.customer },
    { header: "Item", cell: (r) => <>{r.item}{r.lines.length > 1 && <Muted>+ {r.lines.length - 1} more</Muted>}</> },
    { header: "Reason", cell: (r) => <>{r.kind}<Muted>{r.reason}</Muted></> },
    { header: "Status", cell: (r) => <><StatusBadge tone={r.status.tone}>{r.status.label}</StatusBadge>{r.refundAsked && <Muted>Refund waiting for Ramy</Muted>}</> },
    { header: "Last action", cell: (r) => { const l = r.log[r.log.length - 1]; return l ? <div className="flex items-center gap-2 whitespace-nowrap text-[12.5px]"><Avatar name={l.who} /><div>{l.who}<span className="block text-[11px] text-muted-foreground">{l.when}</span></div></div> : "—"; } },
    { header: "Amount", align: "right", cell: (r) => <b className="whitespace-nowrap font-medium">{formatMoney(r.amount)}</b> },
    { header: "Next step", cell: (r) => {
      const nb = nextReturnLabel(r, actions.owner);
      if (nb) return (
        <button type="button" onClick={(e) => { e.stopPropagation(); actions.run(r); }}
          className={cn("h-[30px] whitespace-nowrap rounded-lg border px-3 text-[12px]", TEAM_STAGES.includes(r.status.label) ? "border-primary bg-primary text-primary-foreground hover:opacity-90" : "border-border bg-surface hover:border-primary")}>{nb}</button>
      );
      if (r.status.label === "Refunded") return <span className="whitespace-nowrap text-[12px] text-muted-foreground"><b className="block font-medium text-foreground">{r.refund?.ref ?? "Refunded"}</b>by {r.refund?.by ?? "—"}</span>;
      return <span className="text-[12px] text-muted-foreground">{r.refundAsked ? "Waiting for approval" : "—"}</span>;
    } },
  ];

  return (
    <>
      <PageHeader
        title="Returns & refunds"
        subtitle="All returns are handled here — approve, receive, inspect and refund. Every step is recorded with the name of the person who did it."
        actions={<><Button onClick={soon("Export")}>Export</Button><Button primary onClick={() => setLogOpen(true)}>Log a return</Button></>}
      />
      <div className="mb-[18px] grid grid-cols-2 gap-[18px] md:grid-cols-4">
        {kpis.map(([k, v]) => <div key={k} className="rounded-[10px] border border-border bg-surface px-[18px] py-3.5"><span className="block text-[12px] text-muted-foreground">{k}</span><b className="font-head text-[20px] font-medium">{v}</b></div>)}
      </div>
      <StageTiles tiles={tiles} active={stage} onSelect={pickStage} />

      <Card>
        {stage && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-primary px-3.5 py-2.5 text-[13px]">
            <span>Showing <b className="font-semibold">{rows.length} {stage}</b> return{rows.length === 1 ? "" : "s"} · {STAGE_HINT[stage]}</span>
            <button type="button" onClick={() => pickStage("")} className="underline underline-offset-[3px]">Show all returns</button>
          </div>
        )}
        <div className={cn("mb-2.5 flex min-h-[46px] flex-wrap items-center gap-2 rounded-lg px-3 py-2.5 text-[13px]", sel.size ? "bg-primary text-primary-foreground" : "bg-hover")}>
          {sel.size && key ? (
            <>
              <span><b className="font-semibold">{sel.size} selected</b><span className="ml-1.5 rounded-full border border-white/35 px-2.5 py-0.5 text-[12px]">{key}</span></span>
              <BulkButton onClick={() => { actions.bulk(selected); setSel(new Set()); }}>{BULK[key]!(sel.size, actions.owner)}</BulkButton>
              <span className="text-[12.5px] opacity-75">Only {key} returns can be added — others are greyed out</span>
              <button type="button" onClick={() => setSel(new Set())} className="text-white/70 underline">Clear</button>
            </>
          ) : <span>Tick returns to handle several at once. <b className="font-semibold">Tip:</b> click a stage tile first — then "tick all" selects every return in it.</span>}
        </div>
        <DataTable columns={columns} rows={shown} rowKey={(r) => r.id} empty="No returns match" onRowClick={(r) => navigate({ to: "/returns/$returnId", params: { returnId: r.id } })} />
        <Pager page={cur} pageSize={pageSize} total={rows.length} noun="returns" onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      </Card>

      <Panel title="Returns policy (applied automatically)" action={<button type="button" onClick={soon("Edit policy")} className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] hover:bg-hover">Edit policy</button>}>
        <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          {data.policy.map((p) => <div key={p.title}><b className="text-[13.5px] font-medium">{p.title}</b><p className="mt-1 text-[12.5px] text-muted-foreground">{p.text}</p></div>)}
        </div>
      </Panel>

      {actions.dialog}
      {logOpen && (
        <LogReturnDialog open onClose={() => setLogOpen(false)} orders={orders} returns={returns} asOf={data.asOf} initialOrder={logOrder ?? null}
          onCreated={(id) => navigate({ to: "/returns/$returnId", params: { returnId: id } })} />
      )}
    </>
  );
}
