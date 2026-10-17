// The attribute editor (name, preview type, categories, status), used for "+ Add attribute" and for each existing attribute.
// Saves go to the shared attribute store (AttributeFlow) — swap for API mutations later.
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { categoriesQuery } from "@/lib/api/sections.functions";
import type { AttributePreviewType, AttributeRow } from "@/lib/api/section-types";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/admin/primitives";
import { Dropdown } from "@/components/admin/Dropdown";
import {
  addAttribute,
  attributeUsedBy,
  deleteAttribute,
  editAttribute,
} from "@/components/admin/AttributeFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PREVIEW_TYPES: { value: AttributePreviewType; label: string; hint: string }[] = [
  { value: "TEXT", label: "Text", hint: "Plain words, e.g. EDT, EDP, Parfum" },
  { value: "COLOR", label: "Colour", hint: "A colour swatch, e.g. Black, Gold" },
  { value: "ICON", label: "Icon / image", hint: "A small picture, e.g. leather texture" },
  { value: "NUMBER", label: "Number + unit", hint: "A size with a unit, e.g. 50 ml, 100 ml" },
];
const UNITS = ["ml", "g", "cm", "mm", "pcs"];

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";

function Btn({
  primary,
  children,
  onClick,
  danger,
  disabled,
}: {
  primary?: boolean;
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-9 whitespace-nowrap rounded-lg border px-3.5 text-[13px] transition disabled:pointer-events-none disabled:opacity-40",
        primary
          ? "border-primary bg-primary text-primary-foreground hover:opacity-[.88]"
          : danger
            ? "border-bad text-bad hover:bg-bad hover:text-white"
            : "border-border bg-surface hover:border-primary",
      )}
    >
      {children}
    </button>
  );
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-[18px] min-w-0 rounded-[10px] border border-border bg-surface">
      {title && (
        <div className="flex items-center justify-between gap-2.5 px-5 pt-4">
          <h3 className="text-[15px]">{title}</h3>
        </div>
      )}
      <div className={cn("px-5 pb-5", title ? "pt-3" : "pt-4")}>{children}</div>
    </section>
  );
}

const Lang = ({ t, dark }: { t: string; dark?: boolean }) => (
  <span
    className={cn(
      "rounded-[3px] px-1.5 py-px text-[10px] font-semibold tracking-[.08em]",
      dark ? "bg-primary text-primary-foreground" : "bg-[#f0f0f0] text-foreground",
    )}
  >
    {t}
  </span>
);

/** "How it looks on the product page" — sample options in the chosen style. */
function Preview({ name, type, unit }: { name: string; type: AttributePreviewType; unit: string }) {
  const pill =
    "inline-flex items-center gap-2 rounded-full border border-[#cfcfcf] bg-surface px-3.5 py-1.5 text-foreground";
  const opts: ReactNode[] =
    type === "COLOR"
      ? (
          [
            ["Black", "#0a0a0a"],
            ["Gold", "#c9a227"],
            ["Tan", "#b08968"],
          ] as const
        ).map(([n, c]) => (
          <span key={n} className={pill}>
            <i className="size-3.5 rounded-full" style={{ background: c }} />
            {n}
          </span>
        ))
      : type === "ICON"
        ? (
            [
              ["Leather", "#7A5638,#3E2A1C"],
              ["Canvas", "#C9B79A,#8F7E62"],
            ] as const
          ).map(([n, g]) => (
            <span key={n} className={pill}>
              <i
                className="size-[18px] rounded"
                style={{ background: `linear-gradient(160deg, ${g})` }}
              />
              {n}
            </span>
          ))
        : (type === "NUMBER"
            ? ["30", "50", "100"].map((n) => `${n} ${unit}`)
            : ["Eau de Toilette", "Eau de Parfum", "Parfum"]
          ).map((n) => (
            <span key={n} className={pill}>
              {n}
            </span>
          ));
  return (
    <div className="mt-4 rounded-[10px] bg-hover p-3.5 text-[13px] text-muted-foreground">
      How it looks on the product page:
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <b className="font-medium text-foreground">{name || "Attribute"}:</b>
        {opts}
      </div>
    </div>
  );
}

export function AttributeEditor({ attribute }: { attribute: AttributeRow | null }) {
  const navigate = useNavigate();
  const { data: categories } = useSuspenseQuery(categoriesQuery());
  const isNew = !attribute;
  const [name, setName] = useState(attribute?.name ?? "");
  const [nameAr, setNameAr] = useState(attribute?.nameAr ?? "");
  const [previewType, setPreviewType] = useState<AttributePreviewType>(
    attribute?.previewType ?? "TEXT",
  );
  const [unit, setUnit] = useState(attribute?.unit ?? "ml");
  const [cats, setCats] = useState<string[]>(attribute?.categories ?? []);
  const [active, setActive] = useState(attribute ? attribute.status.label !== "Inactive" : true);
  const [bad, setBad] = useState(false);
  const [askDelete, setAskDelete] = useState(false);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setBad(true);
      toast("Type the attribute name first");
      return;
    }
    const status = {
      label: active ? "Active" : "Inactive",
      tone: active ? ("ok" as const) : ("mute" as const),
    };
    const common = {
      name: trimmed,
      nameAr: nameAr.trim(),
      previewType,
      unit,
      categories: cats,
      status,
    };
    if (attribute) {
      editAttribute(attribute.id, common);
      toast("Attribute saved");
      navigate({ to: "/attributes" });
      return;
    }
    const id =
      trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || `attr-${Date.now()}`;
    addAttribute({ id, ...common, values: [] });
    toast(`${trimmed} created — now add its values`);
    navigate({ to: "/attributes/$attributeId/values", params: { attributeId: id } });
  };

  const used = attribute ? attributeUsedBy(attribute) : 0;
  const doDelete = () => {
    if (!attribute) return;
    deleteAttribute(attribute.id);
    toast(`${attribute.name} deleted`);
    navigate({ to: "/attributes" });
  };
  const makeInactive = () => {
    if (!attribute) return;
    editAttribute(attribute.id, { status: { label: "Inactive", tone: "mute" } });
    setActive(false);
    setAskDelete(false);
    toast(`${attribute.name} is now inactive`);
  };

  return (
    <>
      <div className="mb-[22px]">
        <div className="mb-2 text-[12px] text-muted-foreground">
          <Link to="/attributes" className="underline underline-offset-[3px]">
            Attributes
          </Link>{" "}
          / {attribute?.name ?? "New"}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight">
              {isNew ? "Add attribute" : name || attribute.name}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {isNew
                ? "Create the attribute, then add its values."
                : "Values are managed separately."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isNew && (
              <Btn
                onClick={() =>
                  navigate({
                    to: "/attributes/$attributeId/values",
                    params: { attributeId: attribute.id },
                  })
                }
              >
                Manage values ({attribute.values.length})
              </Btn>
            )}
            <Btn primary onClick={save}>
              {isNew ? "Create attribute" : "Save changes"}
            </Btn>
          </div>
        </div>
      </div>

      <Card title="Details">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Lang t="EN" dark /> Name <em className="not-italic text-bad">*</em>
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setBad(false);
              }}
              placeholder="Attribute name"
              className={cn(inputCls, bad && "border-bad bg-bad-bg")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Lang t="AR" /> الاسم
            </span>
            <input
              dir="rtl"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className={cn(inputCls, "text-right")}
            />
          </div>
        </div>
        <p className="mb-5 mt-1.5 text-[12px] text-muted-foreground">
          e.g. Colour, Size, Concentration, Material — customers see the Arabic name on the Arabic
          site.
        </p>

        <div className="mb-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          Preview type <em className="not-italic text-bad">*</em>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {PREVIEW_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setPreviewType(t.value)}
              className={cn(
                "rounded-lg border px-3.5 py-3 text-left transition",
                previewType === t.value
                  ? "border-primary shadow-[inset_0_0_0_1px_#0a0a0a]"
                  : "border-border hover:border-primary",
              )}
            >
              <b className="block text-[14px] font-normal">{t.label}</b>
              <span className="mt-1 block text-[12px] leading-snug text-muted-foreground">
                {t.hint}
              </span>
            </button>
          ))}
        </div>
        {previewType === "NUMBER" && (
          <div className="mt-3.5 max-w-[260px]">
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              Unit <em className="not-italic text-bad">*</em>
            </div>
            <Dropdown
              value={unit}
              onChange={setUnit}
              className="h-9 w-full text-[14px] text-foreground"
              options={UNITS.map((u) => ({ value: u, label: u }))}
            />
          </div>
        )}
        <Preview name={name} type={previewType} unit={unit} />

        <div className="mb-1.5 mt-5 text-[12px] text-muted-foreground">Used in categories</div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = cats.includes(c.name);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setCats((x) => (on ? x.filter((y) => y !== c.name) : [...x, c.name]))
                }
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[13px] transition",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface hover:border-primary",
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          The product editor only offers this attribute for products in these categories. Leave all
          off to offer it everywhere.
        </p>

        <div className="mt-4 flex items-center justify-between gap-3.5 border-t border-line-soft pt-3.5">
          <div>
            <div className="text-[13.5px]">Active</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              Off hides it from the product editor — nothing is deleted
            </div>
          </div>
          <Toggle
            on={active}
            onChange={() => setActive((x) => !x)}
            label={active ? "Active — click to deactivate" : "Inactive — click to activate"}
          />
        </div>
      </Card>

      {attribute && (
        <section className="mt-[18px] rounded-[10px] border border-bad-bg bg-surface">
          <div className="border-b border-bad-bg px-5 py-3.5 text-[10.5px] uppercase tracking-[.16em] text-bad">
            Danger zone
          </div>
          <div className="flex flex-wrap items-center justify-between gap-5 px-5 py-4">
            <p className="max-w-[640px] text-[13px] text-muted-foreground">
              <b className="font-medium text-foreground">Delete this attribute permanently.</b>{" "}
              {used ? (
                <>
                  It is used by <b className="font-medium text-foreground">{used} products</b> —
                  make it inactive instead, or remove it from those products first.
                </>
              ) : (
                `It has ${attribute.values.length} value(s) and is not used by any product.`
              )}
            </p>
            <Btn danger onClick={() => setAskDelete(true)}>
              Delete attribute
            </Btn>
          </div>
        </section>
      )}

      <Dialog open={askDelete} onOpenChange={setAskDelete}>
        <DialogContent className="max-w-[480px]">
          {used > 0 ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-head text-[18px] font-normal">
                  {attribute?.name} is in use
                </DialogTitle>
              </DialogHeader>
              <p className="text-[13.5px]">
                <b className="font-semibold">{attribute?.name}</b> is used by{" "}
                <b className="font-semibold">{used} products</b>. Deleting it would remove these
                options from those products on the website.
              </p>
              <p className="text-[12.5px] text-muted-foreground">
                Make it inactive instead — it stops appearing in the product editor and nothing is
                lost.
              </p>
              <DialogFooter>
                <Btn onClick={() => setAskDelete(false)}>Cancel</Btn>
                <Btn primary onClick={makeInactive}>
                  Make inactive
                </Btn>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-head text-[18px] font-normal">
                  Delete attribute?
                </DialogTitle>
              </DialogHeader>
              <p className="text-[13.5px]">
                <b className="font-semibold">{attribute?.name}</b> and its{" "}
                {attribute?.values.length ?? 0} value(s) will be deleted permanently. It is not used
                by any product. This cannot be undone.
              </p>
              <DialogFooter>
                <Btn onClick={() => setAskDelete(false)}>Cancel</Btn>
                <Btn danger onClick={doDelete}>
                  Delete permanently
                </Btn>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
