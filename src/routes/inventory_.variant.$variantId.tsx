import { createFileRoute } from "@tanstack/react-router";
import { attributesQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import ProductVariantPage from "@/pages/ProductVariantPage";

// Page UI lives in src/pages/ProductVariantPage.tsx
export const Route = createFileRoute("/inventory_/variant/$variantId")({
  head: () =>
    pageHead(
      "Product variant",
      "Edit one variant of a product — name, SKU, price, stock, images, shipping and SEO.",
    ),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productsQuery()),
      context.queryClient.ensureQueryData(attributesQuery()),
    ]),
  component: VariantRoute,
});

function VariantRoute() {
  const { variantId } = Route.useParams();
  return <ProductVariantPage key={variantId} variantId={variantId} />;
}
