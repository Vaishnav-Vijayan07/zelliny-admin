import { createFileRoute } from "@tanstack/react-router";
import { discountsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import DiscountsPage from "@/pages/DiscountsPage";

// Page UI lives in src/pages/DiscountsPage.tsx
export const Route = createFileRoute("/discounts")({
  head: () =>
    pageHead("Discounts & offers", "Promo codes and automatic offers for the Zelliny store."),
  loader: ({ context }) => context.queryClient.ensureQueryData(discountsQuery()),
  component: DiscountsPage,
});
