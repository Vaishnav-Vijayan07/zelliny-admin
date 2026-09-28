import { createFileRoute } from "@tanstack/react-router";
import { paymentsQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import PaymentsPage from "@/pages/PaymentsPage";

// Page UI lives in src/pages/PaymentsPage.tsx
export const Route = createFileRoute("/payments")({
  head: () => pageHead("Payments", "Paymob, cash on delivery and refund transactions for Zelliny."),
  loader: ({ context }) => context.queryClient.ensureQueryData(paymentsQuery()),
  component: PaymentsPage,
});
