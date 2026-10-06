import { createFileRoute } from "@tanstack/react-router";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import CategoryEditPage from "@/pages/CategoryEditPage";

// Page UI lives in src/pages/CategoryEditPage.tsx
export const Route = createFileRoute("/categories_/new")({
  head: () => pageHead("Add category", "Add a Zelliny category in English and Arabic."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery()),
      context.queryClient.ensureQueryData(brandsQuery()),
      context.queryClient.ensureQueryData(productsQuery()),
    ]),
  component: CategoryEditPage,
});
