import { useSuspenseQuery } from "@tanstack/react-query";
import { deliveryQuery } from "@/lib/api/sections.functions";
import type { AppointmentRow, ZoneRow } from "@/lib/api/section-types";
import { formatMoney } from "@/lib/format";
import { Panel, StatusBadge } from "@/components/admin/primitives";
import { DataTable, Muted, PageHeader, type Column } from "@/components/admin/page";

const yes = (b: boolean) => (b ? <StatusBadge tone="ok">Yes</StatusBadge> : <StatusBadge tone="mute">No</StatusBadge>);
const zoneCols: Column<ZoneRow>[] = [
  { header: "Zone", cell: (z) => <b className="font-medium">{z.zone}</b> },
  { header: "Fee", cell: (z) => formatMoney(z.fee) },
  { header: "Free over", cell: (z) => z.free },
  { header: "Arrives", cell: (z) => z.eta },
  { header: "Cash on delivery", cell: (z) => yes(z.cod) },
  { header: "Appointments", cell: (z) => yes(z.appointment) },
];
const apptCols: Column<AppointmentRow>[] = [
  { header: "Order", cell: (a) => <><b className="font-medium">{a.order}</b><Muted>{a.customer}</Muted></> },
  { header: "Item", cell: (a) => a.item },
  { header: "When", cell: (a) => <>{a.when}<Muted>{a.where}</Muted></> },
  { header: "Agent", cell: (a) => a.agent },
  { header: "Status", cell: (a) => <StatusBadge tone={a.status.tone}>{a.status.label}</StatusBadge> },
];

export default function DeliveryPage() {
  const { data } = useSuspenseQuery(deliveryQuery());
  return (
    <>
      <PageHeader title="Delivery" subtitle="Courier zones via Bosta, plus hand delivery by appointment for watches and jewellery." />
      <Panel title="Zones & fees" className="mb-5"><DataTable columns={zoneCols} rows={data.zones} rowKey={(z) => z.zone} /></Panel>
      <Panel title="Appointments"><DataTable columns={apptCols} rows={data.appointments} rowKey={(a) => a.order} /></Panel>
    </>
  );
}
