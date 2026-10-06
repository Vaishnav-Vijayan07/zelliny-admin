import { createFileRoute } from "@tanstack/react-router";
import { inventoryQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import WaitingListPage from "@/pages/WaitingListPage";

// Page UI lives in src/pages/WaitingListPage.tsx
export const Route = createFileRoute("/inventory_/waiting/$productId")({
  head: () =>
    pageHead("Waiting list", "Customers waiting for a sold-out Zelliny product to come back."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productsQuery()),
      context.queryClient.ensureQueryData(inventoryQuery()),
    ]),
  component: WaitingRoute,
});

function WaitingRoute() {
  const { productId } = Route.useParams();
  return <WaitingListPage key={productId} productId={productId} />;
}
