import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/admin/primitives";
import { Button, PageHeader } from "@/components/admin/page";
import { editService, setSection, useGift, type GiftService } from "@/components/admin/GiftFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex min-w-0 flex-col gap-1.5">
      <label className="text-[12px] text-muted-foreground">{label}</label>
      {children}
      {hint && <div className="text-[12px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
const Plain = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
}) => (
  <Field label={label} hint={hint}>
    <input defaultValue={value} className={inputCls} />
  </Field>
);

type Key = "wrap" | "pers";

function Tile({ s, k, i, onEdit }: { s: GiftService; k: Key; i: number; onEdit: () => void }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
      <div
        className="aspect-[16/8]"
        style={{
          background: `linear-gradient(145deg, ${s.color}, color-mix(in srgb, ${s.color} 60%, #fff))`,
        }}
      />
      <div className="p-4 text-[13px]">
        <div className="flex items-center justify-between gap-2">
          <b>{s.name}</b>
          <Toggle
            on={s.on}
            onChange={() => {
              editService(k, i, { on: !s.on });
              toast(`${s.name} ${!s.on ? "offered" : "no longer offered"}`);
            }}
            label={s.name}
          />
        </div>
        <div className="text-[12px] text-muted-foreground" dir="rtl">
          {s.nameAr}
        </div>
        <p className="my-2 text-muted-foreground">
          <span className="font-medium text-foreground">{s.price}</span> · {s.desc}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="text-[12.5px] underline underline-offset-[3px]"
        >
          Edit →
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  sub,
  on,
  onToggle,
  children,
}: {
  title: string;
  sub: string;
  on: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="mb-[18px] overflow-hidden rounded-[10px] border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-[18px] border-b border-border px-[22px] py-[18px]">
        <div className="min-w-0 flex-1">
          <h3 className="mb-0.5 font-head text-[18px] font-normal">{title}</h3>
          <p className="text-[12.5px] text-muted-foreground">{sub}</p>
        </div>
        <span
          className={cn(
            "whitespace-nowrap rounded-full px-2.5 py-1 text-[12px]",
            on ? "bg-good-bg text-good" : "bg-muted text-muted-foreground",
          )}
        >
          {on ? "● Live on the site" : "○ Switched off"}
        </span>
        <div className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
          <span>{on ? "On" : "Off"}</span>
          <Toggle on={on} onChange={onToggle} label={title} />
        </div>
      </div>
      {!on && (
        <div className="border-b border-border bg-hover px-[22px] py-2.5 text-[12.5px] text-muted-foreground">
          Switched off — customers don't see this anywhere on the site. You can still set prices and
          options, ready for when you switch it on.
        </div>
      )}
      <div className="p-[22px]">{children}</div>
    </section>
  );
}

export default function GiftServicesPage() {
  const g = useGift();
  const [edit, setEdit] = useState<{ k: Key; i: number } | null>(null);
  const cur = edit ? g[edit.k][edit.i] : null;
  const [form, setForm] = useState({ name: "", nameAr: "", price: "", desc: "" });

  const open = (k: Key, i: number) => {
    const s = g[k][i]!;
    setForm({ name: s.name, nameAr: s.nameAr, price: s.price, desc: s.desc });
    setEdit({ k, i });
  };
  const save = () => {
    if (!edit || !form.name.trim()) {
      toast("Add a name first");
      return;
    }
    editService(edit.k, edit.i, {
      name: form.name.trim(),
      nameAr: form.nameAr.trim(),
      price: form.price.trim() || "Complimentary",
      desc: form.desc.trim(),
    });
    toast(`${form.name.trim()} saved`);
    setEdit(null);
  };
  const flip = (k: Key, label: string) => {
    setSection(k, !g.live[k]);
    toast(
      `${label} ${!g.live[k] ? "is now live on the site" : "switched off — hidden from customers"}`,
    );
  };

  return (
    <>
      <PageHeader
        title="Gift services"
        subtitle="Wrapping, gift messages, engraving and embossing — offered on product pages and at checkout. Each service is switched on or off here, and only here."
        actions={
          <>
            <Button onClick={() => toast("Opens the site in a new tab")}>
              Preview on the site
            </Button>
            <Button primary onClick={() => toast("Gift services saved")}>
              Save
            </Button>
          </>
        }
      />
      <Section
        title="Gift wrapping & presentation"
        sub="Wrapping, message card and hidden prices — chosen by the customer at checkout."
        on={g.live.wrap}
        onToggle={() => flip("wrap", "Gift wrapping")}
      >
        <div className="grid gap-[18px] sm:grid-cols-2 min-[1100px]:grid-cols-4">
          {g.wrap.map((s, i) => (
            <Tile key={s.name + i} s={s} k="wrap" i={i} onEdit={() => open("wrap", i)} />
          ))}
        </div>
        <div className="mt-[18px] grid gap-[18px] lg:grid-cols-3">
          <Field label="Default wrapping">
            <select className={cn(inputCls, "cursor-pointer")}>
              <option>Ribbon wrapping</option>
              <option>No wrapping unless asked</option>
            </select>
          </Field>
          <Plain label="Gift message — max characters" value="200" />
          <Field label="Message card language">
            <select className={cn(inputCls, "cursor-pointer")}>
              <option>English or Arabic · customer chooses</option>
              <option>English only</option>
            </select>
          </Field>
        </div>
      </Section>
      <Section
        title="Engraving & embossing"
        sub="Personalisation on eligible products. Engraved or embossed items become non-returnable at checkout."
        on={g.live.pers}
        onToggle={() => flip("pers", "Engraving & embossing")}
      >
        <div className="grid gap-[18px] sm:grid-cols-2">
          {g.pers.map((s, i) => (
            <Tile key={s.name + i} s={s} k="pers" i={i} onEdit={() => open("pers", i)} />
          ))}
        </div>
        <div className="mt-[18px] grid gap-[18px] lg:grid-cols-3">
          <Plain
            label="Fonts offered"
            value="Serif capitals, Script"
            hint="Customer picks on the product page"
          />
          <Plain label="Extra production time" value="+2 working days" />
          <Field label="Maximum lines">
            <select defaultValue="2" className={cn(inputCls, "cursor-pointer")}>
              <option>1</option>
              <option>2</option>
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <div className="text-[13.5px]">Available on these categories</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[
              "Writing Instruments",
              "Smoking Accessories",
              "Leather Goods",
              "Watches",
              "Jewellery",
            ].map((c) => (
              <span key={c} className="rounded-full bg-muted px-2.5 py-1 text-[12px]">
                {c}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            Any single product can be excluded from its own Gifting tab.
          </p>
        </div>
      </Section>
      <p className="text-[12px] text-muted-foreground">
        Turning a service off here hides it everywhere — product pages, the bag and checkout. Orders
        already placed keep what the customer chose.
      </p>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Edit · {cur?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name (English)">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="الاسم (عربي)">
              <input
                dir="rtl"
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                className={cn(inputCls, "text-right")}
              />
            </Field>
          </div>
          <Field label="Price" hint="Type Complimentary or an amount in EGP">
            <input
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Short description">
            <textarea
              rows={2}
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
              className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-primary"
            />
          </Field>
          <DialogFooter>
            <Button onClick={() => setEdit(null)}>Cancel</Button>
            <Button primary onClick={save}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
