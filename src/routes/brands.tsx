import { createFileRoute } from "@tanstack/react-router";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import BrandsPage from "@/pages/BrandsPage";

// Page UI lives in src/pages/BrandsPage.tsx
export const Route = createFileRoute("/brands")({
  head: () => pageHead("Maisons", "The luxury maisons Zelliny carries, their categories and selling mode."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(categoriesQuery()), context.queryClient.ensureQueryData(brandsQuery()), context.queryClient.ensureQueryData(productsQuery())]),
  component: BrandsPage,
});
