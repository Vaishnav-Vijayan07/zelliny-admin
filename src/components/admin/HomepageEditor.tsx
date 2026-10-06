// Homepage tab of Site content: section order and on/off, plus the lists behind category / product / maison sections.
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Thumb, Toggle } from "@/components/admin/primitives";
import { Button } from "@/components/admin/page";
import {
  SECTION_INFO,
  reorder,
  setCopy,
  setHero,
  setList,
  setOrder,
  setTiles,
  toggleSection,
  useHome,
  type Copy,
  type HeroItem,
  type SectionKey,
  type Tile,
} from "@/components/admin/HomepageFlow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";

/** A list whose rows can be dragged into a new order. */
function DragList<T>({
  items,
  id,
  onChange,
  row,
}: {
  items: T[];
  id: (t: T) => string;
  onChange: (next: T[]) => void;
  row: (t: T, i: number, handle: ReactNode) => ReactNode;
}) {
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const handle = (
    <span
      className="cursor-grab select-none px-1 text-[15px] tracking-[-2px] text-[#c9c9c9]"
      title="Drag to reorder"
      aria-hidden
    >
      ⋮⋮
    </span>
  );
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((t, i) => (
        <div
          key={id(t)}
          draggable
          onDragStart={(e) => {
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
          )}
        >
          {row(t, i, handle)}
        </div>
      ))}
    </div>
  );
}

function CopyFields({ k, copy, showSub }: { k: SectionKey; copy: Copy; showSub?: boolean }) {
  const tag = (t: string, dark: boolean) => (
    <span
      className={cn(
        "rounded-[3px] px-1.5 py-px text-[10px] font-semibold tracking-[.08em]",
        dark ? "bg-primary text-primary-foreground" : "bg-[#f0f0f0] text-foreground",
      )}
    >
      {t}
    </span>
  );
  const f = (label: ReactNode, v: string, on: (v: string) => void, rtl = false) => (
    <label className="flex min-w-0 flex-col gap-1.5 text-[12px] text-muted-foreground">
      {label}
      <input
        dir={rtl ? "rtl" : undefined}
        value={v}
        onChange={(e) => on(e.target.value)}
        className={cn(inputCls, rtl && "text-right")}
      />
    </label>
  );
  return (
    <div className="mb-4 grid gap-3.5 sm:grid-cols-2">
      {f(<>{tag("EN", true)} Heading</>, copy.title, (v) => setCopy(k, { title: v }))}
      {f(<>{tag("AR", false)} العنوان</>, copy.titleAr, (v) => setCopy(k, { titleAr: v }), true)}
      {showSub !== false && (
        <>
          {f(<>{tag("EN", true)} Small line above / below</>, copy.sub, (v) =>
            setCopy(k, { sub: v }),
          )}
          {f(
            <>{tag("AR", false)} السطر الصغير</>,
            copy.subAr,
            (v) => setCopy(k, { subAr: v }),
            true,
          )}
        </>
      )}
    </div>
  );
}

const Remove = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    type="button"
    aria-label={`Remove ${label}`}
    onClick={onClick}
    className="px-1 text-[13px] text-muted-foreground hover:text-bad"
  >
    ✕
  </button>
);

function Picker({
  title,
  options,
  onPick,
  onClose,
}: {
  title: string;
  options: { id: string; name: string; sub: string; color?: string }[];
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

function HeroMedia({ items }: { items: HeroItem[] }) {
  const pickFiles = () => {
    const el = document.createElement("input");
    el.type = "file";
    el.multiple = true;
    el.accept = "image/*,video/*";
    el.onchange = () => {
      const room = 8 - items.length;
      const files = [...(el.files ?? [])].slice(0, room);
      if ((el.files?.length ?? 0) > room) toast("A hero banner can have up to 8 images and videos");
      setHero([
        ...items,
        ...files.map((f) => ({
          id: `h${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
          kind: (f.type.startsWith("video") ? "video" : "image") as HeroItem["kind"],
          src: URL.createObjectURL(f),
          name: f.name,
          seconds: 5,
        })),
      ]);
    };
    el.click();
  };
  const upd = (id: string, patch: Partial<HeroItem>) =>
    setHero(items.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-medium">Banner media · {items.length} of 8</span>
        <span className="text-[12px] text-muted-foreground">
          Images and videos play in this order — drag to reorder
        </span>
      </div>
      <DragList
        items={items}
        id={(x) => x.id}
        onChange={setHero}
        row={(m, i, h) => (
          <div className="flex items-center gap-3 p-2.5">
            {h}
            <span className="w-5 text-[12px] text-muted-foreground">{i + 1}</span>
            <span
              className="relative grid h-[42px] w-[72px] flex-none place-items-center overflow-hidden rounded-md border border-border"
              style={{ background: "linear-gradient(120deg,#1a1712,#5e4d3b)" }}
            >
              {m.src ? (
                m.kind === "video" ? (
                  <video src={m.src} muted className="h-full w-full object-cover" />
                ) : (
                  <img src={m.src} alt="" className="h-full w-full object-cover" />
                )
              ) : (
                <span className="text-[16px] text-white/70">{m.kind === "video" ? "▶" : "▣"}</span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[13.5px] font-medium">{m.name}</b>
              <span className="text-[12px] text-muted-foreground">
                {m.kind === "video" ? "Video · plays to the end, muted" : "Image"}
              </span>
            </div>
            {m.kind === "image" && (
              <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                Shows for
                <input
                  type="number"
                  min={2}
                  max={30}
                  value={m.seconds}
                  onChange={(e) => upd(m.id, { seconds: Math.max(2, Number(e.target.value) || 5) })}
                  className="h-8 w-14 rounded-md border border-border bg-surface px-2 text-[13px] text-foreground"
                />
                s
              </label>
            )}
            <Remove label={m.name} onClick={() => setHero(items.filter((x) => x.id !== m.id))} />
          </div>
        )}
      />
      {!items.length && (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-[13px] text-muted-foreground">
          No media yet — the banner will be empty.
        </p>
      )}
      <div className="mt-2.5 flex items-center gap-3">
        <Button onClick={pickFiles}>+ Add images or videos</Button>
        <span className="text-[12px] text-muted-foreground">
          JPG, PNG, WebP or MP4 · videos under 15 MB
        </span>
      </div>
    </div>
  );
}

function TileEditor({ k, tiles }: { k: "business" | "packaging"; tiles: Tile[] }) {
  const upd = (i: number, patch: Partial<Tile>) =>
    setTiles(
      k,
      tiles.map((t, n) => (n === i ? { ...t, ...patch } : t)),
    );
  return (
    <>
      <div className="mb-2 text-[13px] font-medium">{k === "business" ? "Panels" : "Tiles"}</div>
      <DragList
        items={tiles}
        id={(t) => t.name + tiles.indexOf(t)}
        onChange={(n) => setTiles(k, n)}
        row={(t, i, h) => (
          <div className="flex items-center gap-2.5 p-2.5">
            {h}
            <input
              value={t.name}
              onChange={(e) => upd(i, { name: e.target.value })}
              className={cn(inputCls, "max-w-[220px]")}
            />
            <input
              value={t.desc}
              onChange={(e) => upd(i, { desc: e.target.value })}
              className={inputCls}
              placeholder="Short description"
            />
            <Remove
              label={t.name}
              onClick={() =>
                setTiles(
                  k,
                  tiles.filter((_, n) => n !== i),
                )
              }
            />
          </div>
        )}
      />
      <div className="mt-2.5">
        <Button onClick={() => setTiles(k, [...tiles, { name: "New tile", desc: "" }])}>
          + Add {k === "business" ? "panel" : "tile"}
        </Button>
      </div>
    </>
  );
}

export function HomepageEditor() {
  const home = useHome();
  const { data: cats } = useSuspenseQuery(categoriesQuery());
  const { data: brands } = useSuspenseQuery(brandsQuery());
  const { data: prods } = useSuspenseQuery(productsQuery());
  const [open, setOpen] = useState<SectionKey | null>(null);
  const [pick, setPick] = useState<"categories" | "products" | "maisons" | null>(null);
  const [fromSec, setFromSec] = useState<number | null>(null);
  const [overSec, setOverSec] = useState<number | null>(null);

  const catOf = (id: string) => cats.find((c) => c.id === id);
  const brandOf = (id: string) => brands.find((b) => b.id === id);
  const prodOf = (id: string) => prods.rows.find((p) => p.id === id);

  const body = (k: SectionKey): ReactNode => {
    const copy = home.copy[k];
    switch (k) {
      case "hero":
        return (
          <>
            <CopyFields k={k} copy={copy} />
            <HeroMedia items={home.hero} />
            <label className="flex max-w-[320px] flex-col gap-1.5 text-[12px] text-muted-foreground">
              Button (optional)
              <input placeholder="No button — as approved" className={inputCls} />
            </label>
          </>
        );
      case "categories":
        return (
          <>
            <CopyFields k={k} copy={copy} />
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium">
                Categories shown · {home.categories.length}
              </span>
              <span className="text-[12px] text-muted-foreground">
                Drag to reorder — the first tile is first on the page
              </span>
            </div>
            <DragList
              items={home.categories}
              id={(x) => x}
              onChange={(n) => setList("categories", n)}
              row={(id, i, h) => {
                const c = catOf(id);
                return (
                  <div className="flex items-center gap-3 p-2.5">
                    {h}
                    <span className="w-5 text-[12px] text-muted-foreground">{i + 1}</span>
                    <b className="flex-1 text-[13.5px] font-medium">{c?.name ?? id}</b>
                    <span className="text-[12px] text-muted-foreground">
                      {c ? `${formatNumber(c.count)} products` : ""}
                    </span>
                    <Remove
                      label={c?.name ?? id}
                      onClick={() =>
                        setList(
                          "categories",
                          home.categories.filter((x) => x !== id),
                        )
                      }
                    />
                  </div>
                );
              }}
            />
            <div className="mt-2.5">
              <Button onClick={() => setPick("categories")}>+ Add category</Button>
            </div>
          </>
        );
      case "curated":
        return (
          <>
            <CopyFields k={k} copy={copy} showSub={false} />
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium">
                Products shown · {home.products.length}
              </span>
              <span className="text-[12px] text-muted-foreground">
                Drag to reorder — a priced Add to Bag product should lead
              </span>
            </div>
            <DragList
              items={home.products}
              id={(x) => x}
              onChange={(n) => setList("products", n)}
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
                      onClick={() =>
                        setList(
                          "products",
                          home.products.filter((x) => x !== id),
                        )
                      }
                    />
                  </div>
                );
              }}
            />
            <div className="mt-2.5">
              <Button onClick={() => setPick("products")}>+ Add product</Button>
            </div>
          </>
        );
      case "maisons":
        return (
          <>
            <CopyFields k={k} copy={copy} />
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium">Maisons shown · {home.maisons.length}</span>
              <span className="text-[12px] text-muted-foreground">Drag to reorder logos</span>
            </div>
            <DragList
              items={home.maisons}
              id={(x) => x}
              onChange={(n) => setList("maisons", n)}
              row={(id, i, h) => {
                const b = brandOf(id);
                return (
                  <div className="flex items-center gap-3 p-2.5">
                    {h}
                    <span className="w-5 text-[12px] text-muted-foreground">{i + 1}</span>
                    <span className="rounded border border-border px-2.5 py-1 font-head text-[11px] tracking-[.14em]">
                      {(b?.name ?? id).toUpperCase()}
                    </span>
                    <span className="flex-1 text-[12px] text-muted-foreground">
                      {b?.categories}
                    </span>
                    <Remove
                      label={b?.name ?? id}
                      onClick={() =>
                        setList(
                          "maisons",
                          home.maisons.filter((x) => x !== id),
                        )
                      }
                    />
                  </div>
                );
              }}
            />
            <div className="mt-2.5">
              <Button onClick={() => setPick("maisons")}>+ Add maison</Button>
            </div>
          </>
        );
      case "business":
      case "packaging":
        return (
          <>
            <CopyFields k={k} copy={copy} />
            <TileEditor k={k} tiles={home[k]} />
          </>
        );
      default:
        return (
          <>
            <CopyFields k={k} copy={copy} showSub={k !== "lifestyle"} />
            <button
              type="button"
              onClick={() => toast("Image upload connects to your API later")}
              className="relative block aspect-[21/7] w-full max-w-[560px] rounded-lg border border-border"
              style={{ background: "linear-gradient(120deg,#1a1712,#5e4d3b)" }}
            >
              <em className="absolute bottom-2 right-3 text-[11px] not-italic text-white/85">
                Replace image
              </em>
            </button>
            {k === "concierge" && (
              <label className="mt-3.5 flex max-w-[320px] flex-col gap-1.5 text-[12px] text-muted-foreground">
                Button text
                <input defaultValue="Speak with our Concierge" className={inputCls} />
              </label>
            )}
          </>
        );
    }
  };

  const options =
    pick === "categories"
      ? cats
          .filter((c) => !home.categories.includes(c.id))
          .map((c) => ({ id: c.id, name: c.name, sub: `${formatNumber(c.count)} products` }))
      : pick === "products"
        ? prods.rows
            .filter((p) => !home.products.includes(p.id))
            .map((p) => ({
              id: p.id,
              name: p.name,
              sub: `${p.brand} · ${p.price ? `${formatNumber(p.offer ?? p.price)} EGP` : "On request"}`,
              color: p.color,
            }))
        : brands
            .filter((b) => !home.maisons.includes(b.id))
            .map((b) => ({ id: b.id, name: b.name, sub: b.categories }));

  return (
    <>
      <p className="mb-3 text-[12.5px] text-muted-foreground">
        Switch a section off to take it off the homepage, drag sections to change their order, and
        open one to edit its text and what it lists.
      </p>
      <div className="flex flex-col gap-2.5">
        {home.order.map((k, i) => {
          const on = home.on[k],
            expanded = open === k;
          return (
            <section
              key={k}
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
                if (fromSec !== null && fromSec !== i) setOrder(reorder(home.order, fromSec, i));
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
                <div className={cn("min-w-0 flex-1", !on && "opacity-55")}>
                  <b className="block text-[14px] font-medium">{SECTION_INFO[k].name}</b>
                  <span className="text-[12px] text-muted-foreground">
                    {SECTION_INFO[k].hint}
                    {k === "categories"
                      ? ` · ${home.categories.length} listed`
                      : k === "curated"
                        ? ` · ${home.products.length} listed`
                        : k === "maisons"
                          ? ` · ${home.maisons.length} listed`
                          : ""}
                  </span>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11.5px]",
                    on ? "bg-good-bg text-good" : "bg-muted text-muted-foreground",
                  )}
                >
                  {on ? "● On the homepage" : "○ Hidden"}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : k)}
                  className="text-[12.5px] underline underline-offset-[3px]"
                >
                  {expanded ? "Close" : "Edit"}
                </button>
                <Toggle
                  on={on}
                  onChange={() => {
                    toggleSection(k);
                    toast(
                      `${SECTION_INFO[k].name} ${on ? "hidden from" : "shown on"} the homepage`,
                    );
                  }}
                  label={SECTION_INFO[k].name}
                />
              </div>
              {expanded && <div className="border-t border-line-soft px-5 py-4">{body(k)}</div>}
            </section>
          );
        })}
      </div>
      {pick && (
        <Picker
          title={
            pick === "categories"
              ? "Add a category"
              : pick === "products"
                ? "Add a product"
                : "Add a maison"
          }
          options={options}
          onClose={() => setPick(null)}
          onPick={(id) => {
            setList(pick, [...home[pick], id]);
            setPick(null);
          }}
        />
      )}
    </>
  );
}
