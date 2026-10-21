import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/hooks/use-session";
import { Toggle } from "@/components/admin/primitives";
import { Button } from "@/components/admin/page";
import { SearchSelect } from "@/components/admin/SearchSelect";
import { StickyCol } from "@/components/admin/StickyCol";
import { useDone } from "@/components/admin/SiteContentUi";
import {
  ORDER_VALUES,
  PAGES,
  PLACES,
  SNIPPETS,
  TYPES,
  addScript,
  consentByDefault,
  deleteScript,
  looksLikeScript,
  restoreVersion,
  saveScript,
  useScripts,
  type Place,
} from "@/components/admin/ScriptsFlow";
import { LiveDialog, ScriptLogo, alertNote } from "@/pages/ScriptsPage";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
const redBtn = "h-9 rounded-lg bg-bad px-4 text-[13.5px] text-white";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-[18px] min-w-0 rounded-[10px] border border-border bg-surface px-5 pb-5 pt-4">
      <h3 className="mb-3 text-[15px]">{title}</h3>
      {children}
    </section>
  );
}

const Skeleton = ({ place, on }: { place: Place; on: boolean }) => {
  const cell = (k: Place | null, t: string) => (
    <div
      className={cn(
        "rounded px-1.5 py-1",
        k && k === place && on ? "bg-primary text-primary-foreground" : "bg-muted",
      )}
    >
      {t}
    </div>
  );
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border p-1.5 font-mono text-[10px] text-muted-foreground">
      {cell("head", "<head>")}
      {cell("bodyStart", "<body> start")}
      <div className="h-[26px] rounded bg-muted px-1.5 py-1">page</div>
      {cell("bodyEnd", "</body> end")}
    </div>
  );
};

export default function ScriptEditPage({ scriptId }: { scriptId?: string | undefined }) {
  const scripts = useScripts();
  const navigate = useNavigate();
  const me = useSessionUser()?.name ?? "Owner";
  const s = scriptId ? scripts.find((x) => x.id === scriptId) : undefined;
  const isNew = !scriptId;
  const [doneNode, done] = useDone();
  const codeRef = useRef<HTMLTextAreaElement>(null);

  const [name, setName] = useState(s?.name ?? "");
  const [type, setType] = useState(s?.type ?? "Meta Pixel");
  const [code, setCode] = useState(s?.code ?? SNIPPETS["Meta Pixel"]!);
  const [place, setPlace] = useState<Place>(s?.place ?? "head");
  const [pages, setPages] = useState(s?.pages ?? "All pages");
  const [consent, setConsent] = useState(s?.consent ?? true);
  const [nameErr, setNameErr] = useState("");
  const [badCode, setBadCode] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [askLive, setAskLive] = useState(false);
  const [restore, setRestore] = useState<number | null>(null);

  if (!isNew && !s)
    return <p className="py-24 text-center text-muted-foreground">This script was not found.</p>;

  const changeType = (t: string) => {
    setType(t);
    setConsent(consentByDefault(t));
    if (isNew) setCode(SNIPPETS[t] ?? "");
  };
  const insert = (key: string) => {
    const el = codeRef.current;
    const tag = `{{${key}}}`;
    if (!el) return setCode(code + tag);
    const a = el.selectionStart ?? code.length;
    const b = el.selectionEnd ?? a;
    setCode(code.slice(0, a) + tag + code.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + tag.length, a + tag.length);
    });
  };
  const save = () => {
    if (!name.trim()) return setNameErr("Give the script a name first.");
    setNameErr("");
    if (!looksLikeScript(code)) return setBadCode(true);
    const fields = { name: name.trim(), type, place, pages, consent, code };
    if (isNew) {
      addScript({ ...fields, on: true }, me);
      navigate({ to: "/scripts" });
      done("Script added", `${fields.name} is live on the site.`, alertNote());
      return;
    }
    const changed = code !== s!.code;
    saveScript(s!.id, fields, me);
    done(
      "Saved",
      changed
        ? `Saved as v${s!.versions.length + 1}. v${s!.versions.length} is kept under Versions.${s!.on ? "" : " It is still switched off."}`
        : "Your changes are saved.",
      alertNote(),
    );
  };

  return (
    <>
      <div className="mb-[22px]">
        <div className="mb-2 text-[12px] text-muted-foreground">
          <Link to="/scripts" className="underline underline-offset-[3px]">
            Tracking & scripts
          </Link>{" "}
          / {s?.name ?? "New"}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight">{isNew ? "Add script" : s!.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {isNew ? (
                "Paste the code, choose where it goes, save."
              ) : (
                <>
                  {s!.type} ·{" "}
                  {s!.on ? (
                    <span className="text-good">● Live on the site</span>
                  ) : (
                    <span>○ Switched off</span>
                  )}{" "}
                  · {s!.versions[0]!.v}
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button primary onClick={save}>
              {isNew ? "Save & switch on" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
      <div className="grid items-stretch gap-[18px] min-[981px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Card title="Name & type">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
                Name — so you know what it is later
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameErr("");
                  }}
                  placeholder="e.g. Meta Pixel — Ramadan campaign"
                  className={cn(inputCls, nameErr && "border-bad")}
                />
                {nameErr && <span className="text-[12.5px] text-bad">{nameErr}</span>}
              </label>
              <div className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
                Type
                <SearchSelect
                  value={type}
                  items={Object.keys(TYPES).map((t) => ({ value: t, label: t }))}
                  onChange={(v) => v && changeType(v)}
                  searchable={false}
                  className="text-[14px]"
                />
              </div>
            </div>
          </Card>
          <Card title="The code">
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
              Paste exactly what{" "}
              {type === "Custom script" ? "you were given" : `${type.split(" ")[0]} gives you`}
              <textarea
                ref={codeRef}
                rows={11}
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full resize-y rounded-lg border border-border bg-[#fafafa] px-3 py-2.5 font-mono text-[12.5px] leading-[1.55] outline-none focus:border-primary"
              />
            </label>
            <p className="mt-2 text-[12px] text-muted-foreground">
              Must start with &lt;script&gt;, &lt;noscript&gt; or &lt;!-- . Saving checks it before
              anything goes live.
            </p>
            {type === "Custom script" && (
              <div className="mt-3.5">
                <div className="mb-2 text-[12px] text-muted-foreground">
                  Order values you can insert — click to add at the cursor
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ORDER_VALUES.map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => insert(k)}
                      className="h-8 rounded-full border border-border bg-surface px-3 text-[12.5px] hover:border-primary"
                    >
                      {l}{" "}
                      <code className="ml-1 text-[11px] text-muted-foreground">{`{{${k}}}`}</code>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[12px] text-muted-foreground">
                  Filled in with the real values on the order confirmation page. Use them with Order
                  confirmation only.
                </p>
              </div>
            )}
          </Card>
          <Card title="Where on the page">
            <div className="grid gap-3 lg:grid-cols-3">
              {PLACES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPlace(p.key)}
                  className={cn(
                    "rounded-[10px] border bg-surface p-3 text-left",
                    place === p.key ? "border-primary shadow-[0_0_0_1px_#0a0a0a]" : "border-border",
                  )}
                >
                  <Skeleton place={p.key} on />
                  <b className="mt-2.5 block text-[13px] font-medium">{p.label}</b>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
                    {p.hint}
                  </span>
                </button>
              ))}
            </div>
          </Card>
          <Card title="Which pages">
            <div className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
              Runs on
              <SearchSelect
                value={pages}
                items={PAGES.map((p) => ({ value: p, label: p }))}
                onChange={(v) => v && setPages(v)}
                searchable={false}
                className="text-[14px]"
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-line-soft pt-3.5">
              <div>
                <div className="text-[13.5px]">Wait for cookie consent</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  Runs only after the visitor presses Accept on the cookie box. On for Meta, Google,
                  TikTok and LinkedIn.
                </div>
              </div>
              <Toggle
                on={consent}
                onChange={() => setConsent(!consent)}
                label="Wait for cookie consent"
              />
            </div>
          </Card>
        </div>
        <StickyCol>
          {isNew ? (
            <Card title="Before you save">
              <p className="text-[12.5px] text-muted-foreground">
                "Save & switch on" puts it live on the site within a minute. It is saved as v1 and
                appears in the list.
              </p>
            </Card>
          ) : (
            <>
              <Card title="Live on the site">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[13.5px]">
                    {s!.on ? `On — running on ${s!.pages.toLowerCase()}` : "Off — not running"}
                    <small className="mt-0.5 block text-[12px] text-muted-foreground">
                      Saving never switches it on or off — only this switch does.
                    </small>
                  </div>
                  <Toggle on={s!.on} onChange={() => setAskLive(true)} label="Live on the site" />
                </div>
              </Card>
              <Card title="Versions">
                {s!.versions.map((v, k) => (
                  <div
                    key={v.v}
                    className="flex items-center justify-between border-t border-line-soft py-2.5 text-[13.5px] first:border-0 first:pt-0"
                  >
                    <div>
                      <b className="block font-medium">
                        {v.v}
                        {k === 0 ? " · current" : ""}
                      </b>
                      <small className="text-[12px] text-muted-foreground">
                        {v.when.split(",")[0]} · {v.by}
                      </small>
                    </div>
                    {k > 0 && (
                      <button
                        type="button"
                        className="text-[12.5px] underline underline-offset-[3px]"
                        onClick={() => setRestore(k)}
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
                <p className="mt-2 text-[12px] text-muted-foreground">
                  Restoring copies that code back as a new version. Nothing is lost.
                </p>
              </Card>
              <section className="rounded-[10px] border border-bad-bg bg-surface px-5 pb-5 pt-4">
                <h3 className="mb-3 text-[15px] text-bad">Remove</h3>
                <p className="mb-3 text-[13px]">
                  Takes it off the site straight away. The history stays in the Activity log.
                </p>
                <Button className="w-full" onClick={() => setAskDelete(true)}>
                  Delete script
                </Button>
              </section>
            </>
          )}
        </StickyCol>
      </div>

      {s && askLive && <LiveDialog script={s} onClose={() => setAskLive(false)} done={done} />}

      <Dialog open={badCode} onOpenChange={setBadCode}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              This code can't be saved
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            It must start with &lt;script&gt;, &lt;noscript&gt; or &lt;!-- . Copy the code again
            exactly as{" "}
            {type === "Custom script" ? "you were given it" : `${type.split(" ")[0]} gives it`} and
            paste it in full.
          </p>
          <DialogFooter>
            <Button primary onClick={() => setBadCode(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={restore !== null} onOpenChange={(o) => !o && setRestore(null)}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Restore {restore !== null ? s!.versions[restore]?.v : ""}?
            </DialogTitle>
          </DialogHeader>
          {restore !== null && (
            <p className="text-[13.5px]">
              The code from {s!.versions[restore]?.when.split(",")[0]} becomes the current version
              (v
              {s!.versions.length + 1}).{" "}
              {s!.on ? "It goes live within a minute." : "The script stays switched off."} Today's
              version is kept, so you can come back to it.
            </p>
          )}
          <DialogFooter>
            <Button onClick={() => setRestore(null)}>Cancel</Button>
            <Button
              primary
              onClick={() => {
                if (restore === null || !s) return;
                const old = s.versions[restore]!;
                restoreVersion(s.id, restore, me);
                setCode(old.code);
                setRestore(null);
                done(
                  "Version restored",
                  `${old.v} is back as v${s.versions.length + 1}.`,
                  alertNote(),
                );
              }}
            >
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={askDelete} onOpenChange={setAskDelete}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 font-head text-[18px] font-normal">
              {s && <ScriptLogo type={s.type} />}Delete {s?.name}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[14px]">It comes off every page of the site straight away.</p>
          <p className="text-[13px] text-muted-foreground">
            To stop it for a while, switch it off instead — the code stays saved.
          </p>
          <DialogFooter>
            <Button onClick={() => setAskDelete(false)}>Cancel</Button>
            <button
              type="button"
              className={redBtn}
              onClick={() => {
                if (!s) return;
                deleteScript(s.id);
                setAskDelete(false);
                navigate({ to: "/scripts" });
                done(
                  "Script deleted",
                  `${s.name} is off the site. The history stays in the Activity log.`,
                  alertNote(),
                );
              }}
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {doneNode}
    </>
  );
}
