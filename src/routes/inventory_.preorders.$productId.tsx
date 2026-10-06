import { createFileRoute } from "@tanstack/react-router";
import { inventoryQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import PreorderPage from "@/pages/PreorderPage";

// Page UI lives in src/pages/PreorderPage.tsx
export const Route = createFileRoute("/inventory_/preorders/$productId")({
  head: () =>
    pageHead("Pre-orders", "Customers who pre-ordered a Zelliny product, and when it is expected."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productsQuery()),
      context.queryClient.ensureQueryData(inventoryQuery()),
    ]),
  component: PreorderRoute,
});

function PreorderRoute() {
  const { productId } = Route.useParams();
  return <PreorderPage key={productId} productId={productId} />;
}
