import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { activityQuery } from "@/lib/api/sections.functions";
import type { ActivityRow } from "@/lib/api/section-types";
import { StatusBadge } from "@/components/admin/primitives";
import {
  Card,
  DataTable,
  FilterBar,
  FilterSelect,
  PageHeader,
  type Column,
} from "@/components/admin/page";

const columns: Column<ActivityRow>[] = [
  { header: "Time", cell: (a) => <span className="text-muted-foreground">{a.time}</span> },
  { header: "Who", cell: (a) => a.who },
  { header: "What", cell: (a) => a.what },
  {
    header: "Type",
    cell: (a) => (
      <StatusBadge tone="mute" dot={false}>
        {a.type}
      </StatusBadge>
    ),
  },
];

export default function ActivityPage() {
  const { data } = useSuspenseQuery(activityQuery());
  const [who, setWho] = useState("");
  const rows = data.filter((a) => !who || a.who === who);
  return (
    <>
      <PageHeader
        title="Activity log"
        subtitle="Today's events. Sign-ins and every change are recorded here."
      />
      <Card>
        <FilterBar>
          <FilterSelect
            value={who}
            onChange={setWho}
            all="Everyone"
            options={[...new Set(data.map((a) => a.who))]}
          />
        </FilterBar>
        <DataTable columns={columns} rows={rows} rowKey={(a) => a.time + a.what} />
      </Card>
    </>
  );
}
