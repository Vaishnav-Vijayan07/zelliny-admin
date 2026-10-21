import { useSuspenseQuery } from "@tanstack/react-query";
import { OwnerOnly } from "@/components/admin/OwnerOnly";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { attributesQuery } from "@/lib/api/sections.functions";
import type { AttributeRow } from "@/lib/api/section-types";
import { Chip, StatusBadge } from "@/components/admin/primitives";
import { Button, Card, DataTable, PageHeader, type Column } from "@/components/admin/page";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PREVIEW_LABEL,
  attributeUsedBy,
  deleteAttribute,
  editAttribute,
  useAttributes,
  valueLabel,
} from "@/components/admin/AttributeFlow";

export default function AttributesPage() {
  const { data } = useSuspenseQuery(attributesQuery());
  const navigate = useNavigate();
  const attributes = useAttributes(data);
  const [deleting, setDeleting] = useState<AttributeRow | null>(null);
  const used = deleting ? attributeUsedBy(deleting) : 0;

  const confirmDelete = () => {
    if (!deleting) return;
    deleteAttribute(deleting.id);
    toast(`${deleting.name} deleted`);
    setDeleting(null);
  };
  const makeInactive = () => {
    if (!deleting) return;
    editAttribute(deleting.id, { status: { label: "Inactive", tone: "mute" } });
    toast(`${deleting.name} is now inactive`);
    setDeleting(null);
  };

  const columns: Column<AttributeRow>[] = [
    {
      header: "Attribute",
      cell: (a) => (
        <>
          <b className="font-medium">{a.name}</b>
          {a.nameAr ? (
            <div className="text-[12.5px] text-muted-foreground" dir="rtl">
              {a.nameAr}
            </div>
          ) : (
            <div className="text-[12.5px] text-warn">No Arabic yet</div>
          )}
        </>
      ),
    },
    {
      header: "Preview type",
      cell: (a) => <Chip>{PREVIEW_LABEL[a.previewType]}</Chip>,
    },
    {
      header: "Values",
      cell: (a) =>
        a.values.length ? (
          <span className="text-muted-foreground">
            {a.values.map((v) => valueLabel(a, v)).join(", ")}
          </span>
        ) : (
          <span className="text-muted-foreground">No values yet</span>
        ),
    },
    {
      header: "Used by",
      cell: (a) => {
        const n = attributeUsedBy(a);
        return n ? (
          <>
            <b className="font-semibold">{n}</b>{" "}
            <span className="text-muted-foreground">products</span>
          </>
        ) : (
          <span className="text-muted-foreground">Not used</span>
        );
      },
    },
    {
      header: "Status",
      cell: (a) => <StatusBadge tone={a.status.tone}>{a.status.label}</StatusBadge>,
    },
    {
      header: "actions",
      headerNode: "",
      align: "right",
      cell: (a) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={() =>
              navigate({ to: "/attributes/$attributeId/values", params: { attributeId: a.id } })
            }
          >
            Values ({a.values.length})
          </Button>
          <Button
            onClick={() =>
              navigate({ to: "/attributes/$attributeId", params: { attributeId: a.id } })
            }
          >
            Edit
          </Button>
          <OwnerOnly>
            <Button onClick={() => setDeleting(a)}>Delete</Button>
          </OwnerOnly>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Attributes"
        subtitle="Variant options like colour and size, and the values customers can pick on a product."
        actions={
          <Button primary onClick={() => navigate({ to: "/attributes/new" })}>
            + Add attribute
          </Button>
        }
      />
      <Card>
        <DataTable
          columns={columns}
          rows={attributes}
          rowKey={(a) => a.id}
          empty="No attributes yet"
        />
      </Card>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-[480px]">
          {used > 0 ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-head text-[18px] font-normal">
                  {deleting?.name} is in use
                </DialogTitle>
              </DialogHeader>
              <p className="text-[13.5px]">
                <b className="font-semibold">{deleting?.name}</b> is used by{" "}
                <b className="font-semibold">{used} products</b>. Deleting it would remove these
                options from those products on the website.
              </p>
              <p className="text-[12.5px] text-muted-foreground">
                Make it inactive instead — it stops appearing in the product editor and nothing is
                lost.
              </p>
              <DialogFooter>
                <Button onClick={() => setDeleting(null)}>Cancel</Button>
                <Button primary onClick={makeInactive}>
                  Make inactive
                </Button>
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
                <b className="font-semibold">{deleting?.name}</b> and its{" "}
                {deleting?.values.length ?? 0} value(s) will be deleted permanently. It is not used
                by any product. This cannot be undone.
              </p>
              <DialogFooter>
                <Button onClick={() => setDeleting(null)}>Cancel</Button>
                <Button primary onClick={confirmDelete}>
                  Delete permanently
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
