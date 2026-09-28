import { createFileRoute } from "@tanstack/react-router";
import { inventoryQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import InventoryPage from "@/pages/InventoryPage";

// Page UI lives in src/pages/InventoryPage.tsx
export const Route = createFileRoute("/inventory")({
  head: () => pageHead("Inventory", "Stock levels, low-stock and out-of-stock products at Zelliny."),
  loader: ({ context }) => context.queryClient.ensureQueryData(inventoryQuery()),
  component: InventoryPage,
});
