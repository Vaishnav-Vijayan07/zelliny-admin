// Shared pieces for the Site content editors: English / Arabic fields, images, links, schedule,
// rich text, SEO preview, drag lists and the centred confirmation window.
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/admin/page";
import { DateField } from "@/components/admin/DateField";
import { Dropdown } from "@/components/admin/Dropdown";
import {
  PAGE_LINKS,
  reorder,
  type Bi,
  type Img,
  type Sched,
  type Seo,
} from "@/components/admin/SiteContentFlow";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
export const areaCls =
  "w-full min-w-0 resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] leading-normal outline-none focus:border-primary";

/** Called after every edit so the page becomes a draft and the screen refreshes. */
export const TouchCtx = createContext<() => void>(() => {});
export const useTouch = () => useContext(TouchCtx);

export const Tag = ({ lang }: { lang: "EN" | "AR" }) => (
  <span
    className={cn(
      "rounded-[3px] px-1.5 py-px text-[10px] font-semibold tracking-[.08em]",
      lang === "EN" ? "bg-primary text-primary-foreground" : "bg-[#f0f0f0] text-foreground",
    )}
  >
    {lang}
  </span>
);

export function Fld({
  label,
  hint,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label && <label className="text-[12px] text-muted-foreground">{label}</label>}
      {children}
      {hint && <div className="text-[12px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function SubHead({
  title,
  note,
  right,
}: {
  title: ReactNode;
  note?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-2.5 mt-5 flex flex-wrap items-center justify-between gap-2 first:mt-0">
      <span className="text-[13px] font-medium">{title}</span>
      {right ?? (note && <span className="text-[12px] text-muted-foreground">{note}</span>)}
    </div>
  );
}

/** A text box bound to one language of a [EN, AR] pair. */
export function BiBox({
  v,
  i,
  rows,
  placeholder,
}: {
  v: Bi;
  i: 0 | 1;
  rows?: number;
  placeholder?: string;
}) {
  const touch = useTouch();
  const rtl = i === 1;
  const common = {
    value: v[i],
    dir: rtl ? "rtl" : undefined,
    placeholder,
    onChange: (e: { target: { value: string } }) => {
      v[i] = e.target.value;
      touch();
    },
  };
  return rows ? (
    <textarea rows={rows} {...common} className={cn(areaCls, rtl && "text-right")} />
  ) : (
    <input {...common} className={cn(inputCls, rtl && "text-right")} />
  );
}

/** English + Arabic fields side by side. */
export function BiField({
  label,
  labelAr,
  v,
  rows,
  phEn,
  phAr,
}: {
  label: string;
  labelAr?: string;
  v: Bi;
  rows?: number;
  phEn?: string;
  phAr?: string;
}) {
  return (
    <div className="mb-4 grid gap-3.5 sm:grid-cols-2">
      <Fld
        label={
          <span className="flex items-center gap-1.5">
            <Tag lang="EN" /> {label}
          </span>
        }
      >
        <BiBox v={v} i={0} {...(rows ? { rows } : {})} {...(phEn ? { placeholder: phEn } : {})} />
      </Fld>
      <Fld
        label={
          <span className="flex items-center gap-1.5">
            <Tag lang="AR" /> {labelAr ?? label}
          </span>
        }
      >
        <BiBox v={v} i={1} {...(rows ? { rows } : {})} {...(phAr ? { placeholder: phAr } : {})} />
      </Fld>
    </div>
  );
}

/** A plain text box that edits one string property of an object. */
export function TxtField<T extends object>({
  o,
  k,
  placeholder,
  className,
  readOnly,
}: {
  o: T;
  k: keyof T & string;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}) {
  const touch = useTouch();
  return (
    <input
      value={String(o[k] ?? "")}
      placeholder={placeholder}
      readOnly={!!readOnly}
      onChange={(e) => {
        (o as Record<string, unknown>)[k] = e.target.value;
        touch();
      }}
      className={cn(inputCls, className)}
    />
  );
}

export function Remove({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={`Remove ${label}`}
      onClick={onClick}
      className="px-1 text-[13px] text-muted-foreground hover:text-bad"
    >
      ✕
    </button>
  );
}

export const Handle = () => (
  <span
    className="cursor-grab select-none px-1 text-[15px] tracking-[-2px] text-[#c9c9c9]"
    title="Drag to reorder"
    aria-hidden
  >
    ⋮⋮
  </span>
);

/** A list whose rows can be dragged into a new order. */
export function DragList<T>({
  items,
  id,
  onChange,
  row,
  rowClass,
}: {
  items: T[];
  id: (t: T) => string;
  onChange: (next: T[]) => void;
  row: (t: T, i: number, handle: ReactNode) => ReactNode;
  rowClass?: string;
}) {
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((t, i) => (
        <div
          key={id(t)}
          draggable
          onDragStart={(e) => {
            // typing in a field inside a row must not start a drag
            if ((e.target as HTMLElement).closest("input,textarea,[contenteditable]")) {
              e.preventDefault();
              return;
            }
            setFrom(i);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => {
            if (from !== null) {
              e.preventDefault();
              setOver(i);
            }
          }}
          onDragEnd={() => {
            setFrom(null);
            setOver(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (from !== null && from !== i) onChange(reorder(items, from, i));
            setFrom(null);
            setOver(null);
          }}
          className={cn(
            "rounded-lg border bg-surface transition",
            from === i && "opacity-40",
            over === i && from !== i
              ? "border-primary outline-dashed outline-1 outline-offset-2 outline-primary"
              : "border-border",
            rowClass,
          )}
        >
          {row(t, i, <Handle />)}
        </div>
      ))}
    </div>
  );
}

/* ---------- images ---------- */
const SEED_GRADIENTS = [
  "linear-gradient(160deg,#C9B49A,#8C7458)",
  "linear-gradient(160deg,#D8CFC4,#9C8E7E)",
  "linear-gradient(160deg,#C5A06A,#86642E)",
  "linear-gradient(160deg,#9AA3AB,#5E6770)",
  "linear-gradient(160deg,#6E4E37,#3E2B1E)",
  "linear-gradient(160deg,#8C6A52,#4E3626)",
  "linear-gradient(160deg,#3A3A3A,#111)",
  "linear-gradient(160deg,#B0A79A,#6F665A)",
];
/** Background style for a stored image value ("seed:N" sample, or an object URL). */
export function imgStyle(v: string): CSSProperties {
  if (!v) return {};
  if (v.startsWith("seed:")) return { background: SEED_GRADIENTS[Number(v.slice(5)) % 8]! };
  return { backgroundImage: `url(${v})`, backgroundSize: "cover", backgroundPosition: "center" };
}
export function pickImage(onPick: (url: string, name: string) => void, accept = "image/*") {
  const el = document.createElement("input");
  el.type = "file";
  el.accept = accept;
  el.onchange = () => {
    const f = el.files?.[0];
    if (f) onPick(URL.createObjectURL(f), f.name);
  };
  el.click();
}

/** One upload slot, e.g. "2400 × 900 px". The label is optional. */
export function ImgSlot({
  value,
  onChange,
  label,
  size,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string | undefined;
  size: string;
  className?: string | undefined;
}) {
  const has = !!value;
  return (
    <button
      type="button"
      onClick={() => pickImage((u) => onChange(u))}
      style={imgStyle(value)}
      className={cn(
        "relative flex min-h-[130px] flex-col justify-end rounded-[10px] p-3 text-left text-[12.5px]",
        has
          ? "border border-transparent text-white"
          : "border-[1.5px] border-dashed border-[#e8d3ae] bg-[#fbf6ec] text-[#7a4e00]",
        className,
      )}
    >
      {label && <b className="font-medium">{label}</b>}
      <em className="not-italic opacity-80">
        {has ? "" : "No image yet — click to upload · "}
        {size}
      </em>
      {has && (
        <span className="absolute bottom-2.5 right-3 text-[12px] underline underline-offset-[3px]">
          Replace image
        </span>
      )}
    </button>
  );
}

/** One image slot for a section — the picture; phones crop it. */
export function ImgOne({
  im,
  size,
  className,
}: {
  im: Img;
  size: string;
  className?: string | undefined;
}) {
  const touch = useTouch();
  return (
    <ImgSlot
      value={im.d}
      size={size}
      className={className}
      onChange={(v) => {
        im.d = v;
        touch();
      }}
    />
  );
}

/* ---------- links ---------- */
export function LinkField({ o }: { o: { link: string } }) {
  const touch = useTouch();
  return (
    <div className="flex gap-2">
      <input
        value={o.link}
        placeholder="/page-address or full link"
        onChange={(e) => {
          o.link = e.target.value;
          touch();
        }}
        className={inputCls}
      />
      <Dropdown
        value={o.link}
        label="Choose page"
        ariaLabel="Choose page"
        options={PAGE_LINKS.map(([value, label]) => ({ value, label }))}
        onChange={(v) => {
          o.link = v;
          touch();
        }}
        className="h-9 flex-none"
        menuClassName="max-h-[320px] overflow-auto"
      />
    </div>
  );
}

/** On / off switch row with a note on the right. */
export function SwitchRow({
  title,
  on,
  onChange,
  note,
}: {
  title: ReactNode;
  on: boolean;
  onChange: () => void;
  note: string;
}) {
  return (
    <div className="mb-2.5 mt-5 flex items-center justify-between gap-3">
      <span className="text-[13px] font-medium">{title}</span>
      <span className="flex items-center gap-2.5 text-[12px] text-muted-foreground">
        {note}
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={onChange}
          className={cn(
            "relative h-[22px] w-[38px] flex-none rounded-full transition-colors",
            on ? "bg-primary" : "bg-[#c9c9c9]",
          )}
        >
          <i
            className={cn(
              "absolute top-[3px] size-4 rounded-full bg-white transition-all",
              on ? "left-[19px]" : "left-[3px]",
            )}
          />
        </button>
      </span>
    </div>
  );
}

/** Optional "Show from / Show until". */
export function ScheduleBlock({ o, what }: { o: Sched; what: string }) {
  const touch = useTouch();
  return (
    <>
      <SubHead title="Schedule" note="Optional" />
      <div className="grid items-end gap-3.5 sm:grid-cols-[200px_200px_1fr]">
        <Fld label="Show from">
          <DateField
            value={o.from}
            max={o.to || undefined}
            onChange={(v) => {
              o.from = v;
              touch();
            }}
          />
        </Fld>
        <Fld label="Show until">
          <DateField
            value={o.to}
            min={o.from || undefined}
            onChange={(v) => {
              o.to = v;
              touch();
            }}
          />
        </Fld>
        <span className="pb-2.5 text-[12px] text-muted-foreground">
          Leave empty to show {what} all the time. After "Show until" it switches off by itself.
        </span>
      </div>
    </>
  );
}

/* ---------- rich text ---------- */
const TOOLS: [string, string, ReactNode][] = [
  ["formatBlock", "H2", "Heading"],
  ["formatBlock", "H3", "Subheading"],
  ["bold", "", <b key="b">B</b>],
  ["italic", "", <i key="i">I</i>],
  ["insertUnorderedList", "", "• List"],
  ["insertOrderedList", "", "1. List"],
  ["link", "", "Link"],
];
function runTool(cmd: string, arg: string) {
  if (cmd === "link") {
    const u = window.prompt("Link address", "/contact");
    if (u) document.execCommand("createLink", false, u);
    return;
  }
  document.execCommand(cmd, false, arg ? `<${arg}>` : undefined);
}
/** Content editor: Heading, Subheading, Bold, Italic, lists and Link. The Arabic one writes right to left. */
export function Rte({
  value,
  onChange,
  rtl,
}: {
  value: string;
  onChange: (html: string) => void;
  rtl?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // set once; afterwards the browser owns the content so the caret doesn't jump
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <div className="flex flex-wrap gap-1 rounded-t-lg border border-b-0 border-border bg-[#fafafa] p-1.5">
        {TOOLS.map(([c, a, l], i) => (
          <button
            key={i}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              runTool(c, a);
              if (ref.current) onChange(ref.current.innerHTML);
            }}
            className="h-7 min-w-[30px] rounded-md border border-transparent px-2 text-[12.5px] hover:border-border hover:bg-surface"
          >
            {l}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dir={rtl ? "rtl" : undefined}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        className="rte max-h-[260px] min-h-[190px] overflow-auto rounded-b-lg border border-border bg-surface px-3.5 py-3 text-[13.5px] leading-relaxed outline-none focus:border-primary [&_a]:underline [&_h2]:mb-1.5 [&_h2]:font-head [&_h2]:text-[18px] [&_h3]:mb-1 [&_h3]:mt-2.5 [&_h3]:font-medium [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}

/* ---------- SEO ---------- */
export function SeoBlock({
  seo,
  address,
  fallback,
}: {
  seo: Seo;
  address: string;
  fallback: string;
}) {
  const cnt = (s: string, max: number) => (
    <span className={cn("float-right", s.length > max && "text-bad")}>
      {s.length} / {max}
    </span>
  );
  return (
    <>
      <div className="grid gap-3.5 sm:grid-cols-2">
        {([0, 1] as const).map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Tag lang={i ? "AR" : "EN"} />
            <label className="text-[12px] text-muted-foreground">
              {i ? "عنوان الصفحة لمحركات البحث" : "Meta title"}
              <span className="text-[11.5px] text-[#888]">{cnt(seo.t[i], 60)}</span>
            </label>
            <BiBox v={seo.t} i={i} />
            <label className="mt-1.5 text-[12px] text-muted-foreground">
              {i ? "الوصف" : "Meta description"}
              <span className="text-[11.5px] text-[#888]">{cnt(seo.d[i], 160)}</span>
            </label>
            <BiBox v={seo.d} i={i} rows={3} />
          </div>
        ))}
      </div>
      <div className="mt-3.5 text-[12px] text-muted-foreground">How it looks on Google</div>
      <div className="mt-1.5 rounded-lg border border-border bg-[#fafafa] px-3 py-2.5">
        <small className="text-[11.5px] text-muted-foreground">
          zelliny.com{address === "/" ? "" : ` › ${address.slice(1)}`}
        </small>
        <b className="my-0.5 block text-[15px] font-normal text-[#1a0dab]">
          {seo.t[0] || fallback}
        </b>
        <p className="text-[12.5px] text-muted-foreground">
          {seo.d[0] || "Add a meta description so Google shows your own words here."}
        </p>
      </div>
    </>
  );
}

/* ---------- confirmation in the middle of the screen ---------- */
export function useDone() {
  const [msg, setMsg] = useState<{ title: string; line: string; note?: string } | null>(null);
  const node = (
    <Dialog open={!!msg} onOpenChange={(o) => !o && setMsg(null)}>
      <DialogContent className="max-w-[440px]">
        <div className="grid justify-items-center gap-3 py-2 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-good-bg text-[20px] text-good">
            ✓
          </span>
          <DialogTitle className="font-head text-[18px] font-normal">{msg?.title}</DialogTitle>
          <p className="text-[13.5px]">{msg?.line}</p>
          {msg?.note && <p className="text-[12.5px] text-muted-foreground">{msg.note}</p>}
          <Button primary onClick={() => setMsg(null)}>
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
  return [
    node,
    (title: string, line: string, note?: string) =>
      setMsg({ title, line, ...(note ? { note } : {}) }),
  ] as const;
}
