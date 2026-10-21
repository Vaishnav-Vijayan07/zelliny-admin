// Sections editor used by the Homepage, About Us and Corporate Gifting: switch sections on / off,
// drag to reorder, open one to edit its text, images, button and what it lists.
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Thumb, Toggle } from "@/components/admin/primitives";
import { Button } from "@/components/admin/page";
import { todayIso } from "@/components/admin/DateField";
import {
  BiBox,
  BiField,
  DragList,
  Fld,
  ImgOne,
  ImgSlot,
  LinkField,
  Remove,
  Rte,
  SubHead,
  SwitchRow,
  Tag,
  imgStyle,
  inputCls,
  pickImage,
  useTouch,
} from "@/components/admin/SiteContentUi";
import {
  SECTION_CHOICES,
  newSection,
  nid,
  reorder,
  type Bi,
  type Chapter,
  type Panel,
  type Section,
  type SectionKind,
  type SitePage,
} from "@/components/admin/SiteContentFlow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SIZE = {
  bannerD: "2400 × 900 px",
  heroM: "1080 × 1600 px",
  panelD: "1200 × 1500 px",
  chapD: "1600 × 1100 px",
  splitD: "1600 × 1200 px",
};
const GRAD = (n: number) => imgStyle(`seed:${n % 8}`);

function statusPill(s: { on: boolean; from?: string; to?: string }, where: string) {
  const t = todayIso();
  const [label, cls] = !s.on
    ? ["Switched off", "bg-muted text-muted-foreground"]
    : s.from && s.from > t
      ? [`Scheduled · from ${dateLabel(s.from)}`, "bg-warn-bg text-warn"]
      : s.to && s.to < t
        ? ["Ended", "bg-muted text-muted-foreground"]
        : [`${where}${s.to ? ` · until ${dateLabel(s.to)}` : ""}`, "bg-good-bg text-good"];
  return (
    <span className={cn("whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px]", cls)}>
      ● {label}
    </span>
  );
}
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MON[m! - 1]} ${y}`;
}

function Picker({
  title,
  options,
  onPick,
  onClose,
}: {
  title: string;
  options: { id: string; name: string; sub: string; color?: string; tag?: ReactNode }[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = options
    .filter((o) => !q || `${o.name}${o.sub}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 40);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="font-head text-[18px] font-normal">{title}</DialogTitle>
        </DialogHeader>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className={inputCls}
        />
        <div className="max-h-[320px] overflow-auto rounded-lg border border-border">
          {list.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onPick(o.id)}
              className="flex w-full items-center gap-3 border-b border-line-soft px-3 py-2 text-left last:border-b-0 hover:bg-hover"
            >
              {o.color && <Thumb color={o.color} className="size-8" />}
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13px] font-medium">{o.name}</b>
                <span className="text-[11.5px] text-muted-foreground">{o.sub}</span>
              </span>
              {o.tag}
            </button>
          ))}
          {!list.length && (
            <p className="p-4 text-[13px] text-muted-foreground">Nothing left to add.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Heading + small line (+ position) fields. */
function HeadFields({ s, noSmall }: { s: Extract<Section, { h: Bi }>; noSmall?: boolean }) {
  return (
    <>
      <BiField label="Heading" labelAr="العنوان" v={s.h} />
      {!noSmall && "s" in s && <BiField label="Small line" labelAr="السطر الصغير" v={s.s} />}
    </>
  );
}

function ButtonFields({ s }: { s: Extract<Section, { kind: "hero" | "banner" }> }) {
  const touch = useTouch();
  return (
    <>
      <SwitchRow
        title="Button"
        on={s.bOn}
        note={s.bOn ? "Shown on the site and clickable" : "Hidden on the site — the words are kept"}
        onChange={() => {
          s.bOn = !s.bOn;
          touch();
        }}
      />
      {s.bOn && (
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Fld label="Button text · EN">
            <BiBox v={s.b} i={0} placeholder="e.g. Discover the collection" />
          </Fld>
          <Fld label="نص الزر · AR">
            <BiBox v={s.b} i={1} />
          </Fld>
          <Fld label="Opens">
            <LinkField o={s} />
          </Fld>
        </div>
      )}
    </>
  );
}

function HeroMediaList({ s }: { s: Extract<Section, { kind: "hero" }> }) {
  const touch = useTouch();
  const add = () => {
    const el = document.createElement("input");
    el.type = "file";
    el.multiple = true;
    el.accept = "image/*,video/*";
    el.onchange = () => {
      const room = 8 - s.media.length;
      const files = [...(el.files ?? [])].slice(0, room);
      if ((el.files?.length ?? 0) > room) toast("A banner can have up to 8 images and videos");
      files.forEach((f) =>
        s.media.push({
          id: nid("h"),
          on: true,
          name: f.name,
          video: f.type.startsWith("video"),
          secs: 5,
          src: URL.createObjectURL(f),
          from: "",
          to: "",
        }),
      );
      touch();
    };
    el.click();
  };
  return (
    <>
      <SubHead
        title={`Banner media · ${s.media.length} of 8`}
        note={`One image per item · Mobile ${SIZE.heroM} · drag to reorder`}
      />
      <DragList
        items={s.media}
        id={(m) => m.id}
        onChange={(n) => {
          s.media = n;
          touch();
        }}
        row={(m, i, h) => (
          <div className="flex flex-wrap items-center gap-3 p-2.5">
            {h}
            <span className="w-4 text-[12px] text-muted-foreground">{i + 1}</span>
            <button
              type="button"
              title="Replace image"
              onClick={() =>
                pickImage(
                  (url, name) => {
                    m.src = url;
                    m.name = name;
                    m.video = /\.(mp4|webm|mov|m4v)$/i.test(name);
                    touch();
                  },
                  m.video ? "video/*" : "image/*",
                )
              }
              className="grid h-[64px] w-[44px] flex-none place-items-center overflow-hidden rounded-md text-[16px] text-white/80"
              style={
                m.src && !m.video
                  ? imgStyle(m.src)
                  : { background: "linear-gradient(160deg,#4A3A2C,#1F1712)" }
              }
            >
              {m.video ? "▶" : m.src ? "" : "▣"}
            </button>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[13.5px] font-medium">{m.name}</b>
              <span className="block text-[12px] text-muted-foreground">
                {m.video ? "Video · plays to the end, muted" : `Image · shows for ${m.secs} s`} ·
                Mobile {SIZE.heroM}
              </span>
            </div>
            {statusPill({ on: m.on }, "Showing")}
            <Remove
              label={m.name}
              onClick={() => {
                s.media = s.media.filter((x) => x.id !== m.id);
                touch();
              }}
            />
          </div>
        )}
      />
      {!s.media.length && (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-[13px] text-muted-foreground">
          No media yet — the banner will be empty.
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <Button onClick={add}>+ Add images or videos</Button>
        <span className="text-[12px] text-muted-foreground">
          JPG, PNG, WebP or MP4 · videos under 15 MB · Mobile {SIZE.heroM}
        </span>
      </div>
    </>
  );
}

function PanelsEditor({ s }: { s: Extract<Section, { kind: "panels" }> }) {
  const touch = useTouch();
  const upd = (list: Panel[]) => {
    s.panels = list;
    touch();
  };
  return (
    <>
      <SubHead
        title={`Panels · ${s.panels.length}`}
        note={`Panel image: ${SIZE.panelD} · drag to reorder`}
      />
      <DragList
        items={s.panels}
        id={(p) => p.id}
        onChange={upd}
        row={(p, i, h) => (
          <div className="p-3">
            <div className="mb-3 flex items-center gap-2.5">
              {h}
              <b className="flex-1 text-[13.5px] font-medium">Panel {i + 1}</b>
              <Remove
                label={`panel ${i + 1}`}
                onClick={() => upd(s.panels.filter((x) => x !== p))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-[320px_1fr]">
              <div>
                <ImgSlot
                  value={p.img.d}
                  size={SIZE.panelD}
                  className="aspect-[1200/1500] min-h-[200px]"
                  onChange={(v) => {
                    p.img.d = v;
                    touch();
                  }}
                />
              </div>
              <div>
                <BiField label="Title" labelAr="العنوان" v={p.t} />
                <BiField label="Line" labelAr="السطر" v={p.l} />
                <Fld label="Opens">
                  <LinkField o={p} />
                </Fld>
              </div>
            </div>
          </div>
        )}
      />
      <div className="mt-2.5">
        <Button
          onClick={() =>
            upd([
              ...s.panels,
              { id: nid("p"), t: ["", ""], l: ["", ""], link: "", img: { d: "", m: "" } },
            ])
          }
        >
          + Add panel
        </Button>
      </div>
    </>
  );
}

function ChaptersEditor({ s }: { s: Extract<Section, { kind: "chapters" }> }) {
  const touch = useTouch();
  const upd = (list: Chapter[]) => {
    s.ch = list;
    touch();
  };
  return (
    <>
      <SubHead
        title={`Chapters · ${s.ch.length}`}
        note={`Each chapter is a tab · image: ${SIZE.chapD} · drag to reorder`}
      />
      <DragList
        items={s.ch}
        id={(c) => c.id}
        onChange={upd}
        row={(c, i, h) => (
          <div className="p-3">
            <div className="mb-3 flex items-center gap-2.5">
              {h}
              <b className="flex-1 text-[13.5px] font-medium">Chapter {i + 1}</b>
              <Remove label={`chapter ${i + 1}`} onClick={() => upd(s.ch.filter((x) => x !== c))} />
            </div>
            <div className="grid gap-4 md:grid-cols-[320px_1fr]">
              <div>
                <ImgSlot
                  value={c.img.d}
                  size={SIZE.chapD}
                  className="aspect-[1600/1100] min-h-[180px]"
                  onChange={(v) => {
                    c.img.d = v;
                    touch();
                  }}
                />
              </div>
              <div>
                <BiField label="Tab name" labelAr="اسم التبويب" v={c.tab} />
                <BiField label="Title" labelAr="العنوان" v={c.t} />
                <BiField label="Text" labelAr="النص" v={c.x} rows={3} />
              </div>
            </div>
          </div>
        )}
      />
      <div className="mt-2.5">
        <Button
          onClick={() =>
            upd([
              ...s.ch,
              {
                id: nid("c"),
                tab: ["", ""],
                t: ["", ""],
                x: ["", ""],
                img: { d: "", m: "" },
              },
            ])
          }
        >
          + Add chapter
        </Button>
      </div>
    </>
  );
}

export function SectionsEditor({ page }: { page: SitePage }) {
  const touch = useTouch();
  const isHome = page.id === "home";
  const where = isHome ? "On the homepage" : "On the page";
  const { data: cats } = useSuspenseQuery(categoriesQuery());
  const { data: brands } = useSuspenseQuery(brandsQuery());
  const { data: prods } = useSuspenseQuery(productsQuery());
  const [open, setOpen] = useState<string | null>(null);
  const [pick, setPick] = useState<{ s: Extract<Section, { items: string[] }> } | null>(null);
  const [adding, setAdding] = useState(false);
  const [fromSec, setFromSec] = useState<number | null>(null);
  const [overSec, setOverSec] = useState<number | null>(null);

  const catOf = (id: string) => cats.find((c) => c.id === id);
  const brandOf = (id: string) => brands.find((b) => b.id === id);
  const prodOf = (id: string) => prods.rows.find((p) => p.id === id);
  const soldOut = (p: { mode: string; stock: number }) => p.mode === "Add to Cart" && p.stock <= 0;

  const listBody = (s: Extract<Section, { items: string[] }>) => {
    const set = (n: string[]) => {
      s.items = n;
      touch();
    };
    if (s.kind === "cats")
      return (
        <>
          <SubHead
            title={`Categories shown · ${s.items.length}`}
            note="Drag to reorder — the first tile is first on the page"
          />
          <DragList
            items={s.items}
            id={(x) => x}
            onChange={set}
            row={(id, i, h) => {
              const c = catOf(id);
              return (
                <div className="flex items-center gap-3 p-2.5">
                  {h}
                  <span className="w-5 text-[12px] text-muted-foreground">{i + 1}</span>
                  <span className="size-10 flex-none rounded-lg" style={GRAD(i + 2)} />
                  <div className="min-w-0 flex-1">
                    <b className="block text-[13.5px] font-medium">{c?.name ?? id}</b>
                    <span className="text-[12px] text-muted-foreground">
                      {c ? `${formatNumber(c.count)} products` : ""} · tile photo and name come from{" "}
                      {c ? (
                        <Link
                          to="/categories/$categoryId"
                          params={{ categoryId: c.id }}
                          className="underline underline-offset-[3px]"
                        >
                          Categories
                        </Link>
                      ) : (
                        "Categories"
                      )}
                    </span>
                  </div>
                  <Remove
                    label={c?.name ?? id}
                    onClick={() => set(s.items.filter((x) => x !== id))}
                  />
                </div>
              );
            }}
          />
          <div className="mt-2.5">
            <Button onClick={() => setPick({ s })}>+ Add category</Button>
          </div>
        </>
      );
    if (s.kind === "prods")
      return (
        <>
          <SubHead
            title={`Products shown · ${s.items.length}`}
            note="Drag to reorder — a priced Add to Cart product should lead"
          />
          <DragList
            items={s.items}
            id={(x) => x}
            onChange={set}
            row={(id, i, h) => {
              const p = prodOf(id);
              return (
                <div className="flex items-center gap-3 p-2.5">
                  {h}
                  <span className="w-5 text-[12px] text-muted-foreground">{i + 1}</span>
                  {p && <Thumb color={p.color} className="size-9" />}
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-[13.5px] font-medium">{p?.name ?? id}</b>
                    <span className="text-[12px] text-muted-foreground">
                      {p
                        ? p.price
                          ? `${formatNumber(p.offer ?? p.price)} EGP`
                          : "Price on request"
                        : ""}
                    </span>
                  </div>
                  {p && soldOut(p) && (
                    <span className="rounded-lg bg-bad-bg px-2 py-0.5 text-[11px] text-bad">
                      Sold out — swap it
                    </span>
                  )}
                  {p && (
                    <span
                      className={cn(
                        "rounded-lg border px-2 py-0.5 text-[11px]",
                        p.mode === "Add to Cart"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-dashed border-border",
                      )}
                    >
                      {p.mode === "Add to Cart" ? "Add to Cart" : "Enquiry"}
                    </span>
                  )}
                  <Remove
                    label={p?.name ?? id}
                    onClick={() => set(s.items.filter((x) => x !== id))}
                  />
                </div>
              );
            }}
          />
          <div className="mt-2.5">
            <Button onClick={() => setPick({ s })}>+ Add product</Button>
          </div>
        </>
      );
    return (
      <>
        <SubHead
          title={`Maisons shown · ${s.items.length}`}
          note="Logos come from Maisons · drag to reorder logos"
        />
        <DragList
          items={s.items}
          id={(x) => x}
          onChange={set}
          row={(id, i, h) => {
            const b = brandOf(id);
            return (
              <div className="flex items-center gap-3 p-2.5">
                {h}
                <span className="w-5 text-[12px] text-muted-foreground">{i + 1}</span>
                {b?.hasLogo !== false ? (
                  <span className="min-w-[120px] rounded border border-border px-2.5 py-1 text-center font-head text-[11px] tracking-[.14em]">
                    {(b?.name ?? id).toUpperCase()}
                  </span>
                ) : (
                  <span className="min-w-[120px] rounded border border-[#e8d3ae] bg-[#fbf6ec] px-2.5 py-1 text-center text-[11.5px] text-[#9a6200]">
                    No logo yet
                  </span>
                )}
                <span className="flex-1 text-[12px] text-muted-foreground">
                  {b?.categories}
                  {b?.hasLogo === false && (
                    <>
                      {" "}
                      ·{" "}
                      <Link
                        to="/brands/$brandId"
                        params={{ brandId: b.id }}
                        className="underline underline-offset-[3px]"
                      >
                        Add the logo in Maisons
                      </Link>{" "}
                      — hidden on the site until then
                    </>
                  )}
                </span>
                <Remove
                  label={b?.name ?? id}
                  onClick={() => set(s.items.filter((x) => x !== id))}
                />
              </div>
            );
          }}
        />
        <div className="mt-2.5">
          <Button onClick={() => setPick({ s })}>+ Add maison</Button>
        </div>
      </>
    );
  };

  const body = (s: Section): ReactNode => {
    let main: ReactNode = null;
    switch (s.kind) {
      case "hero":
        main = (
          <>
            <HeadFields s={s} />
            {s.p && <BiField label="Text under the heading" labelAr="النص تحت العنوان" v={s.p} />}
            <HeroMediaList s={s} />
            <ButtonFields s={s} />
          </>
        );
        break;
      case "banner":
        main = (
          <>
            <HeadFields s={s} />
            <SubHead title="Images" note={`${SIZE.bannerD} · JPG, PNG or WebP`} />
            <ImgOne
              im={s.img}
              size={SIZE.bannerD}
              className="aspect-[2400/900] w-full min-h-[240px]"
            />
            <ButtonFields s={s} />
          </>
        );
        break;
      case "cats":
      case "maisons":
        main = (
          <>
            <HeadFields s={s} />
            {listBody(s)}
          </>
        );
        break;
      case "prods":
        main = (
          <>
            <HeadFields s={s} />
            {listBody(s)}
          </>
        );
        break;
      case "panels":
        main = (
          <>
            <HeadFields s={s} />
            <PanelsEditor s={s} />
          </>
        );
        break;
      case "intro":
        main = (
          <>
            <HeadFields s={s} />
            <BiField
              label="Second line of the heading (grey)"
              labelAr="السطر الثاني من العنوان"
              v={s.h2}
            />
            <SubHead title="Text" note="Two columns on the site" />
            <BiField label="Left column" labelAr="العمود الأيمن" v={s.c1} rows={4} />
            <BiField label="Right column" labelAr="العمود الأيسر" v={s.c2} rows={4} />
          </>
        );
        break;
      case "chapters":
        main = (
          <>
            <HeadFields s={s} />
            <ChaptersEditor s={s} />
          </>
        );
        break;
      case "split":
        main = (
          <>
            <BiField label="Heading" labelAr="العنوان" v={s.h} />
            <BiField label="Statement" labelAr="العبارة" v={s.st} />
            <BiField
              label="Statement — part in grey"
              labelAr="الجزء الرمادي من العبارة"
              v={s.st2}
            />
            <BiField label="Text" labelAr="النص" v={s.x} rows={4} />
            <SubHead title="Image" note={SIZE.splitD} />
            <div className="mb-3 flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
              Image on the
              <div className="inline-flex rounded-full border border-border p-0.5">
                {(["left", "right"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      s.side = k;
                      touch();
                    }}
                    className={cn(
                      "h-[26px] rounded-full px-3 text-[12.5px] capitalize",
                      s.side === k ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <ImgOne
              im={s.img}
              size={SIZE.splitD}
              className="aspect-[1600/1200] max-w-[560px] min-h-[240px]"
            />
          </>
        );
        break;
      case "cta":
        main = (
          <>
            <BiField label="Heading" labelAr="العنوان" v={s.h} />
            <BiField label="Text" labelAr="النص" v={s.p} rows={2} />
            {s.btns.map((b, i) => (
              <div key={i}>
                <SwitchRow
                  title={`Button ${i + 1}${i ? " (outlined)" : " (black)"}`}
                  on={b.on}
                  note={
                    b.on
                      ? "Shown on the site and clickable"
                      : "Hidden on the site — the words are kept"
                  }
                  onChange={() => {
                    b.on = !b.on;
                    touch();
                  }}
                />
                {b.on && (
                  <div className="grid gap-3.5 sm:grid-cols-3">
                    <Fld label="Button text · EN">
                      <BiBox v={b.t} i={0} />
                    </Fld>
                    <Fld label="نص الزر · AR">
                      <BiBox v={b.t} i={1} />
                    </Fld>
                    <Fld label="Opens">
                      <LinkField o={b} />
                    </Fld>
                  </div>
                )}
              </div>
            ))}
          </>
        );
        break;
      case "text":
        main = (
          <>
            <BiField label="Heading" labelAr="العنوان" v={s.h} />
            <div className="grid gap-3.5 md:grid-cols-2">
              {([0, 1] as const).map((i) => (
                <div key={`${s.id}-${i}`}>
                  <div className="mb-1.5">
                    <Tag lang={i ? "AR" : "EN"} />
                  </div>
                  <Rte
                    value={s.body[i]}
                    rtl={i === 1}
                    onChange={(h) => {
                      s.body[i] = h;
                      touch();
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        );
        break;
    }
    return main;
  };

  const options = (() => {
    if (!pick) return [];
    const s = pick.s;
    if (s.kind === "cats")
      return cats
        .filter((c) => !s.items.includes(c.id))
        .map((c) => ({ id: c.id, name: c.name, sub: `${formatNumber(c.count)} products` }));
    if (s.kind === "prods")
      return prods.rows
        .filter((p) => !s.items.includes(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          sub: `${p.brand} · ${p.price ? `${formatNumber(p.offer ?? p.price)} EGP` : "On request"}`,
          color: p.color,
          tag: soldOut(p) ? (
            <span className="rounded-lg bg-bad-bg px-2 py-0.5 text-[11px] text-bad">Sold out</span>
          ) : undefined,
        }));
    return brands
      .filter((b) => !s.items.includes(b.id))
      .map((b) => ({
        id: b.id,
        name: b.name,
        sub: b.categories,
        tag:
          b.hasLogo === false ? (
            <span className="rounded border border-[#e8d3ae] bg-[#fbf6ec] px-2 py-0.5 text-[11px] text-[#9a6200]">
              No logo yet
            </span>
          ) : (
            <span className="rounded border border-border px-2 py-0.5 font-head text-[10px] tracking-[.12em]">
              {b.name.toUpperCase()}
            </span>
          ),
      }));
  })();
  const pickTitle = pick
    ? pick.s.kind === "cats"
      ? "Add a category"
      : pick.s.kind === "prods"
        ? "Add a product"
        : "Add a maison"
    : "";

  return (
    <>
      <p className="mb-3 text-[12.5px] text-muted-foreground">
        Switch a section off to take it off the {isHome ? "homepage" : "page"}, drag sections to
        change their order, and open one to edit its text, images and what it lists.
      </p>
      <div className="flex flex-col gap-2.5">
        {page.secs.map((s, i) => {
          const expanded = open === s.id;
          const count =
            "items" in s
              ? ` · ${s.items.length} listed`
              : "panels" in s
                ? ` · ${s.panels.length} panels`
                : "";
          return (
            <section
              key={s.id}
              draggable={!expanded}
              onDragStart={() => setFromSec(i)}
              onDragOver={(e) => {
                if (fromSec !== null) {
                  e.preventDefault();
                  setOverSec(i);
                }
              }}
              onDragEnd={() => {
                setFromSec(null);
                setOverSec(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (fromSec !== null && fromSec !== i) {
                  page.secs = reorder(page.secs, fromSec, i);
                  touch();
                }
                setFromSec(null);
                setOverSec(null);
              }}
              className={cn(
                "rounded-[10px] border bg-surface",
                fromSec === i && "opacity-40",
                overSec === i && fromSec !== i ? "border-primary" : "border-border",
              )}
            >
              <div className="flex items-center gap-3.5 px-4 py-3.5">
                <span
                  className="cursor-grab select-none text-[15px] tracking-[-2px] text-[#c9c9c9]"
                  title="Drag to reorder sections"
                  aria-hidden
                >
                  ⋮⋮
                </span>
                <span className="w-5 text-[12px] text-muted-foreground">{i + 1}</span>
                <div className={cn("min-w-0 flex-1", !s.on && "opacity-55")}>
                  <b className="block text-[14px] font-medium">{s.name}</b>
                  <span className="text-[12px] text-muted-foreground">
                    {s.hint}
                    {count}
                  </span>
                </div>
                {statusPill({ on: s.on }, where)}
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : s.id)}
                  className="text-[12.5px] underline underline-offset-[3px]"
                >
                  {expanded ? "Close" : "Edit"}
                </button>
                <Toggle
                  on={s.on}
                  onChange={() => {
                    s.on = !s.on;
                    touch();
                  }}
                  label={s.name}
                />
              </div>
              {expanded && <div className="border-t border-line-soft px-5 py-4">{body(s)}</div>}
            </section>
          );
        })}
      </div>
      {!isHome && (
        <div className="mt-3">
          <Button onClick={() => setAdding(true)}>+ Add section</Button>
        </div>
      )}
      {pick && (
        <Picker
          title={pickTitle}
          options={options}
          onClose={() => setPick(null)}
          onPick={(id) => {
            pick.s.items = [...pick.s.items, id];
            setPick(null);
            touch();
          }}
        />
      )}
      {adding && (
        <Dialog open onOpenChange={(o) => !o && setAdding(false)}>
          <DialogContent className="max-w-[560px]">
            <DialogHeader>
              <DialogTitle className="font-head text-[18px] font-normal">Add a section</DialogTitle>
            </DialogHeader>
            <p className="text-[13.5px]">
              Pick the kind of section. It is added at the end — drag it where you want it.
            </p>
            <div className="max-h-[360px] overflow-auto rounded-lg border border-border">
              {SECTION_CHOICES.map(([k, a, b]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    const ns = newSection(k as SectionKind, a, b);
                    page.secs = [...page.secs, ns];
                    setOpen(ns.id);
                    setAdding(false);
                    touch();
                  }}
                  className="block w-full border-b border-line-soft px-4 py-3 text-left last:border-b-0 hover:bg-hover"
                >
                  <b className="block text-[13.5px] font-medium">{a}</b>
                  <span className="text-[12px] text-muted-foreground">{b}</span>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
