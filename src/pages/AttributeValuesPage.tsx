// One attribute's values: add, edit and delete the options customers pick on a product.
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { attributesQuery } from "@/lib/api/sections.functions";
import type { AttributeRow, AttributeValueRow } from "@/lib/api/section-types";
import { cn } from "@/lib/utils";
import { Chip, StatusBadge } from "@/components/admin/primitives";
import { Button, Card, DataTable, PageHeader, type Column } from "@/components/admin/page";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addAttributeValue, deleteAttributeValue, updateAttributeValue, useAttributes } from "@/components/admin/AttributeFlow";

const inputCls = "h-9 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-[14px] outline-none focus:border-primary";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function ValueFormDialog({ attribute, open, onOpenChange, value }: {
  attribute: AttributeRow; open: boolean; onOpenChange: (o: boolean) => void; value: AttributeValueRow | null;
}) {
  const isUpdate = !!value;
  const [text, setText] = useState(value?.value ?? "");
  const [color, setColor] = useState(value?.color ?? "#000000");
  const [icon, setIcon] = useState<string | null>(value?.icon ?? null);
  const [iconAlt, setIconAlt] = useState(value?.iconAlt ?? "");
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
    if (!trimmed) { toast("Enter a value"); return; }
    const patch = {
      value: trimmed,
      color: attribute.previewType === "COLOR" ? color : null,
      icon: attribute.previewType === "ICON" ? icon : null,
      iconAlt: attribute.previewType === "ICON" ? iconAlt.trim() || null : null,
    };
    if (isUpdate) {
      updateAttributeValue(attribute, value.id, patch);
      toast("Value updated");
    } else {
      const base = slugify(trimmed) || `value-${Date.now()}`;
      const id = attribute.values.some((v) => v.id === base) ? `${base}-${Date.now()}` : base;
      addAttributeValue(attribute, { id, ...patch });
      toast(`"${trimmed}" added`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-head text-[18px] font-normal">{isUpdate ? "Edit value" : "Add value"}</DialogTitle>
        </DialogHeader>

        <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">Value <em className="not-italic text-bad">*</em>
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Small, Red, Leather" className={inputCls} />
        </label>

        {attribute.previewType === "COLOR" && (
          <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">Colour
            <div className="flex items-center gap-2.5">
              <input type="color" value={isHexColor ? color : "#000000"} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface p-1" />
              <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#000000" className={cn(inputCls, "font-mono")} />
            </div>
          </label>
        )}

        {attribute.previewType === "ICON" && (
          <>
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">Icon image
              <div className="flex items-center gap-3">
                {icon ? <img src={icon} alt="" className="size-12 rounded-md border border-border object-contain p-1" /> : <span className="grid size-12 place-items-center rounded-md border border-dashed border-[#c9c9c9] text-[10px] text-muted-foreground">No icon</span>}
                <Button onClick={() => fileRef.current?.click()}>Upload</Button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files)} />
              </div>
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">Icon alt text
              <input value={iconAlt} onChange={(e) => setIconAlt(e.target.value)} placeholder="e.g. Leather icon" className={inputCls} />
            </label>
          </>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button primary onClick={save}>{isUpdate ? "Save changes" : "Add value"}</Button>
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

  if (!attribute) return <p className="py-24 text-center text-muted-foreground">Attribute not found.</p>;

  const term = q.toLowerCase().trim();
  const rows = attribute.values.filter((v) => !term || v.value.toLowerCase().includes(term));

  const confirmDelete = () => {
    if (!deleting) return;
    deleteAttributeValue(attribute, deleting.id);
    toast(`"${deleting.value}" deleted`);
    setDeleting(null);
  };

  const columns: Column<AttributeValueRow>[] = [
    { header: "Value", cell: (v) => <b className="font-medium">{v.value}</b> },
    ...(attribute.previewType === "COLOR" ? [{
      header: "Colour", cell: (v: AttributeValueRow) => v.color ? (
        <div className="flex items-center gap-2">
          <span className="inline-block size-5 rounded-full border border-border" style={{ background: v.color }} />
          <span className="font-mono text-[12px]">{v.color}</span>
        </div>
      ) : <span className="text-muted-foreground">—</span>,
    }] : []),
    ...(attribute.previewType === "ICON" ? [{
      header: "Icon", cell: (v: AttributeValueRow) => v.icon ? (
        <div className="flex items-center gap-2.5">
          <img src={v.icon} alt={v.iconAlt ?? v.value} className="size-9 rounded-md border border-border object-contain p-1" />
          {v.iconAlt && <span className="text-[12px] text-muted-foreground">{v.iconAlt}</span>}
        </div>
      ) : <span className="text-muted-foreground">—</span>,
    }] : []),
    { header: "actions", headerNode: "", align: "right", cell: (v) => (
      <div className="flex items-center justify-end gap-2">
        <Button onClick={() => { setEditing(v); setFormOpen(true); }}>Edit</Button>
        <Button onClick={() => setDeleting(v)}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <>
      <div className="mb-2 text-[12px] text-muted-foreground"><Link to="/attributes" className="underline underline-offset-[3px]">Attributes</Link> / {attribute.name} / Values</div>
      <PageHeader
        title={attribute.name}
        subtitle="The values customers can pick for this attribute on a product."
        actions={<><Button onClick={() => navigate({ to: "/attributes/$attributeId", params: { attributeId: attribute.id } })}>Edit attribute</Button><Button primary onClick={() => { setEditing(null); setFormOpen(true); }}>+ Add value</Button></>}
      />
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Chip>{attribute.previewType}</Chip>
            <StatusBadge tone={attribute.status.tone}>{attribute.status.label}</StatusBadge>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter values…" className={cn(inputCls, "max-w-[220px]")} />
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(v) => v.id} empty={term ? "No values match your search." : "No values added yet."} />
      </Card>

      {formOpen && <ValueFormDialog attribute={attribute} open={formOpen} onOpenChange={setFormOpen} value={editing} />}

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader><DialogTitle className="font-head text-[18px] font-normal">Delete value?</DialogTitle></DialogHeader>
          <p className="text-[13.5px]"><b className="font-semibold">"{deleting?.value}"</b> will be removed from <b className="font-semibold">{attribute.name}</b>. This cannot be undone.</p>
          <DialogFooter>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button primary onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
