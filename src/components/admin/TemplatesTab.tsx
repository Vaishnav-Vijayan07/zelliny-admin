import { useState } from "react";
import { toast } from "sonner";
import { Button, Card } from "@/components/admin/page";
import {
  deleteTemplate,
  saveTemplate,
  useMessageTemplates,
  type MessageTemplate,
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

type Draft = { id?: string | undefined; name: string; text: string };

/** Highlights {first_name}, {product} and {order} inside a message. */
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

/** Settings › Message templates: every template used by the WhatsApp / email / SMS boxes. */
export function TemplatesTab() {
  const templates = useMessageTemplates();
  const [edit, setEdit] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const open = (t?: MessageTemplate) => {
    setErr("");
    setEdit(t ? { ...t } : { name: "", text: "" });
  };
  const save = () => {
    if (!edit) return;
    if (!edit.name.trim() || !edit.text.trim()) {
      setErr("Name and message are required.");
      return;
    }
    saveTemplate({ id: edit.id, name: edit.name.trim(), text: edit.text.trim() });
    setEdit(null);
    toast("Template saved");
  };
  const bold = "font-medium text-foreground";
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[15px]">Message templates</h3>
        <Button primary onClick={() => open()}>
          + Add template
        </Button>
      </div>
      <p className="mb-4 text-[12.5px] text-muted-foreground">
        Used in every WhatsApp, email and SMS box — on the customer page, the customer list, orders
        and the wishlist. <b className={bold}>{"{first_name}"}</b> fills in each customer's first
        name; <b className={bold}>{"{product}"}</b> and <b className={bold}>{"{order}"}</b> fill in
        the product or order.
      </p>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[.1em] text-muted-foreground">
            <th className="w-[22%] pb-2 font-normal">Name</th>
            <th className="pb-2 font-normal">Message</th>
            <th className="w-[130px] pb-2" />
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr key={t.id} className="border-t border-border align-top">
              <td className="py-3 pr-3 font-medium">{t.name}</td>
              <td className="py-3 pr-3 text-muted-foreground">{withTags(t.text)}</td>
              <td className="whitespace-nowrap py-3 text-right">
                <button
                  type="button"
                  className="mr-3 underline underline-offset-[3px]"
                  onClick={() => open(t)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-bad underline underline-offset-[3px] disabled:opacity-40"
                  disabled={templates.length < 2}
                  onClick={() => {
                    deleteTemplate(t.id);
                    toast("Template deleted");
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              {edit?.id ? "Edit template" : "Add template"}
            </DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="flex flex-col gap-3.5 text-[12px] text-muted-foreground">
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
              <label className="flex flex-col gap-1.5">
                Message — use {"{first_name}"}, {"{product}"}, {"{order}"}
                <textarea
                  value={edit.text}
                  onChange={(e) => setEdit({ ...edit, text: e.target.value })}
                  rows={5}
                  className={areaCls}
                />
              </label>
              {err && <p className="text-[12.5px] text-bad">{err}</p>}
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
    </Card>
  );
}
