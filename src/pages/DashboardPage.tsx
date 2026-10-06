import { useQuery, useSuspenseQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { dashboardQuery } from "@/lib/api/admin.functions";
import type { DateRange } from "@/lib/api/types";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { NeedsNow } from "@/components/dashboard/NeedsNow";
import { RevenueHero } from "@/components/dashboard/RevenueHero";
import { LatestOrders } from "@/components/dashboard/LatestOrders";
import { RankedListCard } from "@/components/dashboard/RankedListCard";
import { PipelineCard } from "@/components/dashboard/PipelineCard";
import { useSessionUser } from "@/hooks/use-session";
import { canSeePage, canSeeWidget, roleFocus } from "@/lib/roles";

export default function Dashboard() {
  const [range, setRange] = useState<DateRange>("30d");
  const initial = useSuspenseQuery(dashboardQuery("30d")).data;
  const { data = initial } = useQuery({
    ...dashboardQuery(range),
    placeholderData: keepPreviousData,
  });
  const user = useSessionUser();
  const role = user?.role ?? "Owner";
  const show = (w: Parameters<typeof canSeeWidget>[1]) => canSeeWidget(role, w);
  const needs = data.needsNow.filter((n) => canSeePage(role, n.target));
  const ranked = [
    show("lowStock") && <RankedListCard key="low" list={data.lowStock} to="inventory" />,
    show("bestSellers") && <RankedListCard key="best" list={data.bestSellers} to="products" />,
    show("mostEnquired") && <RankedListCard key="enq" list={data.mostEnquired} to="enquiries" />,
  ].filter(Boolean);

  return (
    <>
      <DashboardHeader
        name={user?.name.split(" ")[0] ?? data.greetingName}
        dateLabel={data.dateLabel}
        liveVisitors={data.liveVisitors}
        range={range}
        onRangeChange={setRange}
      />
      <p className="-mt-5 mb-6 text-[13px] text-muted-foreground">
        {role} dashboard · {roleFocus(role)}
      </p>
      {needs.length > 0 && <NeedsNow items={needs} />}
      {show("revenue") && <RevenueHero data={data.revenue} />}
      {show("latestOrders") && (
        <LatestOrders orders={data.latestOrders.items} more={data.latestOrders.more} />
      )}
      {ranked.length > 0 && (
        <div
          className={`mb-5 grid gap-5 ${["", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3"][ranked.length]}`}
        >
          {ranked}
        </div>
      )}
      {show("pipeline") && <PipelineCard {...data.pipeline} />}
    </>
  );
}
