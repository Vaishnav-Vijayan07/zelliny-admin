import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/hooks/use-session";
import { Toggle } from "@/components/admin/primitives";
import { Button } from "@/components/admin/page";
import { PAGES, PLACES, SNIPPETS, TYPES, addScript, deleteScript, looksLikeScript, restoreVersion, saveScript, useScripts, type Place } from "@/components/admin/ScriptsFlow";
import { ScriptLogo } from "@/pages/ScriptsPage";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const inputCls = "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mb-[18px] min-w-0 rounded-[10px] border border-border bg-surface px-5 pb-5 pt-4"><h3 className="mb-3 text-[15px]">{title}</h3>{children}</section>;
}

const Skeleton = ({ place, on }: { place: Place; on: boolean }) => {
  const cell = (k: Place | null, t: string) => <div className={cn("rounded px-1.5 py-1", k && k === place && on ? "bg-primary text-primary-foreground" : "bg-muted")}>{t}</div>;
  return <div className="flex flex-col gap-1 rounded-md border border-border p-1.5 font-mono text-[10px] text-muted-foreground">{cell("head", "<head>")}{cell("bodyStart", "<body> start")}<div className="h-[26px] rounded bg-muted px-1.5 py-1">page</div>{cell("bodyEnd", "</body> end")}</div>;
};

export default function ScriptEditPage({ scriptId }: { scriptId?: string | undefined }) {
  const scripts = useScripts();
  const navigate = useNavigate();
  const me = useSessionUser()?.name ?? "Owner";
  const s = scriptId ? scripts.find((x) => x.id === scriptId) : undefined;
  const isNew = !scriptId;

  const [name, setName] = useState(s?.name ?? "");
  const [type, setType] = useState(s?.type ?? "Meta Pixel");
  const [code, setCode] = useState(s?.code ?? SNIPPETS["Meta Pixel"]!);
  const [place, setPlace] = useState<Place>(s?.place ?? "head");
  const [pages, setPages] = useState(s?.pages ?? "All pages");
  const [consent, setConsent] = useState(s?.consent ?? true);
  const [err, setErr] = useState("");
  const [askDelete, setAskDelete] = useState(false);

  if (!isNew && !s) return <p className="py-24 text-center text-muted-foreground">This script was not found.</p>;

  const changeType = (t: string) => { setType(t); if (isNew) setCode(SNIPPETS[t] ?? ""); };
  const save = () => {
    if (!name.trim()) { setErr("Give the script a name first."); return; }
    if (!looksLikeScript(code)) { setErr("This doesn't look like a script — it should start with <script>, <noscript> or <!--."); return; }
    setErr("");
    const fields = { name: name.trim(), type, place, pages, consent, code, on: true };
    if (isNew) {
      addScript(fields, me);
      toast(`${fields.name} saved · live on the site within a minute`);
      navigate({ to: "/scripts" });
      return;
    }
    saveScript(s!.id, fields, me);
    toast(`Saved as v${s!.versions.length + 1} · the previous version is kept`);
  };

  return (
    <>
      <div className="mb-[22px]">
        <div className="mb-2 text-[12px] text-muted-foreground"><Link to="/scripts" className="underline underline-offset-[3px]">Tracking & scripts</Link> / {s?.name ?? "New"}</div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight">{isNew ? "Add script" : s!.name}</h1>
            <p className="mt-1 text-muted-foreground">{isNew ? "Paste the code, choose where it goes, save." : <>{s!.type} · {s!.on ? <span className="text-good">● Live on the site</span> : <span>○ Switched off</span>} · {s!.versions[0]!.v}</>}</p>
          </div>
          <div className="flex gap-2">{!isNew && <Button onClick={() => toast("Opens the site with this script loaded")}>Preview the site with this script</Button>}<Button primary onClick={save}>{isNew ? "Save & switch on" : "Save changes"}</Button></div>
        </div>
      </div>
      <div className="grid items-start gap-[18px] min-[981px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Card title="Name & type">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">Name — so you know what it is later<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Meta Pixel — Ramadan campaign" className={inputCls} /></label>
              <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">Type<select value={type} onChange={(e) => changeType(e.target.value)} className={cn(inputCls, "cursor-pointer")}>{Object.keys(TYPES).map((t) => <option key={t}>{t}</option>)}</select></label>
            </div>
          </Card>
          <Card title="The code">
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">Paste exactly what {type === "Custom script" ? "you were given" : `${type.split(" ")[0]} gives you`}
              <textarea rows={11} spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} className="w-full resize-y rounded-lg border border-border bg-[#fafafa] px-3 py-2.5 font-mono text-[12.5px] leading-[1.55] outline-none focus:border-primary" />
            </label>
            <p className="mt-2 text-[12px] text-muted-foreground">Must start with &lt;script&gt;, &lt;noscript&gt; or &lt;!-- . Saving checks it before anything goes live.</p>
            {err && <p className="mt-1.5 text-[12.5px] text-bad">{err}</p>}
          </Card>
          <Card title="Where on the page">
            <div className="grid gap-3 lg:grid-cols-3">
              {PLACES.map((p) => (
                <button key={p.key} type="button" onClick={() => setPlace(p.key)} className={cn("rounded-[10px] border bg-surface p-3 text-left", place === p.key ? "border-primary shadow-[0_0_0_1px_#0a0a0a]" : "border-border")}>
                  <Skeleton place={p.key} on />
                  <b className="mt-2.5 block text-[13px] font-medium">{p.label}</b><span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">{p.hint}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card title="Which pages">
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">Runs on<select value={pages} onChange={(e) => setPages(e.target.value)} className={cn(inputCls, "cursor-pointer")}>{PAGES.map((p) => <option key={p}>{p}</option>)}</select></label>
            <div className="mt-3 flex items-center justify-between gap-3.5">
              <div><div className="text-[13.5px]">Wait until the visitor accepts cookies</div><div className="mt-0.5 text-[12px] text-muted-foreground">Required for marketing pixels under Egypt's data protection law. Leave on unless a developer tells you otherwise.</div></div>
              <Toggle on={consent} onChange={() => setConsent(!consent)} label="Wait for cookie consent" />
            </div>
          </Card>
        </div>
        <div className="min-w-0">
          <Card title="Version history">
            {isNew ? <p className="text-[13px] text-muted-foreground">Starts when you save.</p> : s!.versions.map((v, k) => (
              <div key={v.v + k} className="flex items-center gap-3 border-b border-line-soft py-2.5 text-[13px] last:border-b-0">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">{v.v}</span>
                <div className="min-w-0 flex-1"><b className="font-medium">{v.note}</b><div className="text-[12px] text-muted-foreground">{v.by} · {v.when}</div></div>
                {k ? <button type="button" className="text-[12.5px] underline underline-offset-2" onClick={() => { restoreVersion(s!.id, k, me); toast(`${v.v} restored · live within a minute`); }}>Restore</button> : <span className="text-[12px] text-muted-foreground">Live</span>}
              </div>
            ))}
          </Card>
          {!isNew && (
            <section className="rounded-[10px] border border-bad-bg bg-surface px-5 pb-5 pt-4">
              <h3 className="mb-3 text-[15px] text-bad">Remove</h3>
              <p className="mb-3 text-[13px]">Takes it off the site straight away. The history stays in the Activity log.</p>
              <Button onClick={() => setAskDelete(true)}>Delete script</Button>
            </section>
          )}
        </div>
      </div>
      <Dialog open={askDelete} onOpenChange={setAskDelete}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2.5 font-head text-[18px] font-normal">{s && <ScriptLogo type={s.type} />}Delete {s?.name}?</DialogTitle></DialogHeader>
          <p className="text-[14px]">It comes off every page of the site straight away.</p>
          <DialogFooter><Button onClick={() => setAskDelete(false)}>Cancel</Button><Button primary onClick={() => { if (s) { deleteScript(s.id); toast(`${s.name} deleted`); } navigate({ to: "/scripts" }); }}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
