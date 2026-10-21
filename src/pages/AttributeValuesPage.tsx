// One attribute's values: add, edit, reorder and delete the options customers pick on a product.
import { OwnerOnly } from "@/components/admin/OwnerOnly";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { attributesQuery } from "@/lib/api/sections.functions";
import type { AttributeRow, AttributeValueRow } from "@/lib/api/section-types";
import { cn } from "@/lib/utils";
import { Chip, StatusBadge } from "@/components/admin/primitives";
import { Button, Card, PageHeader } from "@/components/admin/page";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PREVIEW_LABEL,
  addAttributeValue,
  deleteAttributeValue,
  editAttribute,
  updateAttributeValue,
  useAttributes,
  valueLabel,
} from "@/components/admin/AttributeFlow";

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

function ValueFormDialog({
  attribute,
  open,
  onOpenChange,
  value,
}: {
  attribute: AttributeRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: AttributeValueRow | null;
}) {
  const isUpdate = !!value;
  const type = attribute.previewType;
  const [text, setText] = useState(value?.value ?? "");
  const [textAr, setTextAr] = useState(value?.valueAr ?? "");
  const [color, setColor] = useState(value?.color ?? "#1f2a44");
  const [icon, setIcon] = useState<string | null>(value?.icon ?? null);
  const [bad, setBad] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isHexColor = /^#[0-9A-Fa-f]{6}$/.test(color);

  const onFile = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => setIcon(String(fr.result));
    fr.readAsDataURL(f);
  };

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setBad(true);
      toast("Type the value first");
      return;
    }
    if (type === "COLOR" && !isHexColor) {
      toast("Pick a colour");
      return;
    }
    if (type === "ICON" && !icon) {
      toast("Upload the image first");
      return;
    }
    const patch = {
      value: trimmed,
      valueAr: textAr.trim(),
      color: type === "COLOR" ? color : null,
      icon: type === "ICON" ? icon : null,
      iconAlt: type === "ICON" ? trimmed : null,
    };
    if (isUpdate) {
      updateAttributeValue(attribute, value.id, patch);
      toast("Value saved");
    } else {
      const base = slugify(`${attribute.id}-${trimmed}`) || `value-${Date.now()}`;
      const id = attribute.values.some((v) => v.id === base) ? `${base}-${Date.now()}` : base;
      addAttributeValue(attribute, { id, usedBy: 0, ...patch });
      toast(`${valueLabel(attribute, { ...patch, id, usedBy: 0 })} added`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-head text-[18px] font-normal">
            {isUpdate ? "Edit value" : "Add value"} · {attribute.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Lang t="EN" dark /> Value <em className="not-italic text-bad">*</em>
            </span>
            <input
              autoFocus
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setBad(false);
              }}
              placeholder={
                type === "COLOR"
                  ? "e.g. Navy"
                  : type === "ICON"
                    ? "e.g. Suede"
                    : "e.g. Extrait de Parfum"
              }
              className={cn(inputCls, bad && "border-bad bg-bad-bg")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Lang t="AR" /> العربية
            </span>
            <input
              dir="rtl"
              value={textAr}
              onChange={(e) => setTextAr(e.target.value)}
              className={cn(inputCls, "text-right")}
            />
          </div>
        </div>

        {type === "COLOR" && (
          <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
            Colour <em className="not-italic text-bad">*</em>
            <div className="flex items-center gap-2.5">
              <input
                type="color"
                value={isHexColor ? color : "#000000"}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface p-1"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#000000"
                className={cn(inputCls, "font-mono")}
              />
            </div>
          </label>
        )}

        {type === "ICON" && (
          <div className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
            <span>
              Image <em className="not-italic text-bad">*</em>
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid h-[90px] place-items-center rounded-[10px] border-[1.5px] border-dashed border-[#cfcfcf] bg-surface text-[13px] text-muted-foreground hover:border-primary"
            >
              {icon ? (
                <span className="flex items-center gap-3 text-foreground">
                  <img
                    src={icon}
                    alt=""
                    className="size-14 rounded-md border border-border object-contain p-1"
                  />
                  Replace
                </span>
              ) : (
                "+ Upload image · square, 200 × 200 px"
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onFile(e.target.files)}
            />
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button primary onClick={save}>
            {isUpdate ? "Save value" : "Add value"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AttributeValuesPage({ attributeId }: { attributeId: string }) {
  const { data } = useSuspenseQuery(attributesQuery());
  const navigate = useNavigate();
  const attribute = useAttributes(data).find((a) => a.id === attributeId) ?? null;
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AttributeValueRow | null>(null);
  const [deleting, setDeleting] = useState<AttributeValueRow | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  if (!attribute)
    return <p className="py-24 text-center text-muted-foreground">Attribute not found.</p>;

  const type = attribute.previewType;
  const term = q.toLowerCase().trim();
  const rows = attribute.values.filter(
    (v) => !term || `${valueLabel(attribute, v)} ${v.valueAr}`.toLowerCase().includes(term),
  );

  const move = (from: string, to: string) => {
    if (from === to) return;
    const list = [...attribute.values];
    const fi = list.findIndex((v) => v.id === from);
    const ti = list.findIndex((v) => v.id === to);
    const [v] = list.splice(fi, 1);
    if (!v) return;
    list.splice(ti, 0, v);
    editAttribute(attribute.id, { values: list });
    toast(`${valueLabel(attribute, v)} moved to position ${ti + 1}`);
  };
  const confirmDelete = () => {
    if (!deleting) return;
    deleteAttributeValue(attribute, deleting.id);
    toast("Value deleted");
    setDeleting(null);
  };
  const th =
    "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-normal uppercase tracking-[.12em] text-muted-foreground";

  return (
    <>
      <div className="mb-2 text-[12px] text-muted-foreground">
        <Link to="/attributes" className="underline underline-offset-[3px]">
          Attributes
        </Link>{" "}
        /{" "}
        <Link
          to="/attributes/$attributeId"
          params={{ attributeId: attribute.id }}
          className="underline underline-offset-[3px]"
        >
          {attribute.name}
        </Link>{" "}
        / Values
      </div>
      <PageHeader
        title={attribute.name}
        subtitle="The values customers can pick for this attribute on a product."
        actions={
          <>
            <Button
              onClick={() =>
                navigate({ to: "/attributes/$attributeId", params: { attributeId: attribute.id } })
              }
            >
              Edit attribute
            </Button>
            <Button
              primary
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              + Add value
            </Button>
          </>
        }
      />
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Chip>{PREVIEW_LABEL[type]}</Chip>
            <StatusBadge tone={attribute.status.tone}>{attribute.status.label}</StatusBadge>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter values…"
            className={cn(inputCls, "max-w-[220px]")}
          />
        </div>
        {attribute.values.length > 0 && (
          <div className="mb-3 rounded-lg bg-hover px-3.5 py-3 text-[13px]">
            ⠿ Drag the rows to set the order customers see on the product page.
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className={cn(th, "w-8")} />
                <th className={th}>Value</th>
                <th className={th}>Arabic</th>
                <th className={th}>
                  {type === "COLOR" ? "Colour" : type === "ICON" ? "Image" : ""}
                </th>
                <th className={th}>Used by</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                    {term ? "No values match your search." : "No values yet — press “+ Add value”."}
                  </td>
                </tr>
              )}
              {rows.map((v) => (
                <tr
                  key={v.id}
                  draggable={!term}
                  onDragStart={() => setDragId(v.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  onDragOver={(e) => {
                    if (!dragId) return;
                    e.preventDefault();
                    setOverId(v.id);
                  }}
                  onDragLeave={() => setOverId((o) => (o === v.id ? null : o))}
                  onDrop={(e) => {
                    if (!dragId) return;
                    e.preventDefault();
                    move(dragId, v.id);
                    setDragId(null);
                    setOverId(null);
                  }}
                  className={cn(
                    "border-b border-line-soft last:border-0 hover:bg-hover",
                    dragId === v.id && "opacity-40",
                    overId === v.id && dragId !== v.id && "shadow-[inset_0_2px_0_0_#0a0a0a]",
                  )}
                >
                  <td className="cursor-grab px-3 py-3 text-[15px] text-muted-foreground">⠿</td>
                  <td className="px-3 py-3 font-medium">{valueLabel(attribute, v)}</td>
                  <td className="px-3 py-3 text-muted-foreground" dir="rtl" align="left">
                    {v.valueAr || <span className="text-warn">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {type === "COLOR" ? (
                      v.color ? (
                        <span className="inline-flex items-center gap-2 font-mono text-[12.5px]">
                          <i
                            className="size-[22px] rounded-full border border-black/10"
                            style={{ background: v.color }}
                          />
                          {v.color}
                        </span>
                      ) : (
                        "—"
                      )
                    ) : type === "ICON" ? (
                      v.icon ? (
                        <img
                          src={v.icon}
                          alt={v.iconAlt ?? v.value}
                          className="size-9 rounded-md border border-border object-contain p-1"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    {v.usedBy ? (
                      <>
                        <b className="font-semibold">{v.usedBy}</b>{" "}
                        <span className="text-muted-foreground">products</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not used</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => {
                          setEditing(v);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <OwnerOnly>
                        <Button onClick={() => setDeleting(v)}>Delete</Button>
                      </OwnerOnly>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {formOpen && (
        <ValueFormDialog
          key={editing?.id ?? "new"}
          attribute={attribute}
          open={formOpen}
          onOpenChange={setFormOpen}
          value={editing}
        />
      )}

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-[480px]">
          {deleting && deleting.usedBy > 0 ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-head text-[18px] font-normal">
                  {valueLabel(attribute, deleting)} is in use
                </DialogTitle>
              </DialogHeader>
              <p className="text-[13.5px]">
                <b className="font-semibold">{valueLabel(attribute, deleting)}</b> is used by{" "}
                <b className="font-semibold">{deleting.usedBy} products</b>. Remove it from those
                products first, then delete it.
              </p>
              <DialogFooter>
                <Button onClick={() => setDeleting(null)}>Cancel</Button>
                <Button
                  primary
                  onClick={() => {
                    toast(
                      `Showing the ${deleting.usedBy} products that use ${attribute.name}: ${valueLabel(attribute, deleting)}`,
                    );
                    setDeleting(null);
                    navigate({ to: "/products" });
                  }}
                >
                  View the {deleting.usedBy} products
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-head text-[18px] font-normal">
                  Delete value?
                </DialogTitle>
              </DialogHeader>
              <p className="text-[13.5px]">
                <b className="font-semibold">{deleting ? valueLabel(attribute, deleting) : ""}</b>{" "}
                will be deleted from <b className="font-semibold">{attribute.name}</b>. It is not
                used by any product.
              </p>
              <DialogFooter>
                <Button onClick={() => setDeleting(null)}>Cancel</Button>
                <Button primary onClick={confirmDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
