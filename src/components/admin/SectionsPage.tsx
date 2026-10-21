// Full page editor for a page built from sections (Homepage, About Us, Corporate Gifting).
import { toast } from "sonner";
import { Button } from "@/components/admin/page";
import { SectionsEditor } from "@/components/admin/SectionsEditor";
import { AddressBlock, LangSwitches } from "@/components/admin/SitePageBits";
import { SeoBlock, TouchCtx } from "@/components/admin/SiteContentUi";
import {
  getPage,
  publishPages,
  savePageDraft,
  touch,
  useSiteContent,
} from "@/components/admin/SiteContentFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

type Done = (title: string, line: string) => void;

export function SectionsPage({
  id,
  onBack,
  crumb,
  done,
}: {
  id: string;
  onBack: () => void;
  /** The breadcrumb link back to the Site content list. */
  crumb: React.ReactNode;
  done: Done;
}) {
  useSiteContent();
  const page = getPage(id);
  const [askPub, setAskPub] = useState(false);
  if (!page) return null;
  const home = id === "home";
  const name = page.name[0];

  return (
    <TouchCtx.Provider value={() => touch(id)}>
      <div className="mb-[22px]">
        <div className="mb-2 text-[12px] text-muted-foreground">
          {crumb} / {name}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight">{name}</h1>
            <p className="mt-1 text-muted-foreground">
              Choose which sections appear on {home ? "zelliny.com" : "this page"}, their order, and
              what each one shows.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => toast(`Opens a preview of ${name} in a new tab`)}>
              Preview {home ? "homepage" : "page"}
            </Button>
            {home ? (
              <Button primary onClick={() => setAskPub(true)}>
                Publish homepage
              </Button>
            ) : (
              <Button
                primary
                onClick={() => {
                  savePageDraft(id);
                  onBack();
                  done(
                    "Saved as a draft",
                    `${name} is saved. Press "Publish changes" to put it live.`,
                  );
                }}
              >
                Save page
              </Button>
            )}
          </div>
        </div>
      </div>

      <SectionsEditor page={page} />

      {!home && (
        <>
          <section className="mb-5 mt-6 rounded-[10px] border border-border bg-surface p-5">
            <h3 className="mb-3 text-[15px]">Search engines (SEO) for this page</h3>
            <SeoBlock seo={page.seo} address={page.address} fallback={name} />
          </section>
          <section className="mb-5 rounded-[10px] border border-border bg-surface p-5">
            <h3 className="mb-1 text-[15px]">Page address and languages</h3>
            <AddressBlock page={page} done={done} />
            <LangSwitches page={page} />
          </section>
        </>
      )}

      {askPub && (
        <Dialog open onOpenChange={(o) => !o && setAskPub(false)}>
          <DialogContent className="max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="font-head text-[18px] font-normal">
                Publish the homepage?
              </DialogTitle>
            </DialogHeader>
            <p className="text-[13.5px]">
              Your homepage changes go live on zelliny.com straight away. Other pages are not
              affected.
            </p>
            <DialogFooter>
              <Button onClick={() => setAskPub(false)}>Cancel</Button>
              <Button
                primary
                onClick={() => {
                  publishPages(["home"]);
                  setAskPub(false);
                  done("Homepage published", "The homepage is now live on zelliny.com.");
                }}
              >
                Publish homepage
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </TouchCtx.Provider>
  );
}
