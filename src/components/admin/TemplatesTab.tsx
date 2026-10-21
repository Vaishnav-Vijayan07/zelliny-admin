import { useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { discountsQuery } from "@/lib/api/sections.functions";
import { cn } from "@/lib/utils";
import { OwnerOnly } from "@/components/admin/OwnerOnly";
import { Button, Card } from "@/components/admin/page";
import { SearchSelect } from "@/components/admin/SearchSelect";
import { StatusBadge } from "@/components/admin/primitives";
import { benefit, statusOf, usePromotions } from "@/components/admin/DiscountFlow";
import {
  MERGE_FIELDS,
  deleteTemplate,
  saveTemplate,
  useRawTemplates,
  type Channel,
  type MessageTemplate,
  type TemplateDraft,
} from "@/components/admin/MessageTemplates";
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

/** Highlights {first_name}, {product}, {order} and {offer_code} inside a message. */
const withTags = (t: string) =>
  t.split(/(\{\w+\})/g).map((x, i) =>
    /^\{\w+\}$/.test(x) ? (
      <b key={i} className="font-medium text-foreground">
        {x}
      </b>
    ) : (
      x
    ),
  );

/** Settings › Message templates: every template used by the WhatsApp / email boxes. */
export function TemplatesTab({ done }: { done: (title: string, line: string) => void }) {
  const templates = useRawTemplates();
  const { data } = useSuspenseQuery(discountsQuery());
  const promos = usePromotions(data);
  const activeCoupons = promos.filter((p) => p.type === "coupon" && statusOf(p).label === "Active");
  const [edit, setEdit] = useState<TemplateDraft | null>(null);
  const [del, setDel] = useState<MessageTemplate | null>(null);
  const [lang, setLang] = useState<0 | 1>(0);
  const refs = [useRef<HTMLTextAreaElement>(null), useRef<HTMLTextAreaElement>(null)];

  const open = (t?: MessageTemplate) =>
    setEdit(t ? { ...t } : { name: "", text: "", textAr: "", channel: "WhatsApp", offer: "" });
  const insert = (field: string) => {
    if (!edit) return;
    const el = refs[lang]!.current;
    const tag = `{${field}}`;
    const key = lang ? "textAr" : "text";
    const cur = edit[key];
    const a = el?.selectionStart ?? cur.length;
    const b = el?.selectionEnd ?? a;
    setEdit({ ...edit, [key]: cur.slice(0, a) + tag + cur.slice(b) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(a + tag.length, a + tag.length);
    });
  };
  const save = () => {
    if (!edit) return;
    if (!edit.name.trim()) return void toast("Add a template name");
    if (!edit.text.trim() || !edit.textAr.trim())
      return void toast("Write the message in English and Arabic");
    if (/\{offer_code\}/.test(edit.text + edit.textAr) && !edit.offer)
      return void toast("Choose the offer code");
    saveTemplate({ ...edit, name: edit.name.trim() });
    const wa = edit.channel === "WhatsApp";
    setEdit(null);
    done(
      "Template saved",
      wa
        ? "Sent to Meta for approval. It can be used once approved."
        : "It can be used straight away.",
    );
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[15px]">Message templates</h3>
        <Button primary onClick={() => open()}>
          + Add template
        </Button>
      </div>
      <p className="mb-4 text-[12.5px] text-muted-foreground">
        Used in every WhatsApp and email box — on the customer page, orders, the wishlist and
        Browsing & follow-up. Each has English and Arabic; the customer gets their language.
        WhatsApp templates must be approved by Meta before they can be sent.
      </p>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[.1em] text-muted-foreground">
            <th className="w-[17%] pb-2 font-normal">Name</th>
            <th className="w-[11%] pb-2 font-normal">Channel</th>
            <th className="w-[17%] pb-2 font-normal">Status</th>
            <th className="pb-2 font-normal">Message</th>
            <th className="w-[110px] pb-2" />
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => {
            const offerLive = !t.offer || activeCoupons.some((p) => p.code === t.offer);
            return (
              <tr key={t.id} className="border-t border-border align-top">
                <td className="py-3 pr-3 font-medium">{t.name}</td>
                <td className="py-3 pr-3">
                  <span className="rounded border border-border px-2 py-0.5 text-[11.5px] text-muted-foreground">
                    {t.channel}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  {t.channel === "Email" ? (
                    <StatusBadge tone="ok">Ready</StatusBadge>
                  ) : t.approved ? (
                    <StatusBadge tone="ok">Approved by Meta</StatusBadge>
                  ) : (
                    <StatusBadge tone="info">Waiting for approval</StatusBadge>
                  )}
                </td>
                <td className="py-3 pr-3 text-muted-foreground">
                  {withTags(t.text)}
                  {t.offer && (
                    <small className={cn("mt-0.5 block text-[12px]", offerLive ? "" : "text-warn")}>
                      Offer: {t.offer}
                      {offerLive
                        ? ""
                        : " — this offer has ended, so it won't be sent. Choose another."}
                    </small>
                  )}
                </td>
                <td className="whitespace-nowrap py-3 text-right">
                  <button
                    type="button"
                    className="mr-3 underline underline-offset-[3px]"
                    onClick={() => open(t)}
                  >
                    Edit
                  </button>
                  <OwnerOnly>
                    <button
                      type="button"
                      className="text-bad underline underline-offset-[3px] disabled:opacity-40"
                      disabled={templates.length < 2}
                      onClick={() => setDel(t)}
                    >
                      Delete
                    </button>
                  </OwnerOnly>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-[900px] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              {edit?.id ? "Edit template" : "Add template"}
            </DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="flex flex-col gap-3.5 text-[12px] text-muted-foreground">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  Template name
                  <input
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                    placeholder="e.g. Ramadan offer"
                    className={inputCls}
                    autoFocus
                  />
                </label>
                <div className="flex flex-col gap-1.5">
                  Channel
                  <div className="inline-flex w-fit rounded-full border border-border p-0.5">
                    {(["WhatsApp", "Email"] as Channel[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEdit({ ...edit, channel: c })}
                        className={cn(
                          "h-7 rounded-full px-4 text-[12.5px]",
                          edit.channel === c
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid gap-3.5 md:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  English
                  <textarea
                    ref={refs[0]}
                    rows={4}
                    value={edit.text}
                    onFocus={() => setLang(0)}
                    onChange={(e) => setEdit({ ...edit, text: e.target.value })}
                    className={areaCls}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  العربية
                  <textarea
                    ref={refs[1]}
                    rows={4}
                    dir="rtl"
                    value={edit.textAr}
                    onFocus={() => setLang(1)}
                    onChange={(e) => setEdit({ ...edit, textAr: e.target.value })}
                    className={cn(areaCls, "text-right")}
                  />
                </label>
              </div>
              <div>
                <div className="mb-1.5">Click to insert where the cursor is</div>
                <div className="flex flex-wrap gap-1.5">
                  {MERGE_FIELDS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insert(f);
                      }}
                      className="h-7 rounded-full border border-border bg-surface px-2.5 font-mono text-[12px] hover:border-primary"
                    >
                      {`{${f}}`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-w-[380px]">
                <div className="mb-1.5">Offer code — fills in {"{offer_code}"}</div>
                <SearchSelect
                  value={edit.offer}
                  allLabel="No offer code"
                  items={activeCoupons.map((p) => ({
                    value: p.code,
                    label: `${benefit(p)} · ${p.code}`,
                  }))}
                  onChange={(v) => setEdit({ ...edit, offer: v })}
                  searchable={false}
                  className="text-[14px]"
                />
                <p className="mt-1.5">
                  From Discounts & offers. If the offer ends, the template shows a warning instead
                  of sending an old code.
                </p>
              </div>
              {edit.channel === "WhatsApp" && (
                <p className="text-[12.5px]">
                  After saving, a changed WhatsApp template goes to Meta for approval ("Waiting for
                  approval") and can be sent once approved.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEdit(null)}>Cancel</Button>
            <Button primary onClick={save}>
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Delete "{del?.name}"?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            It disappears from every WhatsApp and email box. This can't be undone.
          </p>
          <DialogFooter>
            <Button onClick={() => setDel(null)}>Cancel</Button>
            <button
              type="button"
              className="h-9 rounded-lg bg-bad px-4 text-[13.5px] text-white"
              onClick={() => {
                if (del) deleteTemplate(del.id);
                setDel(null);
                done("Template deleted", "It is no longer available to the team.");
              }}
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
