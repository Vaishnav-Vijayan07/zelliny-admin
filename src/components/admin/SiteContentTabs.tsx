// Announcement bar, Top menu and Footer & SEO tabs of Site content.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { SET } from "@/components/admin/SettingsFlow";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DROP_ON, useFileDrop } from "@/lib/image-upload";
import { Button } from "@/components/admin/page";
import { SearchSelect } from "@/components/admin/SearchSelect";
import { Toggle } from "@/components/admin/primitives";
import {
  BiBox,
  BiField,
  DragList,
  Fld,
  LinkField,
  Remove,
  ScheduleBlock,
  SeoBlock,
  SubHead,
  SwitchRow,
  TxtField,
  imgStyle,
  inputCls,
  pickImage,
  useTouch,
} from "@/components/admin/SiteContentUi";
import { todayIso } from "@/components/admin/DateField";
import {
  DB,
  blankLink,
  blankMenuItem,
  nid,
  type MenuGroup,
  type MenuItem,
  type MenuLink,
} from "@/components/admin/SiteContentFlow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Done = (title: string, line: string) => void;

/** A store detail typed once in Settings › Store — the footer, invoices and emails take it from there. */
function FromSettings({ value, rtl }: { value: string; rtl?: boolean }) {
  return (
    <input
      readOnly
      dir={rtl ? "rtl" : undefined}
      value={value}
      className={cn(inputCls, "bg-[#f7f7f7] text-muted-foreground", rtl && "text-right")}
    />
  );
}
const EditInSettings = () => (
  <Link
    to="/settings"
    className="font-sans text-[12.5px] font-normal underline underline-offset-[3px]"
  >
    Edit in Settings →
  </Link>
);
const Panel = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-[10px] border border-border bg-surface p-5">{children}</div>
);

/* ---------- Announcement bar ---------- */
export function AnnouncementTab({ done }: { done: Done }) {
  const touch = useTouch();
  const a = DB.ann;
  const t = todayIso();
  const live = a.on && !(a.from && a.from > t) && !(a.to && a.to < t);
  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <b className="text-[15px] font-medium">Announcement bar</b>
          <div className="text-[12.5px] text-muted-foreground">
            The thin strip at the very top of every page on zelliny.com.
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[12px]",
              live
                ? "bg-good-bg text-good"
                : a.on
                  ? "bg-warn-bg text-warn"
                  : "bg-muted text-muted-foreground",
            )}
          >
            ● {live ? "On the site" : a.on ? "Scheduled" : "Switched off"}
          </span>
          <Toggle
            on={a.on}
            label="Announcement bar"
            onChange={() => {
              a.on = !a.on;
              touch();
            }}
          />
        </div>
      </div>
      <div className="mb-1 text-[12px] text-muted-foreground">Preview</div>
      <div className="mb-4 rounded-lg bg-primary py-2.5 text-center text-[12px] tracking-[.14em] text-primary-foreground">
        {(a.msgs[0]?.t[0] ?? "").toUpperCase() || " "}
      </div>
      <SubHead
        title={`Messages · ${a.msgs.length} of 3`}
        note="With more than one, they take turns"
      />
      <DragList
        items={a.msgs}
        id={(m) => m.id}
        onChange={(n) => {
          a.msgs = n;
          touch();
        }}
        row={(m, i, h) => (
          <div className="p-3.5">
            <div className="mb-3 flex items-center gap-2.5">
              {h}
              <b className="flex-1 text-[13.5px] font-medium">Message {i + 1}</b>
              <Remove
                label={`message ${i + 1}`}
                onClick={() => {
                  a.msgs = a.msgs.filter((x) => x !== m);
                  touch();
                }}
              />
            </div>
            <BiField label="Text" labelAr="النص" v={m.t} />
            <Fld label="Opens (optional)">
              <LinkField o={m} />
            </Fld>
          </div>
        )}
      />
      {a.msgs.length < 3 && (
        <div className="mt-2.5">
          <Button
            onClick={() => {
              a.msgs.push({ id: nid("am"), t: ["", ""], link: "" });
              touch();
            }}
          >
            + Add message
          </Button>
        </div>
      )}
      <div className="mt-5 max-w-[420px]">
        <Fld label="Each message shows for">
          <SearchSelect
            value={a.speed}
            items={["3", "5", "8"].map((v) => ({ value: v, label: `${v} seconds` }))}
            onChange={(v) => {
              if (v) {
                a.speed = v;
                touch();
              }
            }}
            searchable={false}
            className="text-[14px]"
          />
        </Fld>
      </div>
      <ScheduleBlock o={a} what="the bar" />
      <div className="mt-5">
        <Button
          primary
          onClick={() => done("Announcement bar saved", "It is now live on zelliny.com.")}
        >
          Save announcement bar
        </Button>
      </div>
    </Panel>
  );
}

/* ---------- Footer & SEO ---------- */
export function FooterTab({ done }: { done: Done }) {
  const touch = useTouch();
  const f = DB.foot;
  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <h3 className="mb-3 text-[15px]">Newsletter</h3>
        <BiField label="Line above the sign-up box" labelAr="السطر فوق خانة الاشتراك" v={f.news} />
        <BiField label="Text inside the email box" labelAr="النص داخل خانة البريد" v={f.nph} />
        <BiField label="Button text" labelAr="نص الزر" v={f.nbtn} />
        <BiField
          label="Thank-you message (after signing up)"
          labelAr="رسالة الشكر بعد الاشتراك"
          v={f.nthx}
        />
      </Panel>
      <Panel>
        <h3 className="mb-3 flex items-center justify-between text-[15px]">
          Contact
          <EditInSettings />
        </h3>
        <div className="mb-4 grid gap-3.5 sm:grid-cols-3">
          <Fld label="Phone">
            <FromSettings value={SET.store.phone} />
          </Fld>
          <Fld label="WhatsApp">
            <TxtField o={f} k="wa" />
          </Fld>
          <Fld label="Email">
            <FromSettings value={SET.store.email} />
          </Fld>
        </div>
        <div className="mb-4 grid gap-3.5 sm:grid-cols-2">
          <Fld label="Address">
            <FromSettings value={SET.store.address} />
          </Fld>
          <Fld label="العنوان">
            <FromSettings value={SET.store.addressAr} rtl />
          </Fld>
        </div>
        <BiField label="Opening hours" labelAr="مواعيد العمل" v={f.hours} />
      </Panel>
      <Panel>
        <h3 className="mb-1 text-[15px]">Social media</h3>
        <p className="mb-3 text-[12px] text-muted-foreground">
          Only accounts with a link show in the footer.
        </p>
        <div className="grid gap-3.5 sm:grid-cols-2">
          {f.soc.map((s) => (
            <Fld key={s[0]} label={s[0]}>
              <input
                value={s[1]}
                placeholder={`Paste the link to your ${s[0]} page`}
                onChange={(e) => {
                  s[1] = e.target.value;
                  touch();
                }}
                className={inputCls}
              />
            </Fld>
          ))}
        </div>
      </Panel>
      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px]">Footer links</h3>
          <button
            type="button"
            className="text-[12.5px] underline underline-offset-[3px]"
            onClick={() => {
              f.cols.push({ id: nid("f"), t: ["", ""], l: [] });
              touch();
            }}
          >
            + Add column
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {f.cols.map((c) => (
            <div key={c.id} className="rounded-[10px] border border-border p-3.5">
              <div className="mb-2 grid gap-3 sm:grid-cols-2">
                <Fld label="Column title · EN">
                  <BiBox v={c.t} i={0} />
                </Fld>
                <Fld label="عنوان العمود · AR">
                  <BiBox v={c.t} i={1} />
                </Fld>
              </div>
              <DragList
                items={c.l}
                id={(l) => l.id}
                onChange={(n) => {
                  c.l = n;
                  touch();
                }}
                row={(l, _i, h) => (
                  <div className="flex items-center gap-2 p-2">
                    {h}
                    <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
                      <BiBox v={l.n} i={0} placeholder="Link name" />
                      <BiBox v={l.n} i={1} placeholder="اسم الرابط" />
                      <TxtField o={l} k="link" placeholder="/page" />
                    </div>
                    <Remove
                      label="link"
                      onClick={() => {
                        c.l = c.l.filter((x) => x !== l);
                        touch();
                      }}
                    />
                  </div>
                )}
              />
              <div className="mt-2.5 flex gap-2">
                <Button
                  onClick={() => {
                    c.l.push({ id: nid("l"), n: ["", ""], link: "" });
                    touch();
                  }}
                >
                  + Add link
                </Button>
                {f.cols.length > 1 && (
                  <Button
                    onClick={() => {
                      f.cols = f.cols.filter((x) => x !== c);
                      touch();
                    }}
                  >
                    Remove column
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <h3 className="mb-3 flex items-center justify-between text-[15px]">
          Company details (bottom line)
          <EditInSettings />
        </h3>
        <div className="mb-4 grid gap-3.5 sm:grid-cols-2">
          <Fld label="Registered company name">
            <FromSettings value={SET.store.legal} />
          </Fld>
          <Fld label="اسم الشركة">
            <FromSettings value={SET.store.legalAr} rtl />
          </Fld>
        </div>
        <div className="mb-4 grid gap-3.5 sm:grid-cols-2">
          <Fld label="Commercial register no.">
            <FromSettings value={SET.store.cr} />
          </Fld>
          <Fld label="Tax registration no.">
            <FromSettings value={SET.store.tax} />
          </Fld>
        </div>
        <BiField label="Copyright line" labelAr="سطر الحقوق" v={f.copy} />
      </Panel>
      <Panel>
        <h3 className="mb-3 text-[15px]">Default SEO — used for any page without its own</h3>
        <SeoBlock seo={f.seo} address="/" fallback="Zelliny" />
      </Panel>
      <div>
        <Button
          primary
          onClick={() =>
            done("Footer saved", "The footer and default SEO are now live on zelliny.com.")
          }
        >
          Save footer
        </Button>
      </div>
    </div>
  );
}

/* ---------- Top menu ---------- */
const MI_SIZE = "1600 × 1050 px · JPG, PNG or WebP";

function Thumb2({
  v,
  big,
  onChange,
}: {
  v: string;
  big?: boolean;
  /** Lets an image be dropped straight onto the thumbnail. */
  onChange?: (v: string) => void;
}) {
  const { over, bind } = useFileDrop();
  return (
    <span
      {...(onChange ? bind("thumb", (f) => onChange(URL.createObjectURL(f[0]!))) : {})}
      className={cn(
        over && DROP_ON,
        "grid flex-none place-items-center rounded-md text-[10.5px]",
        big ? "h-[100px] w-[150px]" : "h-[44px] w-[64px]",
        !v && "border-[1.5px] border-dashed border-[#e8d3ae] bg-[#fbf6ec] text-[#9a6200]",
      )}
      style={imgStyle(v)}
    >
      {v ? "" : onChange ? "Drop image" : "No image"}
    </span>
  );
}

function ImageActions({
  value,
  name,
  onChange,
  onRemove,
}: {
  value: string;
  name: string;
  onChange: (v: string) => void;
  onRemove: () => void;
}) {
  const act = "underline underline-offset-[3px]";
  const { over, bind } = useFileDrop();
  return (
    <span
      {...bind("actions", (f) => onChange(URL.createObjectURL(f[0]!)))}
      className={cn("flex gap-2.5 whitespace-nowrap rounded-md text-[12.5px]", over && DROP_ON)}
    >
      <button type="button" className={act} onClick={() => pickImage((u) => onChange(u))}>
        {value ? "Replace" : "Upload"}
      </button>
      {value && (
        <>
          <button
            type="button"
            className={act}
            onClick={() => {
              if (value.startsWith("seed:")) {
                toast(`${name}.jpg downloaded`);
                return;
              }
              const a = document.createElement("a");
              a.href = value;
              a.download = `${name}.jpg`;
              a.click();
            }}
          >
            Download
          </button>
          <button type="button" className={act} onClick={onRemove}>
            Remove
          </button>
        </>
      )}
    </span>
  );
}

function LinkRow({
  l,
  g,
  handle,
  onDelete,
  askRemove,
}: {
  l: MenuLink;
  g: MenuGroup;
  handle: React.ReactNode;
  onDelete: () => void;
  askRemove: (l: MenuLink) => void;
}) {
  const touch = useTouch();
  const name = `menu-${l.n[0] ? l.n[0].toLowerCase().replace(/[^a-z0-9]+/g, "-") : "link"}`;
  return (
    <div className="grid items-center gap-2.5 p-2 md:grid-cols-[16px_64px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)_auto]">
      {handle}
      <Thumb2
        v={l.img}
        onChange={(u) => {
          l.img = u;
          touch();
        }}
      />
      <div className="flex flex-col gap-1.5">
        <BiBox v={l.n} i={0} placeholder="Name" />
        {l.desc && <BiBox v={l.desc} i={0} placeholder="Line under the name" />}
      </div>
      <div className="flex flex-col gap-1.5">
        <BiBox v={l.n} i={1} placeholder="الاسم" />
        {l.desc && <BiBox v={l.desc} i={1} placeholder="السطر تحت الاسم" />}
      </div>
      <LinkField o={l} />
      <div className="flex items-center justify-between gap-2.5">
        <ImageActions
          value={l.img}
          name={name}
          onChange={(v) => {
            l.img = v;
            touch();
          }}
          onRemove={() => askRemove(l)}
        />
        <button
          type="button"
          title="Remove link"
          aria-label="Remove link"
          onClick={onDelete}
          className="text-muted-foreground hover:text-bad"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function GroupEditor({
  m,
  g,
  gi,
  askRemove,
}: {
  m: MenuItem;
  g: MenuGroup;
  gi: number;
  askRemove: (l: MenuLink) => void;
}) {
  const touch = useTouch();
  const [q, setQ] = useState("");
  const big = g.links.length > 10;
  const term = q.trim().toLowerCase();
  const shown = g.links.filter((l) => !term || l.n[0].toLowerCase().includes(term));
  const del = (l: MenuLink) => {
    g.links = g.links.filter((x) => x !== l);
    touch();
  };
  return (
    <div className="mt-4 rounded-[10px] border border-border p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <b className="text-[13.5px] font-medium">Column {gi + 1}</b>
        {m.groups.length > 1 && (
          <button
            type="button"
            className="text-[12.5px] text-muted-foreground hover:text-bad"
            onClick={() => {
              m.groups = m.groups.filter((x) => x !== g);
              touch();
            }}
          >
            Remove column
          </button>
        )}
      </div>
      <BiField label="Column title" labelAr="عنوان العمود" v={g.t} />
      <SubHead
        title={`Links · ${g.links.length}`}
        note="Each link: name, page it opens, and its own image · drag to reorder"
      />
      {big && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${g.links.length} links`}
          className={cn(inputCls, "mb-2.5 max-w-[320px]")}
        />
      )}
      <div className="mb-1 hidden grid-cols-[16px_64px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)_auto] gap-2.5 px-2 text-[11px] text-muted-foreground md:grid">
        <span />
        <span>Image</span>
        <span>Name · EN</span>
        <span>الاسم · AR</span>
        <span>Opens</span>
        <span />
      </div>
      <div
        className={cn(
          big && "max-h-[560px] overflow-y-auto rounded-lg border border-border bg-[#fafafa] p-2",
        )}
      >
        {term ? (
          shown.length ? (
            <div className="flex flex-col gap-1.5">
              {shown.map((l) => (
                <div key={l.id} className="rounded-lg border border-border bg-surface">
                  <LinkRow
                    l={l}
                    g={g}
                    handle={<span />}
                    onDelete={() => del(l)}
                    askRemove={askRemove}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-2.5 text-[12.5px] text-muted-foreground">No links match.</p>
          )
        ) : (
          <DragList
            items={g.links}
            id={(l) => l.id}
            onChange={(n) => {
              g.links = n;
              touch();
            }}
            row={(l, _i, h) => (
              <LinkRow l={l} g={g} handle={h} onDelete={() => del(l)} askRemove={askRemove} />
            )}
          />
        )}
      </div>
      {big && (
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          {term
            ? `${shown.length} of ${g.links.length} links match`
            : `${g.links.length} links · scroll inside the box to see them all`}
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => {
            g.links.push(blankLink(g.desc));
            setQ("");
            touch();
          }}
        >
          + Add link
        </Button>
        <span className="text-[12px] text-muted-foreground">
          Link image: {MI_SIZE} · a link without its own image shows the main image
        </span>
      </div>
    </div>
  );
}

function MenuBody({ m, askRemove }: { m: MenuItem; askRemove: (l: MenuLink | MenuItem) => void }) {
  const touch = useTouch();
  const slugName = `menu-${m.n[0] ? m.n[0].toLowerCase().replace(/[^a-z0-9]+/g, "-") : "item"}-main`;
  return (
    <>
      <BiField label="Menu name" labelAr="اسم القائمة" v={m.n} />
      <Fld label="Opens when clicked" className="mb-4">
        <LinkField o={m} />
      </Fld>
      <SubHead
        title="Main image"
        note={`Shows when the dropdown opens, before hovering on a link · ${MI_SIZE}`}
      />
      <div className="flex items-start gap-4">
        <Thumb2
          v={m.main}
          big
          onChange={(u) => {
            m.main = u;
            touch();
          }}
        />
        <div className="min-w-0 flex-1">
          <BiField
            label={'"Spotlight on" title under the main image'}
            labelAr="عنوان الصورة الرئيسية"
            v={m.sp}
          />
        </div>
        <div className="mt-8">
          <ImageActions
            value={m.main}
            name={slugName}
            onChange={(v) => {
              m.main = v;
              touch();
            }}
            onRemove={() => askRemove(m)}
          />
        </div>
      </div>
      <SubHead title="Button under the image" note="Same word for every link in this menu" />
      <BiField label="Button text" labelAr="نص الزر" v={m.btn} />
      <p className="-mt-2 mb-2 text-[12px] text-muted-foreground">
        When customers hover on a link, the image changes to that link's image and the "Spotlight
        on" title becomes the link's name. The title and button open the link's page.
      </p>
      {m.more && (
        <>
          <SwitchRow
            title={'"Discover more" link under the list'}
            on={m.more.on}
            note={m.more.on ? "Shown" : "Hidden"}
            onChange={() => {
              m.more!.on = !m.more!.on;
              touch();
            }}
          />
          {m.more.on && (
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Fld label="Text · EN">
                <BiBox v={m.more.t} i={0} />
              </Fld>
              <Fld label="النص · AR">
                <BiBox v={m.more.t} i={1} />
              </Fld>
              <Fld label="Opens">
                <LinkField o={m.more} />
              </Fld>
            </div>
          )}
        </>
      )}
      {m.groups.map((g, gi) => (
        <GroupEditor key={g.id} m={m} g={g} gi={gi} askRemove={askRemove} />
      ))}
      <div className="mt-3">
        <Button
          onClick={() => {
            m.groups.push({ id: nid("g"), t: ["", ""], desc: false, links: [] });
            touch();
          }}
        >
          + Add column
        </Button>
      </div>
    </>
  );
}

export function MenuTab({ done }: { done: Done }) {
  const touch = useTouch();
  const [open, setOpen] = useState<string | null>(null);
  const [rm, setRm] = useState<MenuLink | MenuItem | null>(null);
  const items = DB.menu;
  const linkCount = (m: MenuItem) => m.groups.reduce((a, g) => a + g.links.length, 0);
  const noImg = (m: MenuItem) =>
    m.groups.reduce((a, g) => a + g.links.filter((l) => !l.img).length, 0);
  return (
    <Panel>
      <b className="text-[15px] font-medium">Top menu</b>
      <p className="mb-3 text-[12.5px] text-muted-foreground">
        The links at the top of every page, and what opens when customers hover on them. Images show
        on desktop only — on phones the menu opens as a plain list.
      </p>
      <SubHead
        title={`Menu items · ${items.length}`}
        note="Drag to reorder · switch off to hide an item from the site"
      />
      <DragList
        items={items}
        id={(m) => m.id}
        onChange={(n) => {
          DB.menu = n;
          touch();
        }}
        row={(m, _i, h) => {
          const missing = noImg(m);
          const expanded = open === m.id;
          return (
            <>
              <div className="flex items-center gap-3.5 px-3.5 py-3">
                {h}
                <Thumb2 v={m.main} />
                <div className={cn("min-w-0 flex-1", !m.on && "opacity-55")}>
                  <b className="block text-[14px] font-medium">{m.n[0] || "New menu item"}</b>
                  <span className="text-[12px] text-muted-foreground">
                    {linkCount(m)} links in the dropdown
                    {missing ? (
                      <>
                        {" · "}
                        <span className="text-[#9a6200]">{missing} without their own image</span>
                      </>
                    ) : (
                      " · every link has its own image"
                    )}
                  </span>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11.5px]",
                    m.on ? "bg-good-bg text-good" : "bg-muted text-muted-foreground",
                  )}
                >
                  ● {m.on ? "On the site" : "Hidden"}
                </span>
                <button
                  type="button"
                  className="text-[12.5px] underline underline-offset-[3px]"
                  onClick={() => setOpen(expanded ? null : m.id)}
                >
                  {expanded ? "Close" : "Edit"}
                </button>
                <Toggle
                  on={m.on}
                  label={m.n[0] || "menu item"}
                  onChange={() => {
                    m.on = !m.on;
                    touch();
                  }}
                />
              </div>
              {expanded && (
                <div className="border-t border-line-soft px-5 py-4">
                  <MenuBody m={m} askRemove={setRm} />
                </div>
              )}
            </>
          );
        }}
      />
      <div className="mt-3">
        <Button
          onClick={() => {
            const n = blankMenuItem();
            DB.menu.push(n);
            setOpen(n.id);
            touch();
          }}
        >
          + Add menu item
        </Button>
      </div>
      <div className="mt-5">
        <Button
          primary
          onClick={() => done("Top menu saved", "The menu is now live on zelliny.com.")}
        >
          Save top menu
        </Button>
      </div>
      {rm && (
        <Dialog open onOpenChange={(o) => !o && setRm(null)}>
          <DialogContent className="max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-head text-[18px] font-normal">
                Remove this image?
              </DialogTitle>
            </DialogHeader>
            <p className="text-[13.5px]">
              The link stays in the menu. Until a new image is uploaded,{" "}
              {"main" in rm
                ? "the dropdown opens without a main image"
                : "the menu's main image shows when customers hover on it"}
              .
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setRm(null)}>Cancel</Button>
              <Button
                primary
                onClick={() => {
                  if ("main" in rm) rm.main = "";
                  else rm.img = "";
                  setRm(null);
                  touch();
                  done("Image removed", "The link now shows the main image of this menu.");
                }}
              >
                Remove image
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Panel>
  );
}
