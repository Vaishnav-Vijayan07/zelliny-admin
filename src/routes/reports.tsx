import { createFileRoute } from "@tanstack/react-router";
import { reportsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import ReportsPage from "@/pages/ReportsPage";

// Page UI lives in src/pages/ReportsPage.tsx
export const Route = createFileRoute("/reports")({
  head: () => pageHead("Reports", "Zelliny sales by category and city, with key performance figures."),
  loader: ({ context }) => context.queryClient.ensureQueryData(reportsQuery()),
  component: ReportsPage,
});
