import { createFileRoute } from "@tanstack/react-router";
import { customersQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import CustomersPage from "@/pages/CustomersPage";

// Page UI lives in src/pages/CustomersPage.tsx
export const Route = createFileRoute("/customers")({
  head: () =>
    pageHead("Customers", "Zelliny customers with orders, lifetime spend and contact details."),
  loader: ({ context }) => context.queryClient.ensureQueryData(customersQuery()),
  component: CustomersPage,
});
