import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { attributesQuery, inventoryQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import InventoryPage from "@/pages/InventoryPage";

// Page UI lives in src/pages/InventoryPage.tsx
export const Route = createFileRoute("/inventory")({
  // ?tab=Back-in-stock requests | Pre-orders
  validateSearch: z.object({
    tab: z.string().max(40).optional(),
    // ?product=P1011 opens Stock filtered to that product's variants
    product: z.string().max(40).optional(),
  }),
  head: () =>
    pageHead("Inventory", "Stock levels, back-in-stock waiting lists and pre-orders at Zelliny."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productsQuery()),
      context.queryClient.ensureQueryData(inventoryQuery()),
      context.queryClient.ensureQueryData(attributesQuery()),
    ]),
  component: InventoryRoute,
});

function InventoryRoute() {
  const { tab, product } = Route.useSearch();
  return <InventoryPage key={product ?? ""} tab={tab} product={product} />;
}
