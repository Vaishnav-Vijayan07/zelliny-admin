import { createFileRoute } from "@tanstack/react-router";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import CategoriesPage from "@/pages/CategoriesPage";

// Page UI lives in src/pages/CategoriesPage.tsx
export const Route = createFileRoute("/categories")({
  head: () =>
    pageHead("Categories", "Zelliny store categories, their order on the site and selling mode."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery()),
      context.queryClient.ensureQueryData(brandsQuery()),
      context.queryClient.ensureQueryData(productsQuery()),
    ]),
  component: CategoriesPage,
});
