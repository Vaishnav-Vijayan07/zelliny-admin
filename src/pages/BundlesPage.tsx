import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { bundlesQuery, productsQuery } from "@/lib/api/sections.functions";
import type { ProductRow } from "@/lib/api/section-types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Thumb, Toggle } from "@/components/admin/primitives";
import { Button, PageHeader } from "@/components/admin/page";
import { unitPrice, useBundles } from "@/components/admin/BundleFlow";
import { useProducts } from "@/components/admin/ProductFlow";


export default function BundlesPage() {
  const { data } = useSuspenseQuery(bundlesQuery());
  const { data: prods } = useSuspenseQuery(productsQuery());
  const bundles = useBundles(data);
  const products = useProducts(prods.rows);
  const [live, setLive] = useState(true);

  return (
    <>
      <PageHeader title="Bundles & gift sets" subtitle="Curated sets sold as one product — with their own name, images and set price." actions={<Link to="/bundles/new"><Button primary>+ Create gift set</Button></Link>} />
      <div className={cn("mb-[18px] flex items-center gap-3.5 rounded-[10px] border px-4 py-3 text-[13px]", live ? "border-transparent bg-good-bg" : "border-border")}>
        <span className={cn("size-2 rounded-full", live ? "bg-good" : "border-2 border-muted-foreground")} />
        <div className="flex-1"><b className="block font-medium">Bundles & gift sets are {live ? "live" : "switched off"}</b><span className="text-[12.5px] text-muted-foreground">{live ? "Customers can see and buy the visible sets on the site." : "Everything here is built — customers won't see it until you switch it on."}</span></div>
        <Toggle on={live} onChange={() => { setLive(!live); toast(`Bundles & gift sets ${!live ? "are now live" : "switched off"}`); }} label="Bundles & gift sets" />
      </div>
      <div className="grid gap-[18px] sm:grid-cols-2 min-[1200px]:grid-cols-4">
        {bundles.map((b) => {
          const ps = b.lines.map((l) => ({ p: products.find((x) => x.id === l.productId), q: l.qty })).filter((x) => x.p);
          const full = ps.reduce((a, x) => a + unitPrice(x.p) * x.q, 0);
          const cart = b.mode === "Add to Cart";
          return (
            <Link key={b.id} to="/bundles/$bundleId" params={{ bundleId: b.id }} className={cn("flex flex-col overflow-hidden rounded-[10px] border bg-surface transition hover:border-primary", b.visible ? "border-border" : "border-dashed border-border opacity-55")}>
              <span className="flex aspect-[16/9] items-center justify-center gap-2.5" style={{ background: `linear-gradient(145deg, ${b.color}, color-mix(in srgb, ${b.color} 55%, #000))` }}>
                {ps.map((x) => <Thumb key={x.p!.id} color={x.p!.color} className="size-16 border-[3px] border-white" />)}
              </span>
              <span className="flex flex-1 flex-col gap-1 p-4">
                <span className="text-[11px] uppercase tracking-[.14em] text-muted-foreground">{b.occasion}</span>
                <b className="font-head text-[17px] font-normal">{b.name}</b>
                <span dir="rtl" className="text-[12px] text-muted-foreground">{b.nameAr}</span>
                <span className="my-1 flex-1 text-[12px] text-muted-foreground">{ps.map((x) => x.p!.name).join(" + ")}</span>
                <span className="flex flex-col gap-1.5 text-[13px]">
                  {cart ? <><span><b className="font-semibold">{formatNumber(b.price)} EGP</b> <s className="text-muted-foreground">{formatNumber(full)}</s></span>{full > b.price && <span className="text-good">Save {formatNumber(full - b.price)} EGP</span>}</> : <span className="text-muted-foreground">Price on request</span>}
                  <span className={cn("w-fit rounded-lg border px-2 py-0.5 text-[11.5px]", cart ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-border")}>{cart ? "Add to Cart" : "Enquiry only"}</span>
                </span>
              </span>
            </Link>
          );
        })}
        <Link to="/bundles/new" className="grid min-h-[240px] place-items-center rounded-[10px] border border-dashed border-border text-[14px] text-muted-foreground hover:border-primary hover:text-foreground">+ Create a gift set</Link>
      </div>
    </>
  );
}
