import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Toggle } from "@/components/admin/primitives";
import { Button, Card, DataTable, Muted, PageHeader, type Column } from "@/components/admin/page";
import { TYPES, placeLabel, toggleScript, useScripts, type Script } from "@/components/admin/ScriptsFlow";

export const ScriptLogo = ({ type }: { type: string }) => {
  const [bg, t] = TYPES[type] ?? TYPES["Custom script"]!;
  return <span className="grid size-7 flex-none place-items-center rounded-[7px] text-[11px] font-semibold text-white" style={{ background: bg }}>{t}</span>;
};

export default function ScriptsPage() {
  const scripts = useScripts();
  const navigate = useNavigate();
  const live = scripts.filter((s) => s.on).length;

  const columns: Column<Script>[] = [
    { header: "Script", cell: (s) => <div className="flex items-center gap-2.5"><ScriptLogo type={s.type} /><div><b className="font-medium">{s.name}</b><Muted>{s.type}</Muted></div></div> },
    { header: "Where on the page", cell: (s) => <span className="rounded border border-dashed border-border px-2 py-0.5 font-mono text-[12px]">{placeLabel(s.place)}</span> },
    { header: "Pages", cell: (s) => s.pages },
    { header: "Cookie consent", cell: (s) => (s.consent ? <span className="text-good">✓ Waits for consent</span> : <span className="text-warn">Runs straight away</span>) },
    { header: "Last change", cell: (s) => <>{s.versions[0]!.v} · {s.versions[0]!.when.split(",")[0]}<Muted>{s.versions[0]!.by}</Muted></> },
    { header: "Live", align: "right", cell: (s) => <span onClick={(e) => e.stopPropagation()}><Toggle on={s.on} onChange={() => { toggleScript(s.id); toast(s.on ? `${s.name} removed from the site` : `${s.name} is live on the site within a minute`); }} label={s.name} /></span> },
  ];

  return (
    <>
      <PageHeader title="Tracking & scripts" subtitle="Meta, Google, TikTok, LinkedIn and any other code for the website — added, changed or switched off here. It goes live within a minute, no developer needed." actions={<Link to="/scripts/new"><Button primary>+ Add script</Button></Link>} />
      <div className="mb-[18px] flex items-start gap-3.5 rounded-lg border border-l-[3px] border-border border-l-primary bg-surface px-4 py-3.5 text-[13px] leading-relaxed">
        <span className="text-[16px]">🔒</span>
        <div><b className="font-medium">Only the owner can open this page.</b> A script runs on every page it's placed on. Paste only code that comes from Meta, Google, TikTok, LinkedIn or a developer you trust. Card payments happen on Paymob's page, so no script here ever sees card numbers.</div>
      </div>
      <div className="mb-[18px] grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {[["Scripts", scripts.length], ["Live on the site", live], ["Switched off", scripts.length - live], ["Last change", "24 Sep · Ramy"]].map(([l, v]) => (
          <div key={l} className="rounded-[10px] border border-border bg-surface px-[18px] py-3.5"><span className="block text-[12px] text-muted-foreground">{l}</span><b className="font-head text-[20px] font-medium">{v}</b></div>
        ))}
      </div>
      <Card>
        <DataTable columns={columns} rows={scripts} rowKey={(s) => s.id} empty="No scripts yet" onRowClick={(s) => navigate({ to: "/scripts/$scriptId", params: { scriptId: s.id } })} />
        <p className="mt-3 text-[12px] text-muted-foreground">Click a script to edit its code, where it goes and which pages it runs on. Every save keeps the previous version, so you can go back in one click.</p>
      </Card>
    </>
  );
}
