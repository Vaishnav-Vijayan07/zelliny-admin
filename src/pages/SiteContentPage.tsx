import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/admin/primitives";
import { Button, Card, DataTable, PageHeader, type Column } from "@/components/admin/page";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";
const areaCls =
  "w-full min-w-0 resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] leading-normal outline-none focus:border-primary";

interface SitePage {
  id: string;
  name: string;
  slug: string;
  en: boolean;
  ar: boolean;
  edited: string;
  bodyEn: string;
  bodyAr: string;
}
const PAGES: SitePage[] = [
  {
    id: "home",
    name: "Homepage",
    slug: "",
    en: true,
    ar: true,
    edited: "today",
    bodyEn: "",
    bodyAr: "",
  },
  ...[
    "About Us",
    "Corporate Gifting",
    "Contact",
    "Returns & Refunds",
    "Delivery Information",
    "Privacy Policy",
    "Terms & Conditions",
    "FAQ",
    "404 — Page not found",
  ].map((name, i) => ({
    id: String(i),
    name,
    slug: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    en: true,
    ar: i !== 8,
    edited: ["2 d", "today", "1 w", "1 w", "2 w", "1 m", "1 m", "3 d", "1 w"][i]! + " ago",
    bodyEn: "",
    bodyAr: "",
  })),
];

function Field({
  label,
  req,
  hint,
  children,
}: {
  label: ReactNode;
  req?: boolean;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex min-w-0 flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        {label}
        {req && <em className="not-italic text-bad">*</em>}
      </label>
      {children}
      {hint && <div className="text-[12px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
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
function Bi({
  label,
  en,
  ar,
  onEn,
  onAr,
  rows,
}: {
  label: string;
  en: string;
  ar: string;
  onEn: (v: string) => void;
  onAr: (v: string) => void;
  rows?: number;
}) {
  const box = (v: string, on: (v: string) => void, rtl: boolean) =>
    rows ? (
      <textarea
        rows={rows}
        value={v}
        dir={rtl ? "rtl" : undefined}
        onChange={(e) => on(e.target.value)}
        className={cn(areaCls, rtl && "text-right")}
      />
    ) : (
      <input
        value={v}
        dir={rtl ? "rtl" : undefined}
        onChange={(e) => on(e.target.value)}
        className={cn(inputCls, rtl && "text-right")}
      />
    );
  return (
    <div className="mb-1.5">
      <div className="mb-2 text-[13px] font-medium">{label}</div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label={<>{tag("EN", true)} English</>}>{box(en, onEn, false)}</Field>
        <Field label={<>{tag("AR", false)} العربية</>}>{box(ar, onAr, true)}</Field>
      </div>
    </div>
  );
}
const Dot = ({ on }: { on: boolean }) =>
  on ? <span className="text-good">● Published</span> : <span className="text-warn">● Draft</span>;

const TABS = ["Pages", "Footer & SEO"] as const;
type Tab = (typeof TABS)[number];

export default function SiteContentPage() {
  const [tab, setTab] = useState<Tab>("Pages");
  const [pages, setPages] = useState(PAGES);
  const [edit, setEdit] = useState<SitePage | null>(null);
  const [f, setF] = useState({
    news: "Receive first word of new arrivals and private offers.",
    newsAr: "كن أول من يعرف بالوصول الجديد والعروض الخاصة.",
    wa: "+20 10 3848 4841",
    email: "info@zelliny.com",
    ig: "@zelliny",
    meta: "Zelliny — the house of luxury fragrance, beauty and gifts in Egypt.",
    metaAr: "زيليني — بيت العطور والجمال والهدايا الفاخرة في مصر.",
  });
  const [about, setAbout] = useState({ title: "", titleAr: "", slug: "" });

  const navigate = useNavigate();
  const open = (p: SitePage) => {
    if (p.id === "home") {
      navigate({ to: "/content/homepage" });
      return;
    }
    setEdit(p);
    setAbout({ title: p.name, titleAr: "", slug: p.slug });
  };
  const savePage = () => {
    if (!edit || !about.title.trim()) {
      toast("Add the page title first");
      return;
    }
    setPages((ps) =>
      ps.map((p) =>
        p.id === edit.id
          ? {
              ...edit,
              name: about.title.trim(),
              slug: about.slug.trim() || p.slug,
              edited: "just now",
            }
          : p,
      ),
    );
    toast(`${about.title.trim()} saved`);
    setEdit(null);
  };

  const columns: Column<SitePage>[] = [
    {
      header: "Page",
      cell: (p) => (
        <div>
          <b className="font-medium">{p.name}</b>
          <div className="text-[12px] text-muted-foreground">/{p.slug}</div>
        </div>
      ),
    },
    { header: "EN", cell: (p) => <Dot on={p.en} /> },
    { header: "AR", cell: (p) => <Dot on={p.ar} /> },
    { header: "Last edited", cell: (p) => p.edited },
    {
      header: "actions",
      headerNode: "",
      align: "right",
      cell: (p) => <Button onClick={() => open(p)}>Edit</Button>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Site content"
        subtitle="Change what customers see — without calling the developer."
        actions={
          <>
            <Button onClick={() => toast("Opens the site in a new tab")}>Preview site</Button>
            <Button primary onClick={() => toast("Content published")}>
              Publish changes
            </Button>
          </>
        }
      />
      <div className="mb-[18px] flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px]",
              t === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Pages" && (
        <Card>
          <DataTable columns={columns} rows={pages} rowKey={(p) => p.id} onRowClick={open} />
        </Card>
      )}

      {tab === "Footer & SEO" && (
        <Card>
          <h3 className="mb-3 text-[15px]">Footer, contact & site SEO</h3>
          <Bi
            label="Newsletter line"
            en={f.news}
            ar={f.newsAr}
            onEn={(v) => setF({ ...f, news: v })}
            onAr={(v) => setF({ ...f, newsAr: v })}
          />
          <div className="grid gap-3.5 sm:grid-cols-3">
            <Field label="WhatsApp">
              <input
                value={f.wa}
                onChange={(e) => setF({ ...f, wa: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Email">
              <input
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Instagram">
              <input
                value={f.ig}
                onChange={(e) => setF({ ...f, ig: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <Bi
            label="Default meta description"
            en={f.meta}
            ar={f.metaAr}
            onEn={(v) => setF({ ...f, meta: v })}
            onAr={(v) => setF({ ...f, metaAr: v })}
            rows={2}
          />
          <div className="mt-2">
            <Button primary onClick={() => toast("Footer & SEO saved")}>
              Save
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[88vh] max-w-[720px] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Edit page · {edit?.name}
            </DialogTitle>
          </DialogHeader>
          <Bi
            label="Page title"
            en={about.title}
            ar={about.titleAr}
            onEn={(v) => setAbout({ ...about, title: v })}
            onAr={(v) => setAbout({ ...about, titleAr: v })}
          />
          <Bi
            label="Content"
            en={edit?.bodyEn ?? ""}
            ar={edit?.bodyAr ?? ""}
            onEn={(v) => edit && setEdit({ ...edit, bodyEn: v })}
            onAr={(v) => edit && setEdit({ ...edit, bodyAr: v })}
            rows={7}
          />
          <Field label="Page address">
            <input
              value={about.slug}
              onChange={(e) => setAbout({ ...about, slug: e.target.value })}
              className={inputCls}
            />
          </Field>
          {edit && (
            <div className="grid gap-x-8 sm:grid-cols-2">
              {(
                [
                  ["en", "English version published"],
                  ["ar", "Arabic version published"],
                ] as const
              ).map(([k, l]) => (
                <div
                  key={k}
                  className="flex items-center justify-between gap-3.5 border-b border-line-soft py-2.5"
                >
                  <span className="text-[13.5px]">{l}</span>
                  <Toggle
                    on={edit[k]}
                    onChange={() => setEdit({ ...edit, [k]: !edit[k] })}
                    label={l}
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEdit(null)}>Cancel</Button>
            <Button primary onClick={savePage}>
              Save page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
