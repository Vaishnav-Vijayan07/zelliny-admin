import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import ProductDetailPage from "@/pages/ProductDetailPage";

// Page UI lives in src/pages/ProductDetailPage.tsx
export const Route = createFileRoute("/products_/$productId")({
  // ?tab=Images opens straight on that tab (used by the thumbnail in the products list).
  validateSearch: z.object({ tab: z.string().max(30).optional() }),
  head: ({ params }) => pageHead(`Product ${params.productId}`, "Edit a Zelliny product in English and Arabic: price, images, stock, gifting and SEO."),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  component: ProductRoute,
});

function ProductRoute() {
  const { productId } = Route.useParams();
  const { tab } = Route.useSearch();
  // Keyed so switching products (e.g. after Duplicate) starts the editor fresh.
  return <ProductDetailPage key={`${productId}-${tab ?? ""}`} productId={productId} tab={tab} />;
}
