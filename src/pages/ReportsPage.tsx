import { useSuspenseQuery } from "@tanstack/react-query";
import { reportsQuery } from "@/lib/api/sections.functions";
import { Panel } from "@/components/admin/primitives";
import { BarList, Button, PageHeader } from "@/components/admin/page";
import { soon } from "@/hooks/use-toast-lite";

export default function ReportsPage() {
  const { data } = useSuspenseQuery(reportsQuery());
  return (
    <>
      <PageHeader title="Reports" subtitle="Last 30 days compared with the 30 days before." actions={<Button onClick={soon("Download report")}>Download</Button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((k) => (
          <div key={k.label} className="rounded-[10px] border border-border bg-surface px-4 py-3">
            <div className="text-[12px] text-muted-foreground">{k.label}</div>
            <div className="mt-1 font-head text-[22px]">{k.value}</div>
            <div className="text-[12px] text-good">{k.delta}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Revenue by category"><BarList items={data.byCategory} /></Panel>
        <Panel title="Revenue by city"><BarList items={data.byCity} /></Panel>
      </div>
    </>
  );
}
