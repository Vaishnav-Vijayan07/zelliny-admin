import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  customersQuery,
  enquiriesQuery,
  orderFormQuery,
  ordersQuery,
} from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import NewOrderPage from "@/pages/NewOrderPage";

// Page UI lives in src/pages/NewOrderPage.tsx
export const Route = createFileRoute("/orders_/new")({
  // ?draft=D-031 continues a draft; ?customer=C201 starts with that customer chosen;
  // ?enquiry=ENQ-316 converts that corporate enquiry’s quotation into an order.
  validateSearch: z.object({
    draft: z.string().max(20).optional(),
    customer: z.string().max(20).optional(),
    enquiry: z.string().max(20).optional(),
  }),
  head: () =>
    pageHead(
      "Create manual order",
      "Take an order by phone, WhatsApp or in person. It joins the same flow as website orders.",
    ),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(orderFormQuery()),
      context.queryClient.ensureQueryData(ordersQuery()),
      context.queryClient.ensureQueryData(customersQuery()),
      context.queryClient.ensureQueryData(enquiriesQuery()),
    ]),
  component: NewOrderRoute,
});

function NewOrderRoute() {
  const { draft, customer, enquiry } = Route.useSearch();
  // Keyed so "Continue" on a different draft starts a fresh form.
  return (
    <NewOrderPage
      key={draft ?? customer ?? enquiry ?? "new"}
      draftId={draft}
      customerId={customer}
      enquiryId={enquiry}
    />
  );
}
