import { useSuspenseQuery } from "@tanstack/react-query";
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
import { deleteAttribute, useAttributes } from "@/components/admin/AttributeFlow";

export default function AttributesPage() {
  const { data } = useSuspenseQuery(attributesQuery());
  const navigate = useNavigate();
  const attributes = useAttributes(data);
  const [deleting, setDeleting] = useState<AttributeRow | null>(null);

  const confirmDelete = () => {
    if (!deleting) return;
    deleteAttribute(deleting.id);
    toast(`${deleting.name} deleted`);
    setDeleting(null);
  };

  const columns: Column<AttributeRow>[] = [
    { header: "Attribute", cell: (a) => <b className="font-medium">{a.name}</b> },
    { header: "Preview type", cell: (a) => <Chip>{a.previewType}</Chip> },
    {
      header: "Values",
      cell: (a) =>
        a.values.length ? (
          <span className="text-muted-foreground">{a.values.map((v) => v.value).join(", ")}</span>
        ) : (
          <span className="text-muted-foreground">No values yet</span>
        ),
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
          <Button onClick={() => setDeleting(a)}>Delete</Button>
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
          <DialogHeader>
            <DialogTitle className="font-head text-[18px] font-normal">
              Delete attribute?
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]">
            <b className="font-semibold">{deleting?.name}</b> and its {deleting?.values.length ?? 0}{" "}
            value(s) will be deleted permanently. This cannot be undone.
          </p>
          <DialogFooter>
            <Button onClick={() => setDeleting(null)}>Cancel</Button>
            <Button primary onClick={confirmDelete}>
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
