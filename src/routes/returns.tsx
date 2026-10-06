import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ordersQuery, returnsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import ReturnsPage from "@/pages/ReturnsPage";

// Page UI lives in src/pages/ReturnsPage.tsx
export const Route = createFileRoute("/returns")({
  // ?log=ZL-10482 opens "Log a return" for that order (used from the order page).
  validateSearch: z.object({ log: z.string().max(20).optional() }),
  head: () =>
    pageHead(
      "Returns & refunds",
      "Review, inspect and refund Zelliny returns against the returns policy.",
    ),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(returnsQuery()),
      context.queryClient.ensureQueryData(ordersQuery()),
    ]),
  component: ReturnsRoute,
});

function ReturnsRoute() {
  const { log } = Route.useSearch();
  return <ReturnsPage key={log ?? "all"} logOrder={log} />;
}
