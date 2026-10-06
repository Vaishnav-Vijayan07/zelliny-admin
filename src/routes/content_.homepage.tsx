import { createFileRoute } from "@tanstack/react-router";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import HomepageEditPage from "@/pages/HomepageEditPage";

// Page UI lives in src/pages/HomepageEditPage.tsx
export const Route = createFileRoute("/content_/homepage")({
  head: () => pageHead("Edit homepage", "Homepage banner, sections and the categories, products and maisons they list."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(categoriesQuery()), context.queryClient.ensureQueryData(brandsQuery()), context.queryClient.ensureQueryData(productsQuery())]),
  component: HomepageEditPage,
});
