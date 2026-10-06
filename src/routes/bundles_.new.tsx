import { createFileRoute } from "@tanstack/react-router";
import { bundlesQuery, productsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import BundleEditPage from "@/pages/BundleEditPage";

// Page UI lives in src/pages/BundleEditPage.tsx
export const Route = createFileRoute("/bundles_/new")({
  head: () => pageHead("Create gift set", "Name the set, pick its products and give it one price."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(bundlesQuery()),
      context.queryClient.ensureQueryData(productsQuery()),
    ]),
  component: BundleEditPage,
});
