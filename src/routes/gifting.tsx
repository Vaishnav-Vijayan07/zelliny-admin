import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import GiftServicesPage from "@/pages/GiftServicesPage";

// Page UI lives in src/pages/GiftServicesPage.tsx
export const Route = createFileRoute("/gifting")({
  head: () =>
    pageHead(
      "Gift services",
      "Wrapping, gift messages, engraving and embossing offered with Zelliny orders.",
    ),
  component: GiftServicesPage,
});
