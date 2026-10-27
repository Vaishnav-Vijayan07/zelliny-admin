import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { cn } from "@/lib/utils";
import { Button, PageHeader } from "@/components/admin/page";
import { toast } from "sonner";
import { setCategoryOrder, useCatalogue } from "@/components/admin/CatalogueFlow";
import { MixBar, useVisibility } from "@/components/admin/CatalogueUi";
import { DROP_ON, chooseFiles, useFileDrop } from "@/lib/image-upload";

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
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const { over: dropOver, bind } = useFileDrop();
  /** Tile pictures changed from the tile itself (kept for this visit until the API is connected). */
  const [tileImg, setTileImg] = useState<Record<string, string>>({});
  const setTile = (id: string, name: string, files: File[]) => {
    const f = files[0];
    if (!f) return;
    setTileImg((x) => ({ ...x, [id]: URL.createObjectURL(f) }));
    toast(`${name} tile image updated`);
  };
  /** Moves a card to where another one is; the menu and homepage follow this order. */
  const move = (from: string, to: string) => {
    if (from === to) return;
    const ids = live.categories.map((c) => c.id);
    ids.splice(ids.indexOf(from), 1);
    ids.splice(ids.indexOf(to), 0, from);
    setCategoryOrder(ids);
    toast("Order saved — the website menu and homepage follow it");
  };

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
      <p className="mb-3 text-[12.5px] text-muted-foreground">
        ⋮⋮ Drag a card by its handle onto another to change the order. The website menu and homepage
        follow this order.
      </p>
      <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3 min-[1300px]:grid-cols-4">
        {live.categories.map((c) => {
          const list = live.products.filter((p) => p.category === c.name);
          return (
            <div
              key={c.id}
              data-card
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverId(c.id);
              }}
              onDrop={(e) => {
                if (!dragId) return;
                e.preventDefault();
                move(dragId, c.id);
                setDragId(null);
                setOverId(null);
              }}
              className={cn(
                "relative overflow-hidden rounded-[10px] border bg-surface transition",
                c.visible ? "border-border hover:border-primary" : "border-dashed border-border",
                dragId === c.id && "opacity-40",
                overId === c.id &&
                  dragId !== c.id &&
                  "outline-2 outline-dashed outline-offset-2 outline-primary",
              )}
            >
              <span
                draggable
                title="Drag to change the order"
                onDragStart={(e) => {
                  setDragId(c.id);
                  e.dataTransfer.effectAllowed = "move";
                  const card = e.currentTarget.closest("[data-card]");
                  if (card) e.dataTransfer.setDragImage(card as HTMLElement, 24, 24);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                className="absolute left-2.5 top-2.5 z-10 grid size-7 cursor-grab place-items-center rounded-md bg-white/90 text-[14px] leading-none text-black shadow active:cursor-grabbing"
              >
                ⋮⋮
              </span>
              <div
                {...bind(c.id, (f) => setTile(c.id, c.name, f))}
                className={cn("relative", dropOver === c.id && DROP_ON)}
              >
                <Link to="/categories/$categoryId" params={{ categoryId: c.id }}>
                  <div
                    className={cn("relative aspect-[4/3]", !c.visible && "opacity-45 grayscale")}
                    style={
                      tileImg[c.id]
                        ? {
                            backgroundImage: `url(${tileImg[c.id]})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : {
                            background: `linear-gradient(145deg, ${TILE[(c.order - 1) % TILE.length]}, color-mix(in srgb, ${TILE[(c.order - 1) % TILE.length]} 55%, #000))`,
                          }
                    }
                  >
                    {!c.visible && (
                      <span className="absolute inset-x-2.5 bottom-2.5 mr-14 rounded bg-white px-2 py-1 text-center text-[10px] tracking-[.14em] text-black">
                        HIDDEN FROM SITE
                      </span>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  title="Change the tile image — choose a file or drop one on the tile"
                  onClick={() => chooseFiles((f) => setTile(c.id, c.name, f))}
                  className="absolute bottom-2.5 right-2.5 z-10 rounded-md bg-white/90 px-2.5 py-1 text-[11.5px] text-black shadow hover:bg-white"
                >
                  Edit
                </button>
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
