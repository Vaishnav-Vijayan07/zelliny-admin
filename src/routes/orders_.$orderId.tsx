import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { enquiriesQuery, orderQuery, returnsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import OrderDetailPage from "@/pages/OrderDetailPage";

// Page UI lives in src/pages/OrderDetailPage.tsx
export const Route = createFileRoute("/orders_/$orderId")({
  // ?from=ENQ-314 shows the path back to that corporate enquiry in the breadcrumb.
  validateSearch: z.object({ from: z.string().max(20).optional() }),
  head: ({ params }) =>
    pageHead(
      `Order ${params.orderId}`,
      "One Zelliny order: next step, items, history, payment and delivery.",
    ),
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(orderQuery(params.orderId)),
      context.queryClient.ensureQueryData(returnsQuery()),
      context.queryClient.ensureQueryData(enquiriesQuery()),
    ]),
  component: OrderRoute,
});

function OrderRoute() {
  const { orderId } = Route.useParams();
  const { from } = Route.useSearch();
  return <OrderDetailPage orderId={orderId} from={from} />;
}
