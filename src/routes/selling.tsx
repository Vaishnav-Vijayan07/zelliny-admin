import { createFileRoute } from "@tanstack/react-router";
import { brandsQuery, categoriesQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import SellingPage from "@/pages/SellingPage";

// Page UI lives in src/pages/SellingPage.tsx
export const Route = createFileRoute("/selling")({
  head: () =>
    pageHead(
      "Selling control",
      "Choose what is on the site and which products sell online or by enquiry.",
    ),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productsQuery()),
      context.queryClient.ensureQueryData(categoriesQuery()),
      context.queryClient.ensureQueryData(brandsQuery()),
    ]),
  component: SellingPage,
});
