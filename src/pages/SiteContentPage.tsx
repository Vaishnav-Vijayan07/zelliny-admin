// Site content: pages (with draft / publish), announcement bar, top menu, footer & SEO.
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button, Card, DataTable, PageHeader, type Column } from "@/components/admin/page";
import { SectionsPage } from "@/components/admin/SectionsPage";
import { AnnouncementTab, FooterTab, MenuTab } from "@/components/admin/SiteContentTabs";
import { TextPageDialog } from "@/components/admin/SitePageBits";
import { TouchCtx, useDone } from "@/components/admin/SiteContentUi";
import {
  DB,
  bump,
  publishPages,
  useSiteContent,
  type SitePage,
} from "@/components/admin/SiteContentFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TABS = ["Pages", "Announcement bar", "Top menu", "Footer & SEO"] as const;
type Tab = (typeof TABS)[number];
const TYPE_LABEL = { Sections: "Sections", Text: "Text page", FAQ: "Questions" } as const;

export default function SiteContentPage() {
  useSiteContent();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Pages");
  const [editing, setEditing] = useState<string | null>(null);
  const [textPage, setTextPage] = useState<SitePage | null>(null);
  const [askPub, setAskPub] = useState(false);
  const [doneNode, done] = useDone();

  const dirty = DB.dirty;
  // The homepage is published separately, from its own page.
  const waiting = DB.pages.filter((p) => dirty.has(p.id) && p.id !== "home");

  const open = (p: SitePage) => {
    if (p.id === "home") navigate({ to: "/content/homepage" });
    else if (p.type === "Sections") setEditing(p.id);
    else setTextPage(p);
  };

  if (editing)
    return (
      <>
        <SectionsPage
          id={editing}
          done={done}
          onBack={() => setEditing(null)}
          crumb={
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="underline underline-offset-[3px]"
            >
              Site content
            </button>
          }
        />
        {doneNode}
      </>
    );

  const columns: Column<SitePage>[] = [
    {
      header: "Page",
      cell: (p) => (
        <div>
          <b className="font-medium">{p.name[0]}</b>
          <div className="text-[12px] text-muted-foreground">{p.address}</div>
        </div>
      ),
    },
    {
      header: "Type",
      cell: (p) => (
        <span className="rounded-md border border-border px-2 py-0.5 text-[12px] text-muted-foreground">
          {TYPE_LABEL[p.type]}
        </span>
      ),
    },
    { header: "Last updated", className: "whitespace-nowrap", cell: (p) => p.upd },
    {
      header: "Status",
      cell: (p) =>
        dirty.has(p.id) ? (
          <span className="whitespace-nowrap rounded-full bg-warn-bg px-2.5 py-0.5 text-[12px] text-warn">
            ● Draft · not published yet
          </span>
        ) : (
          <span className="rounded-full bg-good-bg px-2.5 py-0.5 text-[12px] text-good">
            ● Published
          </span>
        ),
    },
    {
      header: "actions",
      headerNode: "",
      align: "right",
      cell: (p) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Button onClick={() => open(p)}>Edit</Button>
        </span>
      ),
    },
  ];

  const publish = () => {
    const names = waiting.map((p) => p.name[0]);
    publishPages(waiting.map((p) => p.id));
    setAskPub(false);
    done(
      `${names.length} page${names.length > 1 ? "s" : ""} published`,
      `${names.join(", ")} ${names.length > 1 ? "are" : "is"} now live on zelliny.com.`,
    );
  };

  return (
    <TouchCtx.Provider value={bump}>
      <PageHeader
        title="Site content"
        subtitle="Change what customers read on zelliny.com — pages, the homepage, the top menu, the footer and the announcement bar — in English and Arabic."
        actions={
          <>
            <Button
              onClick={() => toast("Opens zelliny.com in a new tab, with unpublished drafts shown")}
            >
              Preview site
            </Button>
            <Button
              primary
              onClick={() => {
                if (waiting.length) setAskPub(true);
                else
                  done(
                    "Nothing to publish",
                    "All pages are already live. Save a page first, then publish it here.",
                  );
              }}
            >
              Publish changes{waiting.length ? ` (${waiting.length})` : ""}
            </Button>
          </>
        }
      />
      <div className="mb-[18px] flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border">
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
          <DataTable columns={columns} rows={DB.pages} rowKey={(p) => p.id} onRowClick={open} />
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            "Save" keeps your changes as a draft. Nothing changes on zelliny.com until you press
            "Publish changes" (or "Publish homepage" on the Homepage).
          </p>
        </Card>
      )}
      {tab === "Announcement bar" && <AnnouncementTab done={done} />}
      {tab === "Top menu" && <MenuTab done={done} />}
      {tab === "Footer & SEO" && <FooterTab done={done} />}

      {textPage && <TextPageDialog page={textPage} done={done} onClose={() => setTextPage(null)} />}

      <Dialog open={askPub} onOpenChange={setAskPub}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Publish {waiting.length} page{waiting.length > 1 ? "s" : ""}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">These drafts will go live on zelliny.com straight away.</p>
          <div className="rounded-lg border border-border px-3.5 py-1.5">
            {waiting.map((p) => (
              <p
                key={p.id}
                className="flex justify-between border-t border-line-soft py-2 text-[13.5px] first:border-0"
              >
                <span>{p.name[0]}</span>
                <small className="text-muted-foreground">{p.address}</small>
              </p>
            ))}
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            The homepage is published separately, from its own page.
          </p>
          <DialogFooter>
            <Button onClick={() => setAskPub(false)}>Cancel</Button>
            <Button primary onClick={publish}>
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {doneNode}
    </TouchCtx.Provider>
  );
}
