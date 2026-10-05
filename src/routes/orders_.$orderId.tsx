import { createFileRoute } from "@tanstack/react-router";
import { orderQuery, returnsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import OrderDetailPage from "@/pages/OrderDetailPage";

// Page UI lives in src/pages/OrderDetailPage.tsx
export const Route = createFileRoute("/orders_/$orderId")({
  head: ({ params }) => pageHead(`Order ${params.orderId}`, "One Zelliny order: next step, items, history, payment and delivery."),
  loader: ({ context, params }) => Promise.all([context.queryClient.ensureQueryData(orderQuery(params.orderId)), context.queryClient.ensureQueryData(returnsQuery())]),
  component: OrderRoute,
});

function OrderRoute() {
  const { orderId } = Route.useParams();
  return <OrderDetailPage orderId={orderId} />;
}
