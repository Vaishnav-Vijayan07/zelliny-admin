// The attribute editor (name, preview type, status), used for "+ Add attribute" and for each existing attribute.
// Saves go to the shared attribute store (AttributeFlow) — swap for API mutations later.
import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { AttributePreviewType, AttributeRow } from "@/lib/api/section-types";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/admin/primitives";
import { addAttribute, deleteAttribute, editAttribute } from "@/components/admin/AttributeFlow";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PREVIEW_TYPES: { value: AttributePreviewType; label: string; hint: string }[] = [
  { value: "TEXT", label: "Text", hint: "Shown as plain text, e.g. Small, Medium, Large" },
  { value: "COLOR", label: "Colour", hint: "Shown as a colour swatch" },
  { value: "ICON", label: "Icon", hint: "Shown as a small uploaded image" },
];

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

function Field({
  label,
  req,
  hint,
  children,
}: {
  label: ReactNode;
  req?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex min-w-0 flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        {label}
        {req && <em className="not-italic text-bad">*</em>}
      </label>
      {children}
      {hint && <div className="mt-0.5 text-[12px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

export function AttributeEditor({ attribute }: { attribute: AttributeRow | null }) {
  const navigate = useNavigate();
  const isNew = !attribute;
  const [name, setName] = useState(attribute?.name ?? "");
  const [previewType, setPreviewType] = useState<AttributePreviewType>(
    attribute?.previewType ?? "TEXT",
  );
  const [active, setActive] = useState(attribute ? attribute.status.label !== "Inactive" : true);
  const [askDelete, setAskDelete] = useState(false);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast("Name the attribute first");
      return;
    }
    const status = {
      label: active ? "Active" : "Inactive",
      tone: active ? ("ok" as const) : ("mute" as const),
    };
    if (attribute) {
      editAttribute(attribute.id, { name: trimmed, previewType, status });
      toast("Attribute saved");
      navigate({ to: "/attributes" });
      return;
    }
    const id =
      trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || `attr-${Date.now()}`;
    addAttribute({ id, name: trimmed, previewType, values: [], status });
    toast(`${trimmed} created`);
    navigate({ to: "/attributes/$attributeId/values", params: { attributeId: id } });
  };

  const used = !!attribute && attribute.values.length > 0;
  const doDelete = () => {
    if (!attribute) return;
    deleteAttribute(attribute.id);
    toast(`${attribute.name} deleted`);
    navigate({ to: "/attributes" });
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
        <Field label="Name" req hint="e.g. Colour, Size, Material">
          <Input autoFocus value={name} onChange={setName} placeholder="Attribute name" />
        </Field>
        <Field
          label="Preview type"
          req
          hint={PREVIEW_TYPES.find((t) => t.value === previewType)?.hint}
        >
          <div className="grid gap-2.5 sm:grid-cols-3">
            {PREVIEW_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setPreviewType(t.value)}
                className={cn(
                  "rounded-lg border px-3.5 py-2.5 text-left text-[13px] transition",
                  previewType === t.value
                    ? "border-primary shadow-[inset_0_0_0_1px_#0a0a0a]"
                    : "border-border hover:border-primary",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="flex items-center justify-between gap-3.5 border-t border-line-soft pt-3.5">
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
              {used
                ? `It has ${attribute.values.length} value(s) — remove them first in "Manage values", or deleting here removes them too.`
                : "It has no values yet, so it's safe to delete."}
            </p>
            <Btn danger onClick={() => setAskDelete(true)}>
              Delete attribute
            </Btn>
          </div>
        </section>
      )}

      <Dialog open={askDelete} onOpenChange={setAskDelete}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Delete attribute?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            <b className="font-semibold">{attribute?.name}</b> and its{" "}
            {attribute?.values.length ?? 0} value(s) will be deleted permanently. This cannot be
            undone.
          </p>
          <DialogFooter>
            <Btn onClick={() => setAskDelete(false)}>Cancel</Btn>
            <Btn danger onClick={doDelete}>
              Delete permanently
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
