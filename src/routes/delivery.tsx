import { createFileRoute } from "@tanstack/react-router";
import { deliveryQuery } from "@/lib/api/sections.functions";
import { pageHead } from "@/lib/seo";
import DeliveryPage from "@/pages/DeliveryPage";

// Page UI lives in src/pages/DeliveryPage.tsx
export const Route = createFileRoute("/delivery")({
  head: () =>
    pageHead(
      "Delivery",
      "Zelliny delivery zones, fees, free-shipping thresholds and appointments.",
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(deliveryQuery()),
  component: DeliveryPage,
});
