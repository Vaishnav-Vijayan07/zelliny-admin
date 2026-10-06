// Inline editor for several email addresses: type and press Enter / comma to add, click a chip to edit it in place.
import { useState } from "react";
import { cn } from "@/lib/utils";

const valid = (s: string) => /^\S+@\S+\.\S+$/.test(s);

export function EmailListEditor({ value, onChange, placeholder = "Add an email and press Enter" }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ i: number; text: string } | null>(null);
  const [error, setError] = useState("");

  const addMany = (raw: string) => {
    const parts = raw.split(/[\s,;]+/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    const bad: string[] = [];
    parts.forEach((p) => {
      if (!valid(p)) bad.push(p);
      else if (!next.some((e) => e.toLowerCase() === p.toLowerCase())) next.push(p);
    });
    onChange(next);
    setError(bad.length ? `Not a valid email: ${bad.join(", ")}` : "");
    setDraft(bad.join(", "));
  };
  const commitEdit = () => {
    if (!editing) return;
    const t = editing.text.trim();
    if (!t) { onChange(value.filter((_, k) => k !== editing.i)); setEditing(null); setError(""); return; }
    if (!valid(t)) { setError(`“${t}” is not a valid email`); return; }
    if (value.some((e, k) => k !== editing.i && e.toLowerCase() === t.toLowerCase())) { setError(`${t} is already in the list`); return; }
    onChange(value.map((e, k) => (k === editing.i ? t : e)));
    setEditing(null);
    setError("");
  };

  return (
    <div>
      <div className="flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 focus-within:border-primary">
        {value.map((e, i) => editing?.i === i ? (
          <input key={i} autoFocus value={editing.text} onChange={(ev) => setEditing({ i, text: ev.target.value })} onBlur={commitEdit}
            onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); commitEdit(); } if (ev.key === "Escape") { setEditing(null); setError(""); } }}
            className="h-7 w-[220px] rounded-full border border-primary bg-surface px-3 text-[12.5px] outline-none" />
        ) : (
          <span key={e} className="inline-flex items-center gap-1.5 rounded-full bg-muted py-1 pl-3 pr-2 text-[12.5px]">
            <button type="button" title="Click to edit" onClick={() => { setEditing({ i, text: e }); setError(""); }} className="hover:underline">{e}</button>
            <button type="button" aria-label={`Remove ${e}`} onClick={() => onChange(value.filter((_, k) => k !== i))} className="text-muted-foreground hover:text-bad">✕</button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(ev) => { setDraft(ev.target.value); setError(""); }}
          onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === "," || ev.key === ";" || ev.key === " ") { if (draft.trim()) { ev.preventDefault(); addMany(draft); } } if (ev.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1)); }}
          onBlur={() => draft.trim() && addMany(draft)}
          onPaste={(ev) => { const t = ev.clipboardData.getData("text"); if (/[\s,;]/.test(t.trim())) { ev.preventDefault(); addMany(t); } }}
          placeholder={value.length ? "Add another…" : placeholder}
          className="h-7 min-w-[150px] flex-1 bg-transparent px-1 text-[13px] outline-none"
        />
      </div>
      <p className={cn("mt-1 text-[12px]", error ? "text-bad" : "text-muted-foreground")}>{error || (value.length ? `${value.length} recipient${value.length === 1 ? "" : "s"} · click an email to edit, ✕ to remove` : "No recipients yet — nobody will be emailed")}</p>
    </div>
  );
}
