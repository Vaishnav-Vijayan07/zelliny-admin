import { useSuspenseQuery } from "@tanstack/react-query";
import { bundlesQuery } from "@/lib/api/sections.functions";
import { formatMoney } from "@/lib/format";
import { StatusBadge, Thumb } from "@/components/admin/primitives";
import { Button, PageHeader } from "@/components/admin/page";
import { soon } from "@/hooks/use-toast-lite";

export default function BundlesPage() {
  const { data } = useSuspenseQuery(bundlesQuery());
  return (
    <>
      <PageHeader title="Bundles & gift sets" subtitle="Ready-made gift sets shown on the site at one price." actions={<Button primary onClick={soon("Create bundle")}>Create bundle</Button>} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data.map((b) => (
          <article key={b.id} className="rounded-[10px] border border-border bg-surface p-5">
            <div className="flex items-start gap-4">
              <Thumb color={b.color} className="size-14" />
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px]">{b.name}</h3>
                <p dir="rtl" className="text-[12px] text-muted-foreground">{b.nameAr}</p>
              </div>
              <StatusBadge tone={b.visible ? "ok" : "mute"}>{b.visible ? "Visible" : "Hidden"}</StatusBadge>
            </div>
            <ul className="mt-4 space-y-1 text-[13px] text-muted-foreground">{b.items.map((i) => <li key={i}>· {i}</li>)}</ul>
            <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3 text-[13px]">
              <span className="text-muted-foreground">{b.occasion}</span>
              <b className="font-medium">{formatMoney(b.price)}</b>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
