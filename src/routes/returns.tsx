import { createFileRoute } from "@tanstack/react-router";
import { returnsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import ReturnsPage from "@/pages/ReturnsPage";

// Page UI lives in src/pages/ReturnsPage.tsx
export const Route = createFileRoute("/returns")({
  head: () => pageHead("Returns & refunds", "Review, inspect and refund Zelliny returns against the returns policy."),
  loader: ({ context }) => context.queryClient.ensureQueryData(returnsQuery()),
  component: ReturnsPage,
});
