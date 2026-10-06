import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { cn } from "@/lib/utils";
import { Button, PageHeader } from "@/components/admin/page";
import { useCatalogue } from "@/components/admin/CatalogueFlow";
import { MixBar, useVisibility } from "@/components/admin/CatalogueUi";

const TILE = [
  "#cdb8a3",
  "#e3c9c4",
  "#d6d9df",
  "#b99a62",
  "#7d5d45",
  "#4b3a2d",
  "#2f2f35",
  "#8f8f8f",
];

export default function CategoriesPage() {
  const { data: cats } = useSuspenseQuery(categoriesQuery());
  const { data: brands } = useSuspenseQuery(brandsQuery());
  const { data: prods } = useSuspenseQuery(productsQuery());
  const live = useCatalogue(cats, brands, prods.rows);
  const vis = useVisibility();

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Show or hide a whole category. When one is switched off it disappears from the site and the remaining tiles close up evenly — no empty gaps."
        actions={
          <>
            <Link to="/selling">
              <Button>Selling control</Button>
            </Link>
            <Link to="/categories/new">
              <Button primary>+ Add category</Button>
            </Link>
          </>
        }
      />
      <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3 min-[1300px]:grid-cols-4">
        {live.categories.map((c) => {
          const list = live.products.filter((p) => p.category === c.name);
          return (
            <div
              key={c.id}
              className={cn(
                "overflow-hidden rounded-[10px] border bg-surface transition",
                c.visible ? "border-border hover:border-primary" : "border-dashed border-border",
              )}
            >
              <div
                className={cn("relative aspect-[4/3]", !c.visible && "opacity-45 grayscale")}
                style={{
                  background: `linear-gradient(145deg, ${TILE[(c.order - 1) % TILE.length]}, color-mix(in srgb, ${TILE[(c.order - 1) % TILE.length]} 55%, #000))`,
                }}
              >
                {!c.visible && (
                  <span className="absolute inset-x-2.5 bottom-2.5 rounded bg-white px-2 py-1 text-center text-[10px] tracking-[.14em] text-black">
                    HIDDEN FROM SITE
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/categories/$categoryId" params={{ categoryId: c.id }}>
                    <b className="font-head text-[16px] font-normal">{c.name}</b>
                    <div className="text-[12px] text-muted-foreground" dir="rtl">
                      {c.nameAr}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                    <span>{c.visible ? "On site" : "Hidden"}</span>
                    {vis.toggle({ kind: "category", row: c })}
                  </div>
                </div>
                <MixBar list={list} total={c.count} />
                <Link
                  to="/products"
                  className="w-fit rounded-full border border-border px-2.5 py-1 text-[11px] hover:border-primary"
                >
                  View products →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      {vis.dialog}
    </>
  );
}
