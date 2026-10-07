import { createFileRoute } from "@tanstack/react-router";
import {
  customersQuery,
  ordersQuery,
  productsQuery,
  returnsQuery,
} from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import CustomerDetailPage from "@/pages/CustomerDetailPage";

// Page UI lives in src/pages/CustomerDetailPage.tsx
export const Route = createFileRoute("/customers_/$customerId")({
  head: () =>
    pageHead("Customer", "One Zelliny customer: orders, messages, contact preferences and notes."),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(customersQuery()),
      context.queryClient.ensureQueryData(ordersQuery()),
      context.queryClient.ensureQueryData(returnsQuery()),
      context.queryClient.ensureQueryData(productsQuery()),
    ]),
  component: CustomerRoute,
});

function CustomerRoute() {
  const { customerId } = Route.useParams();
  return <CustomerDetailPage key={customerId} customerId={customerId} />;
}
