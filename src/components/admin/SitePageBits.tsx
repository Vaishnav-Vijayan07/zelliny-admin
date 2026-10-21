// Pieces shared by the text-page window and the section-page editor: page address, language
// switches, the text / FAQ editor and the window that edits a text page.
import { useReducer, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

/** The page address is locked; "Change" opens a warning and the old address forwards to the new one. */
export function AddressBlock({ page, done }: { page: SitePage; done: Done }) {
  const touch = useTouch();
  const [ask, setAsk] = useState(false);
  const [v, setV] = useState(page.address);
  return (
    <div className="mt-5">
      <Fld label="Page address" hint="Locked so links to this page don't break.">
        <div className="flex items-center gap-3">
          <input
            readOnly
            value={`zelliny.com${page.address}`}
            className={cn(inputCls, "bg-[#f7f7f7] text-muted-foreground")}
          />
          <button
            type="button"
            onClick={() => {
              setV(page.address);
              setAsk(true);
            }}
            className="whitespace-nowrap text-[13px] underline underline-offset-[3px]"
          >
            Change
          </button>
        </div>
      </Fld>
      {ask && (
        <Dialog open onOpenChange={(o) => !o && setAsk(false)}>
          <DialogContent className="max-w-[540px]">
            <DialogHeader>
              <DialogTitle className="font-head text-[18px] font-normal">
                Change the page address?
              </DialogTitle>
            </DialogHeader>
            <p className="text-[13.5px]">
              Links already shared, and Google, point to <b>zelliny.com{page.address}</b>. The old
              address will forward to the new one automatically, so nothing breaks.
            </p>
            <Fld label="New address">
              <input value={v} onChange={(e) => setV(e.target.value)} className={inputCls} />
            </Fld>
            <DialogFooter>
              <Button onClick={() => setAsk(false)}>Cancel</Button>
              <Button
                primary
                onClick={() => {
                  const n = v.trim();
                  if (!n.startsWith("/")) {
                    toast("Start the address with /");
                    return;
                  }
                  const old = page.address;
                  page.address = n;
                  setAsk(false);
                  touch();
                  done("Address changed", `zelliny.com${old} now forwards to zelliny.com${n}.`);
                }}
              >
                Change address
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function Switch({
  on,
  disabled,
  onClick,
  label,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-disabled={!!disabled}
      onClick={onClick}
      className={cn(
        "relative h-[22px] w-[38px] flex-none rounded-full transition-colors",
        on ? "bg-primary" : "bg-[#c9c9c9]",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <i
        className={cn(
          "absolute top-[3px] size-4 rounded-full bg-white transition-all",
          on ? "left-[19px]" : "left-[3px]",
        )}
      />
    </button>
  );
}

/** English is always published. Arabic can only be switched on once its title and content are filled in. */
export function LangSwitches({ page }: { page: SitePage }) {
  const touch = useTouch();
  const ok = arReady(page);
  const on = ok && page.arOn;
  const need = page.type === "Sections" ? "title" : "title and content";
  return (
    <div className="mt-4 grid gap-x-8 border-t border-line-soft pt-2 sm:grid-cols-2">
      <div className="flex items-center justify-between gap-3.5 py-2.5">
        <span className="text-[13.5px]">English version published</span>
        <Switch
          on
          label="English version published"
          onClick={() => toast("The English version is always published")}
        />
      </div>
      <div className="flex items-center justify-between gap-3.5 py-2.5">
        <span className="text-[13.5px]">
          Arabic version published
          {!ok && (
            <small className="mt-0.5 block text-[12px] text-warn">
              Fill in the Arabic {need} first
            </small>
          )}
        </span>
        <Switch
          on={on}
          disabled={!ok}
          label="Arabic version published"
          onClick={() => {
            if (!ok) {
              toast(`Fill in the Arabic ${need} first`);
              return;
            }
            page.arOn = !page.arOn;
            touch();
          }}
        />
      </div>
    </div>
  );
}

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
          <AddressBlock page={copy} done={done} />
          <LangSwitches page={copy} />
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
