import { createFileRoute } from "@tanstack/react-router";
import { productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import ProductNewPage from "@/pages/ProductNewPage";

// Page UI lives in src/pages/ProductNewPage.tsx
export const Route = createFileRoute("/products_/new")({
  head: () => pageHead("Add product", "Add a product in English and Arabic. Saved as Draft until you publish."),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  component: ProductNewPage,
});
