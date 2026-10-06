import { createFileRoute } from "@tanstack/react-router";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import SiteContentPage from "@/pages/SiteContentPage";

// Page UI lives in src/pages/SiteContentPage.tsx
export const Route = createFileRoute("/content")({
  head: () => pageHead("Site content", "Homepage sections, pages, footer and site-wide SEO on zelliny.com."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(categoriesQuery()), context.queryClient.ensureQueryData(brandsQuery()), context.queryClient.ensureQueryData(productsQuery())]),
  component: SiteContentPage,
});
