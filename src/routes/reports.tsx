import { createFileRoute } from "@tanstack/react-router";
import { productsQuery, returnsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import ReportsPage from "@/pages/ReportsPage";

// Page UI lives in src/pages/ReportsPage.tsx
export const Route = createFileRoute("/reports")({
  head: () =>
    pageHead("Reports", "Zelliny sales, products, customers and enquiries over any period."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productsQuery()),
      context.queryClient.ensureQueryData(returnsQuery()),
    ]),
  component: ReportsPage,
});
