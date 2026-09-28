import { useSuspenseQuery } from "@tanstack/react-query";
import { staffQuery } from "@/lib/api/sections.functions";
import type { StaffRow } from "@/lib/api/section-types";
import { StatusBadge } from "@/components/admin/primitives";
import { Button, Card, DataTable, Muted, PageHeader, type Column } from "@/components/admin/page";
import { soon } from "@/hooks/use-toast-lite";

const columns: Column<StaffRow>[] = [
  { header: "Member", cell: (s) => <><b className="font-medium">{s.name}</b><Muted>{s.email}</Muted></> },
  { header: "Role", cell: (s) => s.role },
  { header: "Access", cell: (s) => <span className="text-muted-foreground">{s.access}</span> },
  { header: "Last seen", cell: (s) => s.last },
  { header: "Status", cell: (s) => <StatusBadge tone={s.status.tone}>{s.status.label}</StatusBadge> },
];

export default function StaffPage() {
  const { data } = useSuspenseQuery(staffQuery());
  return (
    <>
      <PageHeader title="Team & permissions" subtitle="Who can sign in and what they can see or change." actions={<Button primary onClick={soon("Invite member")}>Invite member</Button>} />
      <Card><DataTable columns={columns} rows={data} rowKey={(s) => s.email} /></Card>
    </>
  );
}
