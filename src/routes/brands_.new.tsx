import { createFileRoute } from "@tanstack/react-router";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import BrandEditPage from "@/pages/BrandEditPage";

// Page UI lives in src/pages/BrandEditPage.tsx
export const Route = createFileRoute("/brands_/new")({
  head: () => pageHead("Add maison", "Add a maison in English and Arabic."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(categoriesQuery()), context.queryClient.ensureQueryData(brandsQuery()), context.queryClient.ensureQueryData(productsQuery())]),
  component: BrandEditPage,
});

