import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { approvalsQuery } from "@/lib/api/sections.functions";
import type { ApprovalRow } from "@/lib/api/section-types";
import { StatusBadge } from "@/components/admin/primitives";
import {
  Button,
  Card,
  DataTable,
  Muted,
  PageHeader,
  TileRow,
  type Column,
} from "@/components/admin/page";
import { soon } from "@/hooks/use-toast-lite";

const columns: Column<ApprovalRow>[] = [
  {
    header: "Request",
    cell: (a) => (
      <>
        <b className="font-medium">{a.request}</b>
        <Muted>{a.detail}</Muted>
      </>
    ),
  },
  {
    header: "Asked by",
    cell: (a) => (
      <>
        {a.by}
        <Muted>{a.when}</Muted>
      </>
    ),
  },
  {
    header: "Status",
    cell: (a) => <StatusBadge tone={a.status.tone}>{a.status.label}</StatusBadge>,
  },
  {
    header: "",
    align: "right",
    cell: (a) =>
      a.status.label === "Waiting" ? (
        <div className="flex justify-end gap-2">
          <Button onClick={soon("Decline")}>Decline</Button>
          <Button primary onClick={soon("Approve")}>
            Approve
          </Button>
        </div>
      ) : null,
  },
];

export default function ApprovalsPage() {
  const { data } = useSuspenseQuery(approvalsQuery());
  const [tile, setTile] = useState<string | null>("Waiting");
  const tiles = ["Waiting", "Approved"].map((s) => ({
    key: s,
    label: s,
    count: data.filter((a) => a.status.label === s).length,
  }));
  const rows = data.filter((a) => !tile || a.status.label === tile);
  return (
    <>
      <PageHeader
        title="Approvals"
        subtitle="Price changes, refunds and new offers from the team wait here until you decide."
      />
      <TileRow tiles={tiles} active={tile} onSelect={setTile} />
      <Card>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(a) => a.id}
          empty="Nothing waiting — all caught up"
        />
      </Card>
    </>
  );
}
