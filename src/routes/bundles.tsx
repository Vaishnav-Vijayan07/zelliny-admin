import { createFileRoute } from "@tanstack/react-router";
import { bundlesQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import BundlesPage from "@/pages/BundlesPage";

// Page UI lives in src/pages/BundlesPage.tsx
export const Route = createFileRoute("/bundles")({
  head: () => pageHead("Bundles & gift sets", "Curated Zelliny gift sets combining products at a set price."),
  loader: ({ context }) => context.queryClient.ensureQueryData(bundlesQuery()),
  component: BundlesPage,
});
