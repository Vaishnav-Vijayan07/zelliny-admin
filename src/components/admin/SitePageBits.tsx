// Pieces shared by the text-page window and the section-page editor: the text / FAQ editor and
// the window that edits a text page.
import { useReducer, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/admin/page";
import {
  BiBox,
  BiField,
  DragList,
  Fld,
  Remove,
  Rte,
  SeoBlock,
  SubHead,
  Tag,
  TouchCtx,
  inputCls,
  useTouch,
} from "@/components/admin/SiteContentUi";
import { arReady, nid, savePageDraft, type SitePage } from "@/components/admin/SiteContentFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Done = (title: string, line: string) => void;

/** Contact, Returns, Privacy…: formatted text in English and Arabic. FAQ: a list of questions. */
function TextBody({ page }: { page: SitePage }) {
  const touch = useTouch();
  if (page.type === "FAQ")
    return (
      <>
        <SubHead title={`Questions · ${page.qa.length}`} note="Drag to reorder" />
        <DragList
          items={page.qa}
          id={(x) => x.id}
          onChange={(n) => {
            page.qa = n;
            touch();
          }}
          row={(x, i, h) => (
            <div className="p-3">
              <div className="mb-2.5 flex items-center gap-2.5">
                {h}
                <b className="flex-1 text-[13px] font-medium text-muted-foreground">
                  Question {i + 1}
                </b>
                <Remove
                  label={`question ${i + 1}`}
                  onClick={() => {
                    page.qa = page.qa.filter((y) => y !== x);
                    touch();
                  }}
                />
              </div>
              <BiField label="Question" labelAr="السؤال" v={x.q} />
              <BiField label="Answer" labelAr="الإجابة" v={x.a} rows={3} />
            </div>
          )}
        />
        <div className="mt-2.5">
          <Button
            onClick={() => {
              page.qa.push({ id: nid("q"), q: ["", ""], a: ["", ""] });
              touch();
            }}
          >
            + Add question
          </Button>
        </div>
      </>
    );
  return (
    <>
      <SubHead title="Content" />
      <div className="grid gap-3.5 md:grid-cols-2">
        {([0, 1] as const).map((i) => (
          <div key={i}>
            <div className="mb-1.5">
              <Tag lang={i ? "AR" : "EN"} />
            </div>
            <Rte
              value={page.body[i]}
              rtl={i === 1}
              onChange={(h) => {
                page.body[i] = h;
                touch();
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

/** Edit a text or FAQ page in a window; "Save page" keeps it as a draft. */
export function TextPageDialog({
  page,
  onClose,
  done,
}: {
  page: SitePage;
  onClose: () => void;
  done: Done;
}) {
  const [copy] = useState<SitePage>(() => structuredClone(page));
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const save = () => {
    if (!copy.name[0].trim()) {
      toast("Add the English page title");
      return;
    }
    if (!arReady(copy)) copy.arOn = false;
    Object.assign(page, copy);
    savePageDraft(page.id);
    onClose();
    done("Saved as a draft", `${copy.name[0]} is saved. Press "Publish changes" to put it live.`);
  };
  return (
    <TouchCtx.Provider value={refresh}>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-[960px] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Edit page · {page.name[0]}
            </DialogTitle>
          </DialogHeader>
          <SubHead title="Page title" />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Fld label={<Tag lang="EN" />}>
              <BiBox v={copy.name} i={0} />
            </Fld>
            <Fld label={<Tag lang="AR" />}>
              <BiBox v={copy.name} i={1} />
            </Fld>
          </div>
          <TextBody page={copy} />
          <div className="mt-5 rounded-[10px] border border-border p-4">
            <h4 className="mb-3 text-[14px] font-medium">Search engines (SEO)</h4>
            <SeoBlock seo={copy.seo} address={copy.address} fallback={copy.name[0]} />
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Cancel</Button>
            <Button primary onClick={save}>
              Save page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TouchCtx.Provider>
  );
}
