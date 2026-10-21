import { createFileRoute } from "@tanstack/react-router";
import { attributesQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import ProductsPage from "@/pages/ProductsPage";

// Page UI lives in src/pages/ProductsPage.tsx
export const Route = createFileRoute("/products")({
  head: () =>
    pageHead(
      "Products",
      "The Zelliny catalogue: prices, offers, stock and selling mode for every product.",
    ),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productsQuery()),
      context.queryClient.ensureQueryData(attributesQuery()),
    ]),
  component: ProductsPage,
});
