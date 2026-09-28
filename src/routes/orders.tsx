import { createFileRoute } from "@tanstack/react-router";
import { ordersQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import OrdersPage from "@/pages/OrdersPage";

// Page UI lives in src/pages/OrdersPage.tsx
export const Route = createFileRoute("/orders")({
  head: () => pageHead("Orders", "Every Zelliny order, website and manual, with status, payment and fulfilment."),
  loader: ({ context }) => context.queryClient.ensureQueryData(ordersQuery()),
  component: OrdersPage,
});
